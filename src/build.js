const fs=require('fs');
let t=fs.readFileSync(__dirname+'/template.html','utf8');
const strip=s=>s.replace(/if \(typeof module !== 'undefined'\).*\n?/,'');
t=t.replace('/*SAMPLES*/',()=>fs.readFileSync(__dirname+'/samples.pgn','utf8'))
 .replace('/*ENGINE*/',()=>strip(fs.readFileSync(__dirname+'/engine.js','utf8')))
 .replace('/*ANALYZE*/',()=>strip(fs.readFileSync(__dirname+'/analyze.js','utf8')).replace("var C = (typeof Chess !== 'undefined') ? Chess : require('./engine.js');","var C = Chess;"))
 .replace('/*UI*/',()=>fs.readFileSync(__dirname+'/ui.js','utf8'));
fs.writeFileSync(__dirname+'/../index.html',t);console.log(t.length);
