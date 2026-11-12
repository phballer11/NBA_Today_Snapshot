// Key-free, build-time discovery. Merge public YouTube RSS, uploads and cached metadata.
// No login, internal API, cookie, proxy, downloaded video, or external dependency.
import {uploadFits} from '../js/video-window.mjs';
import {readFile,writeFile,rename,mkdir,readdir,unlink} from 'node:fs/promises';
import {dateInZone,nbaDate,shiftDate,mapLimit,parsePlayers,getJSON,API} from '../js/data.mjs';
const ROOT=new URL('../data/',import.meta.url),OUT=new URL('highlights/',ROOT);
const CHANNELS=[
 {id:'UCEjOSbbaOfgnfRODEEMYlCw',name:'FreeDawkins',handle:'FreeDawkins'},
 {id:'UCWJ2lWNubArHWmf3FIHbfcQ',name:'NBA',handle:'NBA'},
 {id:'UCPVpbXIiIDwDKVvu68-Vb-A',name:'NBA Japan',handle:'NBAJPN'}
];
const JP_TEAMS={ATL:'ホークス',BOS:'セルティックス',BKN:'ネッツ',CHA:'ホーネッツ',CHI:'ブルズ',CLE:'キャバリアーズ',DAL:'マーベリックス',DEN:'ナゲッツ',DET:'ピストンズ',GS:'ウォリアーズ',GSW:'ウォリアーズ',HOU:'ロケッツ',IND:'ペイサーズ',LAC:'クリッパーズ',LAL:'レイカーズ',MEM:'グリズリーズ',MIA:'ヒート',MIL:'バックス',MIN:'ティンバーウルブズ',NO:'ペリカンズ',NOP:'ペリカンズ',NY:'ニックス',NYK:'ニックス',OKC:'サンダー',ORL:'マジック',PHI:'セブンティシクサーズ',PHX:'サンズ',POR:'トレイルブレイザーズ',SAC:'キングス',SA:'スパーズ',SAS:'スパーズ',TOR:'ラプターズ',UTAH:'ジャズ',UTA:'ジャズ',WSH:'ウィザーズ',WAS:'ウィザーズ'};
const TEAM_NAMES={ATL:'Hawks',BOS:'Celtics',BKN:'Nets',CHA:'Hornets',CHI:'Bulls',CLE:'Cavaliers',DAL:'Mavericks',DEN:'Nuggets',DET:'Pistons',GS:'Warriors',HOU:'Rockets',IND:'Pacers',LAC:'Clippers',LAL:'Lakers',MEM:'Grizzlies',MIA:'Heat',MIL:'Bucks',MIN:'Timberwolves',NO:'Pelicans',NY:'Knicks',OKC:'Thunder',ORL:'Magic',PHI:'76ers',PHX:'Suns',POR:'Trail Blazers',SAC:'Kings',SA:'Spurs',TOR:'Raptors',UTAH:'Jazz',WSH:'Wizards'};
const PLAYER_ALIASES={
 'Victor Wembanyama':['Wemby','ビクターウェンバンヤマ','ヴィクターウェンバンヤマ'],
 'Luka Doncic':['Luka','ルカドンチッチ'],'Kyrie Irving':['カイリーアービング'],
 'Cooper Flagg':['クーパーフラッグ'],'Anthony Davis':['アンソニーデイビス'],
 'Stephen Curry':['Steph','Steph Curry','ステフィンカリー','ステファンカリー'],
 'LeBron James':['LeBron','レブロンジェームズ'],'Rui Hachimura':['八村塁'],
 'Yuki Kawamura':['河村勇輝'],'Nikola Jokic':['ニコラヨキッチ'],
 'Shai Gilgeous-Alexander':['シェイギルジャスアレクサンダー'],
 'Giannis Antetokounmpo':['Giannis','ヤニスアデトクンボ'],'Kevin Durant':['ケビンデュラント'],
 'Jayson Tatum':['ジェイソンテイタム'],'Jalen Brunson':['ジェイレンブランソン']
};
// Curated, established names only. These identify athletes, never their current team.
const COMMON_PLAYER_ALIASES={
 'Victor Wembanyama':['Wemby'],
 'Shai Gilgeous-Alexander':['SGA','Shai'],
 'Nikola Jokic':['Joker','The Joker','Big Honey'],
 'Giannis Antetokounmpo':['Greek Freak','The Greek Freak'],
 'Kevin Durant':['KD','Slim Reaper','Durantula','Easy Money Sniper'],
 'Anthony Davis':['AD','The Brow'],
 'LeBron James':['King James','LBJ','Bron'],
 'Stephen Curry':['Chef Curry','Baby Faced Assassin'],
 'Kyrie Irving':['Uncle Drew','Kyrie'],
 'Damian Lillard':['Dame','Dame Dolla','Dame Time'],
 'Anthony Edwards':['Ant','Ant-Man','Ant Man'],
 'Anfernee Simons':['Ant'],
 'Karl-Anthony Towns':['KAT'],
 'Donovan Mitchell':['Spida'],
 'Devin Booker':['Book','DBook','D Book'],
 'Ja Morant':['Ja'],
 'Joel Embiid':['The Process','JoJo'],
 'Jimmy Butler':['Jimmy Buckets'],
 'Paul George':['PG','PG13'],
 'Chris Paul':['CP3'],
 'James Harden':['The Beard'],
 'Russell Westbrook':['Russ','Brodie'],
 'Bam Adebayo':['Bam'],
 'Kristaps Porzingis':['KP','Porzingod'],
 'Domantas Sabonis':['Domas'],
 'Alperen Sengun':['Sengun','Alpi'],
 'Jaren Jackson Jr.':['JJJ'],
 'Jalen Williams':['JDub','J Dub'],
 'D Angelo Russell':['DLo','D Lo'],
 'Austin Reaves':['AR15'],
 'CJ McCollum':['CJ'],
 'OG Anunoby':['OG'],
 'Kentavious Caldwell-Pope':['KCP'],
 'Nickeil Alexander-Walker':['NAW'],
 'Immanuel Quickley':['IQ'],
 'Kyle Anderson':['SloMo','Slow Mo'],
 'Norman Powell':['Norm'],
 'Cameron Johnson':['Cam Johnson'],
 'Cameron Thomas':['Cam Thomas'],
 'Herbert Jones':['Herb Jones']
};
for(const [name,aliases]of Object.entries(COMMON_PLAYER_ALIASES))PLAYER_ALIASES[name]=[...(PLAYER_ALIASES[name]||[]),...aliases];
const TEAM_ALIASES={CLE:['Cavs'],DAL:['Mavs'],DEN:['Nugs'],GS:['Dubs'],LAC:['Clips'],MEM:['Grizz'],MIN:['Wolves','T-Wolves','T Wolves','TWolves'],NO:['Pels'],PHI:['Sixers','Seventy Sixers','Seventy-Sixers'],POR:['Blazers','Trailblazers','Rip City'],BOS:['Celts'],TOR:['Raps'],SAC:['Beam Team','Sactown']};
const EXTRA_TEAM_CODES={GS:['GSW'],NO:['NOP'],NY:['NYK'],SA:['SAS'],UTAH:['UTA'],WSH:['WAS'],PHX:['PHO'],BKN:['BRK'],CHA:['CHO']};
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replace(/&(amp|lt|gt|quot|apos);/g,(_,e)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[e]));
const json=async(url,fallback=null)=>{try{return JSON.parse(await readFile(url,'utf8'));}catch{return fallback;}};
async function atomic(url,value){const temp=new URL(url.href+'.tmp');await writeFile(temp,JSON.stringify(value));await rename(temp,url);}
async function publicText(url){
 const response=await fetch(url,{signal:AbortSignal.timeout(12000),redirect:'follow'});
 if(!response.ok)throw new Error(`HTTP ${response.status}`);
 const text=await response.text();if(text.length>6000000)throw new Error('Page too large');return text;
}
// Parse data already present in public HTML; never execute page JavaScript.
function assignedJSON(html,name){
 const match=new RegExp(`(?:var\\s+)?${name}\\s*=\\s*`).exec(html);if(!match)throw new Error('Public page format changed');
 let start=match.index+match[0].length,depth=0,quoted=false,escaped=false;
 for(let i=start;i<html.length;i++){
  const c=html[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"'){quoted=true;continue;}if(c==='{'||c==='[')depth++;if(c==='}'||c===']'){depth--;if(!depth)return JSON.parse(html.slice(start,i+1));}
 }
 throw new Error('Incomplete public page data');
}
function walk(value,fn){if(!value||typeof value!=='object')return;fn(value);for(const child of Object.values(value))walk(child,fn);}
function publicationWindow(parts){
 const units={second:1000,sec:1000,minute:60000,min:60000,hour:3600000,hr:3600000,h:3600000,day:86400000,d:86400000,week:604800000,w:604800000};
 for(const text of parts.filter(x=>typeof x==='string')){
  const match=/^(?:Premiered\s+)?(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|h|d|w)\s+ago$/i.exec(text.trim());
  if(!match)continue;
  const count=+match[1],unit=units[match[2].toLowerCase().replace(/s$/,'')],now=Date.now();
  // Human-readable ages are rounded: retain an interval, never invent an exact timestamp.
  return {earliest:new Date(now-(count+1)*unit).toISOString(),latest:new Date(now-Math.max(0,count-1)*unit).toISOString(),observedAt:new Date(now).toISOString(),label:text};
 }
 return null;
}
async function discoverRSS(channel){
  const xml=await publicText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`);
  if(!/<feed[\s>]/.test(xml))throw new Error('Not an Atom feed');
  const videos=[...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([,entry])=>({id:entry.match(/<yt:videoId>([^<]+)</)?.[1],title:decode(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]),channelId:channel.id,publishedAt:entry.match(/<published>([^<]+)</)?.[1],description:decode(entry.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1]),metadataSource:'rss'})).filter(v=>/^[\w-]{11}$/.test(v.id));
  if(!videos.length)throw new Error('Empty feed');return {videos,method:'rss'};
}
async function discoverPage(channel){
  const html=await publicText(`https://www.youtube.com/@${channel.handle}/videos?hl=en`);
  if(!html.includes(`"externalId":"${channel.id}"`))throw new Error('Channel identity not confirmed');
  const raw=assignedJSON(html,'ytInitialData'),videos=[];
  walk(raw,node=>{
   const modern=node.lockupViewModel,classic=node.videoRenderer;
   if(modern?.contentId){const meta=modern.metadata?.lockupMetadataViewModel;const parts=(meta?.metadata?.contentMetadataViewModel?.metadataRows||[]).flatMap(r=>(r.metadataParts||[]).map(p=>p.text?.content));videos.push({id:modern.contentId,title:meta?.title?.content||'',channelId:channel.id,publicationWindow:publicationWindow(parts),description:'',metadataSource:'channel-page'});}
   else if(classic?.videoId)videos.push({id:classic.videoId,title:classic.title?.simpleText||classic.title?.runs?.map(r=>r.text).join('')||'',channelId:channel.id,publicationWindow:publicationWindow([classic.publishedTimeText?.simpleText]),description:'',metadataSource:'channel-page'});
  });
  const unique=[...new Map(videos.filter(v=>/^[\w-]{11}$/.test(v.id)&&v.title).map(v=>[v.id,v])).values()];
  if(!unique.length)throw new Error('No readable public uploads');return {videos:unique,method:'public-page'};
}
async function discover(channel){
 const results=await Promise.allSettled([discoverPage(channel),discoverRSS(channel)]),videos=new Map(),methods=[],unavailable=[];
 for(const [i,result]of results.entries()){if(result.status==='rejected'){unavailable.push((i?'rss':'public-page')+': '+result.reason.message);continue;}methods.push(result.value.method);for(const video of result.value.videos)videos.set(video.id,{...videos.get(video.id),...video});}
 if(!videos.size)throw new Error(unavailable.join('; '));
 return {videos:[...videos.values()],method:methods.join('+'),unavailable,coverage:'recent public uploads and retained catalog; complete date backfill not guaranteed'};
}
const CITY_ALIASES={ATL:['Atlanta'],BOS:['Boston'],BKN:['Brooklyn'],CHA:['Charlotte'],CHI:['Chicago'],CLE:['Cleveland'],DAL:['Dallas'],DEN:['Denver'],DET:['Detroit'],GS:['Golden State'],HOU:['Houston'],IND:['Indiana'],LAC:[],LAL:[],MEM:['Memphis'],MIA:['Miami'],MIL:['Milwaukee'],MIN:['Minnesota'],NO:['New Orleans'],NY:['New York'],OKC:['Oklahoma City'],ORL:['Orlando'],PHI:['Philadelphia','Philly'],PHX:['Phoenix'],POR:['Portland'],SA:['San Antonio'],SAC:['Sacramento'],TOR:['Toronto'],UTAH:['Utah'],WSH:['Washington']};
const words=s=>String(s).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const mentions=(text,alias)=>/[\u3000-\u9fff]/u.test(alias)?norm(text).includes(norm(alias)):` ${words(text)} `.includes(` ${words(alias)} `);
function teamMention(text,team,cities=false){
 const n=norm(text),name=team.name||'',nickname=name.split(' ').slice(name.endsWith('Trail Blazers')?-2:-1).join(' ');
 const words=s=>String(s).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim(),english=` ${words(text)} `;
 return [name,nickname,...(TEAM_ALIASES[team.code]||[]).filter(alias=>alias!=='Clips'||/\b(?:vs\.?|versus|at|against|beat|defeat(?:ed)?)\s+(?:the\s+)?Clips\b|\bClips\s+(?:at|vs\.?|versus)\b/i.test(text)),...(cities?CITY_ALIASES[team.code]||[]:[]),...(team.code==='POR'?['Trailblazers']:[]),...(team.code==='PHI'?['Sixers','76ers']:[])].filter(Boolean).some(alias=>english.includes(` ${words(alias)} `))||[...(team.code?.length>=3?[team.code]:[]),...(EXTRA_TEAM_CODES[team.code]||[])].some(code=>initialismMention(text,code))||[JP_TEAMS[team.code],...(team.code==='PHI'?['シクサーズ']:[])].filter(Boolean).some(alias=>n.includes(norm(alias)));
}
function conflictingOpponent(text,title,game){
 const current=[JP_TEAMS[game.away.code],JP_TEAMS[game.home.code]];
 const opponents=[title,...[...text.matchAll(/\b(?:vs\.?|versus|against)\s+([^\n|.!?]{1,80})/gi)].map(m=>m[1])];
 return Object.entries(TEAM_NAMES).some(([code,name])=>!current.includes(JP_TEAMS[code])&&opponents.some(part=>teamMention(part,{code,name})));
}
// Short names must be unambiguous across all available rosters, not just one game.
let playerDirectory=[],playerAliasCache=new Map();
function playerAliases(player){
 if(playerAliasCache.has(player.id))return playerAliasCache.get(player.id);
 const canonical=player.name.replace(/\s+(?:Jr\.?|Sr\.?|II|III|IV)$/i,'');
 const aliases=[player.name,canonical,...Object.entries(PLAYER_ALIASES).filter(([name])=>norm(name)===norm(player.name)||norm(name.replace(/\s+(?:Jr\.?|Sr\.?|II|III|IV)$/i,''))===norm(canonical)).flatMap(([,names])=>names)];
 const surname=canonical.split(' ').at(-1);
 if(surname.length>=4&&!/^(?:black|white|green|brown|young|love|king|ball|smart|little|mann|brooks|jones)$/i.test(surname)){
  const ids=new Set(playerDirectory.filter(p=>p.name.replace(/\s+(?:Jr\.?|Sr\.?|II|III|IV)$/i,'').split(' ').at(-1).toLowerCase()===surname.toLowerCase()).map(p=>p.id));
  if(ids.size===1)aliases.push(surname);
 }
 const unique=[...new Set(aliases)];playerAliasCache.set(player.id,unique);return unique;
}
// Initialisms are case-sensitive: AD/PG/IQ must not match ordinary words ad/pg/iq.
function initialismMention(text,alias){
 const pattern=alias.split('').map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\.?');
 return new RegExp(`(?<![\\p{L}\\p{N}])${pattern}\\.?(?![\\p{L}\\p{N}])`,'u').test(text);
}
function playerAliasMention(text,alias){
 if(/^[A-Z0-9]{2,5}$/.test(alias))return initialismMention(text,alias);
 if(/^(?:Ant|Book|Ja|Bam|Norm|Bron|Russ)$/i.test(alias)){
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alias}|${alias.toUpperCase()})(?![\\p{L}\\p{N}])`,'u').test(text);
 }
 return mentions(text,alias);
}
function namedPlayers(text,game){
 return game.roster.filter(p=>playerAliases(p).some(alias=>{
  if(!playerAliasMention(text,alias))return false;
  if(alias==='Ant'){
   // Both Edwards and Simons use Ant: require a unique explicit team context.
   const owners=playerDirectory.filter(other=>['Anthony Edwards','Anfernee Simons'].includes(other.name));
   const teams=[game.away,game.home];
   const identified=owners.filter(owner=>teams.some(team=>team.id===owner.teamId&&teamMention(text,team,true)));
   return identified.length===1&&identified[0].id===p.id;
  }
  return true;
 }));
}
// Sole matcher: approved source, player/team identity, and upload near tip-off.
// Each qualifying game receives the link; false positives are intentionally tolerated.
function relaxedMatch(video,game){
 const channel=CHANNELS.find(c=>c.id===video.channelId),start=Date.parse(game.start);
 if(!channel||!['in','post'].includes(game.state)||!Number.isFinite(start)||start>Date.now())return null;
 if(!uploadFits(video,game.start,game.date))return null;
 const description=(video.description||'').split(/Never miss|▼|Subscribe|Follow us/i)[0].slice(0,2200),text=video.title+'\n'+description;
 const players=namedPlayers(text,game),teams=[game.away,game.home].filter(team=>teamMention(text,team,true));
 if(!players.length&&!teams.length)return null;
 return {id:video.id,title:video.title,channel:channel.name,channelId:channel.id,type:/full\s*game\s*highlights|ゲームハイライト|試合ハイライト/i.test(video.title)?'game':'player',players:players.map(p=>({id:p.id,name:p.name})),publishedAt:video.publishedAt||null,...(video.publicationWindow?{publicationWindow:video.publicationWindow}:{}),matchedAt:new Date().toISOString(),gameDate:game.date,matchEvidence:{method:'relaxed-started-game',metadataSource:video.metadataSource||'watch-page',gameStartedAt:game.start,windowHours:15,approximateUploadTime:!video.publishedAt,matchedTeamIds:teams.map(t=>t.id)}};
}
async function inspect(candidate){
 const html=await publicText(`https://www.youtube.com/watch?v=${candidate.id}`),raw=assignedJSON(html,'ytInitialPlayerResponse'),v=raw.videoDetails,m=raw.microformat?.playerMicroformatRenderer;
 if(v?.videoId!==candidate.id||v.channelId!==candidate.channelId||!v.title||!(m?.publishDate||m?.uploadDate))throw new Error(`Watch metadata unavailable (${raw.playabilityStatus?.status||'missing details'})`);
 return {id:candidate.id,title:v.title,channelId:v.channelId,description:v.shortDescription||'',publishedAt:[m.publishDate,m.uploadDate].find(value=>typeof value==='string'&&/T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value))||null,uploadedAt:m.uploadDate||null,metadataSource:'watch-page',checkedAt:new Date().toISOString()};
}
await mkdir(OUT,{recursive:true});
const supplied=process.argv.slice(2);if(supplied.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d)))throw new Error('Dates must be YYYY-MM-DD');
const slateFiles=(await readdir(ROOT)).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f));
const dates=supplied.length?supplied:[...new Set([...slateFiles.map(f=>f.slice(0,10)),nbaDate(),shiftDate(nbaDate(),-1)])];
const slates=[],games=[];
for(const date of dates){const slate=await json(new URL(`${date}.json`,ROOT));if(!slate||slate.date!==date)continue;slates.push(slate);for(const g of slate.games.filter(g=>['in','post'].includes(g.state)))games.push({...g,date,roster:[...g.away.players.map(p=>({...p,teamId:g.away.id})),...g.home.players.map(p=>({...p,teamId:g.home.id}))]});}
if(!slates.length)throw new Error('No scoreboard snapshots available');
// All played athletes, rather than only the displayed five, are eligible for highlights.
await mapLimit(games,3,async g=>{try{const raw=await getJSON(`${API}/apis/site/v2/sports/basketball/nba/summary?event=${g.id}`);const all=[...parsePlayers(raw.boxscore,g.away.id).all.map(p=>({...p,teamId:g.away.id})),...parsePlayers(raw.boxscore,g.home.id).all.map(p=>({...p,teamId:g.home.id}))];if(all.length)g.roster=all;}catch{g.rosterPartial=true;}});
playerDirectory=[...new Map(games.flatMap(g=>g.roster).map(p=>[p.id,p])).values()];
const catalog=await json(new URL('catalog.json',OUT),{videos:{}}),candidates=new Map(),sources=[];
await mapLimit(CHANNELS,3,async channel=>{
 try{const result=await discover(channel);sources.push({channel:channel.name,ok:true,method:result.method,count:result.videos.length,unavailable:result.unavailable,coverage:result.coverage});for(const v of result.videos)candidates.set(v.id,v);}
 catch(e){sources.push({channel:channel.name,ok:false,error:e.message});}
});
// Revalidate every archived link; never retain a stale wrong-card association blindly.
const docs=new Map();
for(const slate of slates){
 const old=await json(new URL(`${slate.date}.json`,OUT),{});
 for(const link of [...Object.values(old.games||{}).flat(),...(old.highlights||[])]){
  if(!catalog.videos[link.id]||!catalog.videos[link.id].publishedAt&&link.publishedAt)catalog.videos[link.id]={...link,description:(link.players||[]).map(p=>p.name).join(' ')};
 }
 docs.set(slate.date,{schema:3,date:slate.date,checkedAt:new Date().toISOString(),sources,games:{},highlights:[]});
}
let inspected=0,accepted=0,failed=0,fallbacks=0;const lookupErrors=new Map();
const pending=[...candidates.values()].filter(v=>{
 const text=v.title+'\n'+(v.description||'').split(/Never miss|▼|Subscribe|Follow us/i)[0].slice(0,2200);
 return games.some(g=>namedPlayers(text,g).length||teamMention(text,g.away,true)||teamMention(text,g.home,true)||v.channelId===CHANNELS[2].id&&/得点|リバウンド|アシスト|ブロック|ハイライト/.test(v.title));
});
await mapLimit(pending,3,async candidate=>{
 let video=catalog.videos[candidate.id];
 // Exact RSS timestamps replace rounded cached ages immediately, not after six hours.
 if(candidate.publishedAt&&/T\d{2}:\d{2}/.test(candidate.publishedAt)&&!video?.publishedAt){video={...candidate,checkedAt:new Date().toISOString()};catalog.videos[candidate.id]=video;}
 try{
  if(!video||video.title!==candidate.title||Date.now()-Date.parse(video.checkedAt)>6*3600000){video=await inspect(candidate);catalog.videos[video.id]=video;inspected++;}
 }catch(error){
  failed++;lookupErrors.set(error.message,(lookupErrors.get(error.message)||0)+1);
  if((candidate.publishedAt||candidate.publicationWindow)&&(!video||video.metadataSource==='channel-page'||video.metadataSource==='rss')){
   const fallback={...candidate,checkedAt:new Date().toISOString()};
   // Incomplete listing evidence must not replace a previously verified archive link.
   if(fallback.metadataSource==='rss'||games.some(game=>relaxedMatch(fallback,game))){catalog.videos[candidate.id]=fallback;fallbacks++;}
  }
 }
});
// Match the recent catalog as well as this run's discoveries so an RSS-window change
// or temporarily unavailable watch page does not discard previously checked metadata.
const videos=Object.values(catalog.videos).filter(v=>CHANNELS.some(c=>c.id===v.channelId));
for(const video of videos){
 const hits=games.map(game=>({game,link:relaxedMatch(video,game)})).filter(h=>h.link);
 if(hits.length>1){
  for(const date of new Set(hits.map(h=>h.game.date))){
   const local=hits.filter(h=>h.game.date===date),link=local[0].link;
   docs.get(date).highlights.push({...link,players:[...new Map(hits.flatMap(h=>h.link.players).map(p=>[p.id,p])).values()],matchedGameIds:local.map(h=>h.game.id)});
  }
 }else if(hits.length===1){const {game,link}=hits[0];const doc=docs.get(game.date);(doc.games[game.id]||=[]).push(link);}
 accepted+=hits.length;
}
const sort=(a,b)=>CHANNELS.findIndex(c=>c.id===a.channelId)-CHANNELS.findIndex(c=>c.id===b.channelId)||Date.parse(a.publishedAt||a.publicationWindow?.latest)-Date.parse(b.publishedAt||b.publicationWindow?.latest);
for(const [date,doc]of docs){
 for(const links of Object.values(doc.games))links.sort(sort);doc.highlights.sort(sort);
 doc.lookupPartial=sources.some(s=>!s.ok)||failed>0||games.some(g=>g.date===date&&g.rosterPartial);await atomic(new URL(`${date}.json`,OUT),doc);
 console.log(`${date}: ${Object.values(doc.games).flat().length} card links; ${doc.highlights.length} shared Highlights`);
}
// Keep a bounded recent metadata catalog; dated matched links form the public archive.
const cutoff=Date.now()-30*86400000;
catalog.videos=Object.fromEntries(Object.entries(catalog.videos).filter(([,v])=>Date.parse(v.publishedAt||v.publicationWindow?.latest)>=cutoff));
await atomic(new URL('catalog.json',OUT),catalog);
const archive=(await readdir(OUT)).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse();for(const f of archive.slice(60))await unlink(new URL(f,OUT));
console.log(`Sources: ${sources.map(s=>`${s.channel}: ${s.ok?s.method:s.error}`).join('; ')}. Inspected ${inspected}, matched ${accepted}, unavailable ${failed}.`);
if(failed)console.warn(`::warning::${failed} watch lookups unavailable; ${fallbacks} verified channel/RSS metadata fallbacks. ${JSON.stringify(Object.fromEntries(lookupErrors))}`);
if(sources.every(s=>!s.ok))process.exitCode=1;
