-- Shatranj database: accounts, linked Chess.com players, games, training progress, clubs.
-- Run once in the Supabase SQL Editor. Safe to run again: it only adds what is missing.

create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

-- Syncing a month of games can take a few seconds.
alter role authenticated set statement_timeout = '30s';

-- ---------- tables ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  chess_username text unique,
  pending_username text,
  verify_code text,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  username text not null,
  url text not null,
  end_time timestamptz not null,
  time_class text,
  my_color text,
  my_rating int,
  outcome text,
  pgn text not null,
  primary key (username, url)
);
create index if not exists games_user_time on public.games (username, end_time desc);

create table if not exists public.sync_state (
  username text primary key,
  archives text[] not null default '{}',
  done int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.train_progress (
  user_id uuid not null references auth.users on delete cascade,
  game_url text not null,
  ply int not null,
  solved boolean not null default false,
  attempts int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_url, ply)
);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 60),
  join_code text not null unique,
  created_by uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.club_members (
  club_id uuid not null references public.clubs on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.sync_state enable row level security;
alter table public.train_progress enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;

-- ---------- helpers used by policies ----------

create or replace function public.my_chess() returns text
language sql stable security definer set search_path = public as $$
  select chess_username from profiles where id = auth.uid()
$$;

create or replace function public.is_member(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from club_members where club_id = c and user_id = auth.uid())
$$;

-- ---------- row level security ----------
-- Each person reads only their own profile, games and progress.
-- The linked Chess.com name can only change through confirm_link().

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (id = auth.uid());
drop policy if exists "own profile edit" on public.profiles;
create policy "own profile edit" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, settings) on public.profiles to authenticated;

drop policy if exists "own games" on public.games;
create policy "own games" on public.games for select using (username = public.my_chess());
revoke insert, update, delete on public.games from anon, authenticated;

revoke all on public.sync_state from anon, authenticated;

drop policy if exists "own progress" on public.train_progress;
create policy "own progress" on public.train_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "my clubs" on public.clubs;
create policy "my clubs" on public.clubs for select using (public.is_member(id));
revoke insert, update, delete on public.clubs from anon, authenticated;

drop policy if exists "my club members" on public.club_members;
create policy "my club members" on public.club_members for select using (public.is_member(club_id));
revoke insert, update, delete on public.club_members from anon, authenticated;

-- ---------- new accounts get a profile ----------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Chess.com ----------

create or replace function public.chesscom_get(url text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r extensions.http_response;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '15000');
  select * into r from extensions.http((
    'GET', url,
    array[extensions.http_header('User-Agent', 'shatranj (https://github.com/mohhsen67/chess)')],
    null, null)::extensions.http_request);
  if r.status = 404 then return null; end if;
  if r.status <> 200 then raise exception 'chess.com responded %', r.status; end if;
  return r.content::jsonb;
end $$;
revoke execute on function public.chesscom_get(text) from public, anon, authenticated;

-- Step 1 of linking: remember the name and hand out a code to put in the Chess.com profile.
create or replace function public.start_link(u text) returns text
language plpgsql security definer set search_path = public as $$
declare code text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  u := lower(trim(u));
  if u !~ '^[a-z0-9_-]{3,25}$' then raise exception 'invalid username'; end if;
  if exists (select 1 from profiles where chess_username = u and id <> auth.uid()) then raise exception 'taken'; end if;
  if chesscom_get('https://api.chess.com/pub/player/' || u) is null then raise exception 'no such player'; end if;
  code := 'shatranj-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
  update profiles set pending_username = u, verify_code = code where id = auth.uid();
  return code;
end $$;

-- Step 2: the code must be visible in the profile's Location or Name.
create or replace function public.confirm_link() returns text
language plpgsql security definer set search_path = public as $$
declare pr profiles; p jsonb;
begin
  select * into pr from profiles where id = auth.uid();
  if pr.pending_username is null then raise exception 'no pending'; end if;
  p := chesscom_get('https://api.chess.com/pub/player/' || pr.pending_username);
  if p is null then raise exception 'no such player'; end if;
  if position(lower(pr.verify_code) in lower(coalesce(p->>'location', '') || ' ' || coalesce(p->>'name', ''))) = 0 then
    raise exception 'code not found';
  end if;
  if exists (select 1 from profiles where chess_username = pr.pending_username and id <> auth.uid()) then raise exception 'taken'; end if;
  update profiles set chess_username = pending_username, pending_username = null, verify_code = null where id = auth.uid();
  return pr.pending_username;
end $$;

