import { describe, expect, it } from "vitest";
import { assess, changesBetween, csvCell, impactedTasks, stableStringify, statusOf } from "../../src/lib/domain";
import { companySchema, requirementSchema, safeUrl, taskSchema, tenderSchema, dateValue } from "../../src/lib/schemas";
import { isroDate, parseIsro } from "../../src/lib/ingestion";
const r=requirementSchema.parse({id:"finance",label:"Minimum turnover",type:"turnover",threshold:100,value:"INR",period:"FY 2025-26",clause:"4.1",confirmed:true});
const c=companySchema.parse({turnover:100,turnoverPeriod:r.period,turnoverEvidence:"Audited accounts, p. 12"});
describe("conservative eligibility",()=>{
 it("handles the exact threshold and evidenced failure",()=>{expect(assess(r,c).outcome).toBe("appears satisfied");expect(assess(r,{...c,turnover:99}).outcome).toBe("not satisfied");});
 it.each([{turnoverEvidence:""},{turnoverPeriod:"FY 2024-25"},{turnover:null}])("requires matching financial evidence: %o",patch=>expect(assess(r,{...c,...patch}).outcome).toBe("needs review"));
 it("does not approve unconfirmed, unsourced or foreign currency requirements",()=>{for(const patch of [{confirmed:false},{clause:"",page:null},{value:"USD"}])expect(assess({...r,...patch},c).outcome).toBe("needs review");});
 it("checks certification through deadline, not just today",()=>{const cert=requirementSchema.parse({id:"cert",label:"ISO",type:"certification",value:"ISO 9001",clause:"2",confirmed:true});const company=companySchema.parse({certifications:[{name:"iso 9001",expiresAt:"2026-09-30",evidence:"Certificate 123"}]});expect(assess(cert,company,"2026-10-01").outcome).toBe("not satisfied");expect(assess(cert,company,"2026-09-30").outcome).toBe("appears satisfied");});
});
describe("dates, amendments and export",()=>{
 it("respects IST date-only closure and explicit source status",()=>{expect(statusOf({sourceStatus:"unknown",closesAt:"2026-09-11"},new Date("2026-09-11T18:29:58Z"))).toBe("upcoming deadline");expect(statusOf({sourceStatus:"active",closesAt:"2026-09-11"},new Date("2026-09-11T18:30:00Z"))).toBe("closed");expect(statusOf({sourceStatus:"cancelled",closesAt:"2099-01-01"})).toBe("cancelled");});
 it("reopens only linked changed tasks and retains evidence",()=>{const linked=taskSchema.parse({id:"a",title:"Accounts",requirementId:r.id,done:true,notes:"Keep this evidence"});const other=taskSchema.parse({id:"b",title:"Sign",done:true});const tasks=impactedTasks([linked,other],[r],[{...r,threshold:200}]);expect(tasks[0]).toMatchObject({done:false,changed:true,notes:linked.notes});expect(tasks[1]).toEqual(other);});
 it("detects changes and canonicalizes reordered keys",()=>{expect(stableStringify({b:2,a:1})).toBe('{"a":1,"b":2}');const a=tenderSchema.parse({title:"Real record",reference:"1"});expect(changesBetween(a,{...a,closesAt:"2026-12-01"}).map(c=>c.key)).toEqual(["closesAt"]);});
 it.each(["=1+1"," +SUM(A1)","@IMPORT","-42","\t=CMD()"])("neutralizes spreadsheet formulas %s",v=>expect(csvCell(v)).toBe('"\''+v+'"'));
});
describe("import boundaries",()=>{
 it.each(["2026-02-30","2026-13-01","2026-09-11T12:00:00","11/09/2026"])("rejects invalid or ambiguous date %s",v=>expect(dateValue.safeParse(v).success).toBe(false));
 it.each(["javascript:alert(1)","https://","https://user:password@example.com"])("rejects unsafe source %s",v=>expect(safeUrl.safeParse(v).success).toBe(false));
 it("rejects negative money and duplicate requirement identities",()=>{expect(tenderSchema.safeParse({title:"Tender",reference:"1",value:-1}).success).toBe(false);expect(tenderSchema.safeParse({title:"Tender",reference:"1",requirements:[r,r]}).success).toBe(false);});
 it("fails clearly for a changed source structure",()=>expect(()=>parseIsro("<html>Unavailable</html>")).toThrow("no records"));
 it("preserves listing provenance without inventing a title or value",()=>{const [t]=parseIsro('<table><tbody class="list"><tr><td class="advtNo">NIT/1</td><td class="advertiser">SAC Ahmedabad</td><td class="centre">SAC</td><td class="date">September 11, 2026 - 10:00 to September 25, 2026 - 17:00</td><td class="tender"><a href="/notice.pdf">NIT</a></td></tr></tbody></table>');expect(t.value).toBeNull();expect(t.closesAt).toBe("2026-09-25T17:00:00+05:30");expect(t.sourceUrl).toBe("https://www.isro.gov.in/notice.pdf");expect(t.sourceNote).toContain("advertised tender window");expect(isroDate("Not specified")).toBe("");});
});
