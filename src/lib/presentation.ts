const labels: Record<string,string> = {
 title:'Title', reference:'Tender reference', authority:'Issuing authority', description:'Scope',
 publishedAt:'Published date', closesAt:'Closing date', value:'Estimated value', emd:'Earnest money deposit',
 fee:'Document fee', sourceUrl:'Official notice', sourceNote:'Source notes', sourceStatus:'Published status',
 documents:'Documents', requirements:'Requirements', name:'Name', url:'Link', pages:'Pages', page:'Page',
 text:'Text', label:'Requirement', type:'Assessment type', threshold:'Minimum required', period:'Financial period',
 clause:'Source clause', confirmed:'Reviewed', complex:'Requires judgment', currency:'Currency',
 category:'Category', state:'State', city:'Location', country:'Country', source:'Source',
};
export function fieldLabel(key:string){return labels[key]||key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^./,v=>v.toUpperCase());}
// Only business fields belong in a displayed amendment comparison.
export function changeText(value:unknown):string {
 if(value===null||value===undefined||value==='')return 'Not supplied';
 if(typeof value==='boolean')return value?'Yes':'No';
 if(typeof value==='string'||typeof value==='number')return String(value);
 if(Array.isArray(value))return value.length?value.map(changeText).join('\n\n'):'None';
 if(typeof value==='object')return Object.entries(value).filter(([key])=>key in labels).map(([key,v])=>`${fieldLabel(key)}: ${changeText(v)}`).join('\n')||'Details updated';
 return 'Not supplied';
}
