import type {Company,Tender} from './schemas';
import type {Preferences} from './workflow-schema';
import {indiaDay,statusOf} from './domain';
const stop=new Set('company services provide providing experienced experience solutions expertise projects business across india with that this have from quality your our'.split(' '));
const synonyms=[['laboratory','lab'],['instrumentation','instruments','measurement'],['solar','photovoltaic'],['construction','building'],['software','application'],['maintenance','repair']];
export function relevance(t:Tender,c:Company,p:Preferences,feedback?:boolean,now=new Date()){
 const text=`${t.title} ${t.category} ${t.description}`.toLowerCase(),reasons:string[]=[],unknown:string[]=[];
 if(feedback===false||p.excludedWork.some(w=>text.includes(w.toLowerCase())))return null;
 if(['closed','cancelled','awarded'].includes(statusOf(t,now)))return null;
 const region=p.regions.some(r=>`${t.state} ${t.city}`.toLowerCase().includes(r.toLowerCase()));
 if(p.regions.length&&(!t.state||['national','india','unknown'].includes(t.state.toLowerCase()))&&!t.city)unknown.push('Location unknown');else if(p.strictRegion&&p.regions.length&&!region)return null;
 if(t.value===null||t.currency!=='INR')unknown.push('Comparable value unknown');else if(p.strictValue&&(p.minValue!==null&&t.value<p.minValue||p.maxValue!==null&&t.value>p.maxValue))return null;
 if(!t.closesAt)unknown.push('Deadline unknown');else if(p.minimumDays){const days=(Date.parse(indiaDay(t.closesAt))-Date.parse(indiaDay(now.toISOString())))/86400000;if(days<p.minimumDays)return null;}
 const terms=new Set(`${c.aiProfile} ${c.categories} ${c.projects.filter(p=>p.shareWithAI).map(p=>p.scope).join(' ')}`.toLowerCase().match(/[a-z]{3,}/g)?.filter(t=>!stop.has(t))||[]);
 for(const group of synonyms)if(group.some(t=>terms.has(t)))for(const word of group)terms.add(word);
 let score=0;for(const term of terms){if(t.title.toLowerCase().includes(term))score+=3;if(t.category.toLowerCase().includes(term))score+=2;if(t.description.toLowerCase().includes(term))score+=1;}
 if(score)reasons.push('Capability terms in notice');if(region){score+=5;reasons.push('Preferred region');}
 if(t.value!==null&&t.currency==='INR'&&(p.minValue!==null||p.maxValue!==null)&&(p.minValue===null||t.value>=p.minValue)&&(p.maxValue===null||t.value<=p.maxValue)){score+=3;reasons.push('Preferred value');}if(feedback===true){score+=8;reasons.push('Marked relevant');}
 return {score,quality:[...reasons,...unknown].join(' · ')||'Limited metadata fit'};
}
