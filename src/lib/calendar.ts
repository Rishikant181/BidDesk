export type CalendarEntry={id:string;title:string;date:string;url:string;updatedAt?:string};
const escape=(s:string)=>s.replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll('\r','').replaceAll(';','\\;').replaceAll(',','\\,');
function fold(line:string){const lines:string[]=[];let part='',size=0;for(const c of line){const bytes=new TextEncoder().encode(c).length;if(size+bytes>73){lines.push(part);part=' ';size=1;}part+=c;size+=bytes;}lines.push(part);return lines.join('\r\n');}
export function calendarFile(entries:CalendarEntry[],now=new Date()){
 const stamp=(value:string)=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BidDesk//Preparation//EN','CALSCALE:GREGORIAN'];
 for(const e of entries){if(!e.date)continue;const dayOnly=e.date.length===10;lines.push('BEGIN:VEVENT',`UID:${escape(e.id)}@biddesk`,`DTSTAMP:${stamp(now.toISOString())}`,`LAST-MODIFIED:${stamp(e.updatedAt||now.toISOString())}`,dayOnly?`DTSTART;VALUE=DATE:${e.date.replaceAll('-','')}`:`DTSTART:${stamp(e.date)}`,`SUMMARY:${escape(e.title)}`,`URL:${escape(e.url)}`,'END:VEVENT');}
 return [...lines,'END:VCALENDAR',''].map(fold).join('\r\n');
}
