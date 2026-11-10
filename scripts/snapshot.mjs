// Plain Node 22, no dependencies, API key, proxy, or running backend.
import {mkdir,writeFile,rename,readdir,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {loadSlate,nbaDate,shiftDate} from '../js/data.mjs';
const dir=new URL('../data/',import.meta.url);await mkdir(dir,{recursive:true});
const supplied=process.argv.slice(2);
if(supplied.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d)))throw new Error('Dates must be YYYY-MM-DD');
const dates=supplied.length?supplied:[shiftDate(nbaDate(),-1),nbaDate(),shiftDate(nbaDate(),1)];
let success=0;
for(const date of dates){
  try{
    const slate=await loadSlate(date);slate.source='ESPN snapshot';
    const target=new URL(`${date}.json`,dir),temp=new URL(`${date}.json.tmp`,dir);
    await writeFile(temp,JSON.stringify(slate));await rename(temp,target);success++;
    console.log(`${date}: ${slate.games.length} games, ${slate.games.filter(g=>g.detailsError).length} delayed boxes`);
  }catch(e){console.error(`${date}: ${e.message}; retaining any previous snapshot`);}
}
const files=(await readdir(dir)).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse();
for(const f of files.slice(7))await unlink(new URL(f,dir));
if(!success)process.exitCode=1;
