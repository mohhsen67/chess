-- Links a Chess.com player to the signed-in account. First come, first served:
-- a name already linked to someone else is refused (an admin can fix it in the dashboard).
create or replace function public.link_chess(u text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  u := lower(trim(u));
  if u !~ '^[a-z0-9_-]{3,25}$' then raise exception 'invalid username'; end if;
  if exists (select 1 from profiles where chess_username = u and id <> auth.uid()) then raise exception 'taken'; end if;
  if chesscom_get('https://api.chess.com/pub/player/' || u) is null then raise exception 'no such player'; end if;
  update profiles set chess_username = u, pending_username = null, verify_code = null where id = auth.uid();
  return u;
end $$;
drop function if exists public.start_link(text);
drop function if exists public.confirm_link();

