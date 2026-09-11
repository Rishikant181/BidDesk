import * as cheerio from "cheerio";
import { tenderSchema, type TenderInput } from "./schemas";

const ISRO="https://www.isro.gov.in/Tenders.html";
function tidy(v:string) { return v.replace(/\s+/g," ").trim(); }
const months:Record<string,string>={January:"01",February:"02",March:"03",April:"04",May:"05",June:"06",July:"07",August:"08",September:"09",October:"10",November:"11",December:"12"};
export function isroDate(raw:string) {
  const m=raw.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/);
  if(!m) return "";
  const date=`${m[3]}-${months[m[1]]}-${m[2].padStart(2,"0")}`;
  return m[4] ? `${date}T${m[4].padStart(2,"0")}:${m[5]}:00+05:30` : date;
}
export function parseIsro(html:string):TenderInput[] {
  const $=cheerio.load(html), records:TenderInput[]=[];
  $("tbody.list tr").each((_,row)=>{
    const el=$(row), ref=tidy(el.find(".advtNo").text()), authority=tidy(el.find(".advertiser").text()), date=tidy(el.find(".date").text()), centre=tidy(el.find(".centre").text());
    if(!ref || !date) return;
    const documents=el.find(".tender a[href]").toArray().map(a=>({name:tidy($(a).text()) || ref,url:new URL($(a).attr("href")!,ISRO).href,pages:[]}));
    const dates=date.split(/\s+-?\s*to\s+/);
    const english=authority.includes(" / ") ? authority.split(" / ").at(-1)! : authority;
    const cities:[[RegExp,string,string]] | [RegExp,string,string][]=[[/Ahmedabad/i,"Ahmedabad","Gujarat"],[/Hassan/i,"Hassan","Karnataka"],[/Bengal|Bangal/i,"Bengaluru","Karnataka"],[/Thiruvananthapuram|Trivandrum/i,"Thiruvananthapuram","Kerala"],[/Sriharikota/i,"Sriharikota","Andhra Pradesh"],[/Mahendragiri/i,"Mahendragiri","Tamil Nadu"],[/Hyderabad/i,"Hyderabad","Telangana"],[/Dehradun/i,"Dehradun","Uttarakhand"]];
    const location=cities.find(([r])=>r.test(english));
    records.push(tenderSchema.parse({reference:ref,title:`${centre} · ${ref}`,authority:english,description:`Official ${centre} procurement notice. The consolidated listing identifies this notice by advertisement number. Open the original document for the work description, lots, financial requirements and submission conditions.`,category:"Unclassified",state:location?.[2] || "",city:location?.[1] || "",publishedAt:isroDate(dates[0]),closesAt:isroDate(dates[1] || ""),source:"ISRO",sourceUrl:documents[0]?.url || ISRO,sourceNote:`Source: ISRO consolidated tender register (${ISRO}). Dates are the listing's advertised tender window; verify the original document for each lot's submission deadline. City/state describe the advertiser address, not a confirmed work site.`,documents}));
  });
  if(records.length===0) throw new Error("ISRO page structure changed: no records parsed");
  const unique=new Map(records.map(r=>[r.reference,r]));
  return [...unique.values()];
}
export async function collectIsro() {
  const response=await fetch(ISRO,{signal:AbortSignal.timeout(30000),headers:{"User-Agent":"BidDesk-POC/0.1 (official tender metadata research)"},redirect:"error"});
  if(!response.ok) throw new Error(`ISRO returned HTTP ${response.status}`);
  return parseIsro(await response.text());
}
