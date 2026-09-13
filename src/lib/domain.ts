import type { Company, Requirement, TenderInput, Task } from "./schemas";

export function statusOf(t: Pick<TenderInput,"sourceStatus"|"closesAt">, now = new Date()): string {
  if (["cancelled","awarded","closed"].includes(t.sourceStatus)) return t.sourceStatus;
  if (!t.closesAt) return t.sourceStatus;
  // A date-only source is not an exact time: close after that date in India.
  const limit = t.closesAt.length === 10 ? Date.parse(`${t.closesAt}T23:59:59+05:30`) : Date.parse(t.closesAt);
  return limit < now.getTime() ? "closed" : t.sourceStatus === "unknown" ? "upcoming deadline" : "active";
}
export function indiaDay(value:string){if(value.length===10)return value;const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(value));return ["year","month","day"].map(key=>parts.find(p=>p.type===key)!.value).join("-");}
export function formatDate(value?: string, withTime = false) {
  if (!value) return "Not published";
  const date = new Date(value.length === 10 ? `${value}T12:00:00+05:30` : value);
  if (Number.isNaN(date.getTime())) return "Needs review";
  return new Intl.DateTimeFormat("en-IN", { day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata", ...(withTime && value.length>10 ? {hour:"2-digit", minute:"2-digit"} as const : {}) }).format(date) + (withTime && value.length>10 ? " IST" : "");
}
export function formatMoney(value: number | null | undefined, currency = "INR") {
  if (value == null) return "Not published";
  return new Intl.NumberFormat("en-IN", { style:"currency",currency,maximumFractionDigits:0,notation: value >= 10000000 ? "compact" : "standard" }).format(value);
}
export type Assessment = { requirementId: string; outcome: "appears satisfied" | "not satisfied" | "needs review"; reason: string; evidence: string };
export function assess(r: Requirement, c: Company, closesAt = "", now = new Date()): Assessment {
  const result = (outcome: Assessment["outcome"], reason: string, evidence = ""): Assessment => ({requirementId:r.id,outcome,reason,evidence});
  if (r.complex) return result("needs review","This condition contains alternatives, formulas or exceptions that require manual assessment.");
  if (!r.confirmed) return result("needs review","Confirm this requirement against the original clause first.");
  if (!r.clause && !r.page) return result("needs review","Add a clause or page reference to support this requirement.");
  if (r.type === "turnover") {
    if (c.turnover == null || r.threshold == null || !c.turnoverEvidence || !r.period || r.period !== c.turnoverPeriod || r.value !== "INR") return result("needs review","Provide evidence of your turnover for the required financial period in INR. Composite formulas need manual review.");
    return result(c.turnover >= r.threshold ? "appears satisfied" : "not satisfied",`${formatMoney(c.turnover)} against minimum ${formatMoney(r.threshold)} (${r.period}).`,c.turnoverEvidence);
  }
  if (r.type === "certification") {
    const cert = c.certifications.find(v=>v.name.trim().toLowerCase()===r.value.trim().toLowerCase());
    if (!cert || !cert.evidence || !cert.expiresAt) return result("needs review","Your certification evidence or expiry date is missing.");
    const expiry = Date.parse(cert.expiresAt.length===10 ? cert.expiresAt+"T23:59:59+05:30" : cert.expiresAt);
    const at = closesAt ? Date.parse(closesAt.length===10 ? closesAt+"T23:59:59+05:30" : closesAt) : now.getTime();
    return result(expiry >= at ? "appears satisfied" : "not satisfied",expiry >= at ? "Your certificate is valid through the assessment deadline." : "Your certificate expires before the assessment deadline.",cert.evidence);
  }
  if (r.type === "location") return result(c.regions.some(v=>v.trim().toLowerCase()===r.value.trim().toLowerCase()) ? "appears satisfied" : "needs review","Compare your declared operating region with the exact location clause; registration requirements require separate evidence.", c.regions.join(", "));
  return result("needs review","Check your experience or composite conditions against the original document.",r.type === "experience" ? c.experience : "");
}
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return "{"+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+":"+stableStringify(v)).join(",")+"}";
  return JSON.stringify(value) ?? "undefined";
}
export function changesBetween(a: TenderInput, b: TenderInput) {
  return Object.keys(b).filter(k=>stableStringify(a[k as keyof TenderInput])!==stableStringify(b[k as keyof TenderInput])).map(key=>({key,before:a[key as keyof TenderInput],after:b[key as keyof TenderInput]}));
}
export function impactedTasks(tasks: Task[], before: Requirement[], after: Requirement[]): Task[] {
  const changed = new Set([...before,...after].filter(r=>stableStringify(before.find(x=>x.id===r.id))!==stableStringify(after.find(x=>x.id===r.id))).map(r=>r.id));
  return tasks.map(t=> t.requirementId && changed.has(t.requirementId) ? {...t,done:false,changed:true} : t);
}
export function csvCell(value: unknown) {
  let s = value == null ? "" : String(value);
  if (/^[\s]*[=+@\-]/.test(s)) s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
export function csv(rows: Record<string,unknown>[], columns: string[]) {
  return "\uFEFF"+[columns.map(csvCell).join(","),...rows.map(r=>columns.map(c=>csvCell(r[c])).join(","))].join("\r\n");
}
