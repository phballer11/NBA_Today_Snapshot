// Shared browser/collector guard: never infer an exact time from a rounded day label.
export function uploadFits(video,start,date){
 const tip=Date.parse(start);if(!Number.isFinite(tip))return false;
 const precise=value=>typeof value==='string'&&/T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value)?Date.parse(value):NaN;
 const earliest=precise(video.publishedAt||video.publicationWindow?.earliest),latest=precise(video.publishedAt||video.publicationWindow?.latest);
 if(!Number.isFinite(earliest)||!Number.isFinite(latest)||latest<earliest||earliest<tip||latest>tip+15*3600000)return false;
 const dates=[],year=date.slice(0,4),title=video.title||'';
 for(const m of title.matchAll(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g))dates.push(`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
 const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 for(const m of title.matchAll(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?/gi))dates.push(`${m[3]||year}-${String(months.indexOf(m[1].slice(0,3).toLowerCase())+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`);
 for(const m of title.matchAll(/(?:(20\d{2})年)?(\d{1,2})月(\d{1,2})日/g))dates.push(`${m[1]||year}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
 const allowed=[date];
 if(video.channelId==='UCPVpbXIiIDwDKVvu68-Vb-A')allowed.push(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(start)));
 return !dates.length||dates.some(d=>allowed.includes(d));
}
