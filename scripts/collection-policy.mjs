// Gate only scheduled runs; pushes and manual runs always collect and deploy.
import {readFile,writeFile,appendFile} from 'node:fs/promises';
const marker=new URL('../data/.collection-success.json',import.meta.url);
if(process.argv[2]==='mark'){
  await writeFile(marker,JSON.stringify({completedAt:new Date().toISOString()}));
}else{
  let completed=NaN;
  try{completed=Date.parse(JSON.parse(await readFile(marker,'utf8')).completedAt);}catch{}
  const age=Date.now()-completed;
  const fresh=Number.isFinite(age)&&age>=0&&age<8*60000;
  const collect=process.env.GITHUB_EVENT_NAME!=='schedule'||!fresh;
  const output=`collect=${collect}
`;
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,output);
  console.log(collect?'Collecting new snapshots and video links.':'Skipping: a successful collection and deployment finished less than eight minutes ago.');
}