-- Pulls up to max_months monthly archives per call. The first calls walk the whole
-- history; once done, each call refreshes the last two months.
create or replace function public.sync_user(u text, max_months int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  st sync_state; arcs text[]; n int; i int; from_i int; to_i int;
  m jsonb; g jsonb; side jsonb; me text; res text; k int; added int := 0;
begin
  m := chesscom_get('https://api.chess.com/pub/player/' || u || '/games/archives');
  if m is null then raise exception 'no such player'; end if;
  select coalesce(array_agg(x order by ord), '{}') into arcs
    from jsonb_array_elements_text(m->'archives') with ordinality as t(x, ord);
  n := coalesce(array_length(arcs, 1), 0);
  insert into sync_state (username) values (u) on conflict do nothing;
  select * into st from sync_state where username = u;
  if st.done >= n then from_i := greatest(n - 1, 1); to_i := n;
  else from_i := st.done + 1; to_i := least(n, st.done + max_months); end if;
  if n > 0 then
    for i in from_i..to_i loop
      m := chesscom_get(arcs[i]);
      continue when m is null;
      for g in select * from jsonb_array_elements(coalesce(m->'games', '[]'::jsonb)) loop
        continue when g->>'pgn' is null or g->>'url' is null;
        if lower(g->'white'->>'username') = u then me := 'w'; side := g->'white';
        else me := 'b'; side := g->'black'; end if;
        res := side->>'result';
        insert into games (username, url, end_time, time_class, my_color, my_rating, outcome, pgn)
        values (u, g->>'url', to_timestamp((g->>'end_time')::bigint), g->>'time_class', me, (side->>'rating')::int,
          case when res = 'win' then 'W'
               when res in ('agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient') then 'D'
               else 'L' end,
          g->>'pgn')
        on conflict (username, url) do nothing;
        get diagnostics k = row_count;
        added := added + k;
      end loop;
    end loop;
  end if;
  update sync_state set archives = arcs, done = greatest(st.done, to_i), updated_at = now() where username = u;
  return jsonb_build_object('done', greatest(st.done, to_i), 'total', n, 'added', added, 'finished', greatest(st.done, to_i) >= n);
end $$;
revoke execute on function public.sync_user(text, int) from public, anon, authenticated;

create or replace function public.sync_me() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u text := my_chess();
begin
  if u is null then raise exception 'not linked'; end if;
  return sync_user(u, 4);
end $$;

create or replace function public.sync_all_recent() returns void
language plpgsql security definer set search_path = public as $$
declare u text;
begin
  for u in select chess_username from profiles where chess_username is not null loop
    begin
      perform sync_user(u, 4);
    exception when others then
      raise warning 'sync % failed: %', u, sqlerrm;
    end;
  end loop;
end $$;
revoke execute on function public.sync_all_recent() from public, anon, authenticated;

-- Every 6 hours, pull new games for every linked player.
select cron.unschedule('sync-games') where exists (select 1 from cron.job where jobname = 'sync-games');
select cron.schedule('sync-games', '17 */6 * * *', 'select public.sync_all_recent()');

-- ---------- clubs ----------

create or replace function public.create_club(club_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c clubs; code text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from clubs where join_code = code);
  end loop;
  insert into clubs (name, join_code, created_by) values (trim(club_name), code, auth.uid()) returning * into c;
  insert into club_members (club_id, user_id, role) values (c.id, auth.uid(), 'owner');
  return to_jsonb(c);
end $$;

create or replace function public.join_club(code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c clubs;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into c from clubs where join_code = upper(trim(code));
  if c.id is null then raise exception 'no such club'; end if;
  insert into club_members (club_id, user_id) values (c.id, auth.uid()) on conflict do nothing;
  return to_jsonb(c);
end $$;

create or replace function public.leave_club(cid uuid) returns void
language sql security definer set search_path = public as $$
  delete from club_members where club_id = cid and user_id = auth.uid()
$$;

-- Leaderboard: only aggregates, and only for members of that club.
create or replace function public.club_board(cid uuid)
returns table (display_name text, chess_username text, rating int, games_30d int, score_30d numeric, is_me boolean)
language sql stable security definer set search_path = public as $$
  select p.display_name, p.chess_username,
    (select g.my_rating from games g where g.username = p.chess_username and g.time_class = 'blitz' order by g.end_time desc limit 1),
    (select count(*)::int from games g where g.username = p.chess_username and g.end_time > now() - interval '30 days'),
    (select round(avg(case g.outcome when 'W' then 1 when 'D' then 0.5 else 0 end)::numeric, 3)
       from games g where g.username = p.chess_username and g.end_time > now() - interval '30 days'),
    p.id = auth.uid()
  from club_members m join profiles p on p.id = m.user_id
  where m.club_id = cid and public.is_member(cid)
  order by 3 desc nulls last
$$;
