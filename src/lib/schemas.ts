import { z } from "zod";

export const safeUrl = z.string().trim().max(2000).refine(v => {
  if (!v) return true;
  try { const u = new URL(v); return ["http:", "https:"].includes(u.protocol) && !!u.hostname && !u.username && !u.password; } catch { return false; }
}, "Use an http(s) source URL without embedded credentials");
export const dateValue = z.string().refine(v => {
  if (!v) return true;
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(v) || Number.isNaN(Date.parse(v))) return false;
  const day = v.slice(0,10);
  return new Date(day + "T12:00:00Z").toISOString().slice(0,10) === day;
}, "Use a valid YYYY-MM-DD or ISO date with timezone");
const money = z.number().finite().nonnegative().nullable().default(null);
export const requirementSchema = z.object({
  id: z.string().min(1).max(100), label: z.string().min(1).max(500),
  type: z.enum(["turnover", "certification", "location", "experience", "manual"]).default("manual"),
  threshold: money, value: z.string().max(300).default(""), period: z.string().max(100).default(""),
  clause: z.string().max(500).default(""), page: z.number().int().positive().nullable().default(null),
  confirmed: z.boolean().default(false),
});
export type Requirement = z.infer<typeof requirementSchema>;
export const documentSchema = z.object({
  name: z.string().min(1).max(300), url: safeUrl.default(""),
  pages: z.array(z.object({ page: z.number().int().positive(), text: z.string().max(25000) })).max(250).default([]),
}).refine(d => d.pages.reduce((sum,p) => sum + p.text.length, 0) <= 700000, "Document text limit is 700,000 characters");
export const tenderSchema = z.object({
  title: z.string().trim().min(3).max(1000), reference: z.string().trim().min(1).max(300),
  description: z.string().max(30000).default(""), authority: z.string().max(600).default(""),
  category: z.string().max(100).default("Unclassified"), country: z.string().min(2).max(100).default("India"),
  state: z.string().max(100).default(""), city: z.string().max(100).default(""),
  value: money, emd: money, fee: money, currency: z.string().regex(/^[A-Z]{3}$/).default("INR"),
  publishedAt: dateValue.default(""), closesAt: dateValue.default(""),
  sourceStatus: z.enum(["unknown", "active", "cancelled", "awarded", "closed"]).default("unknown"),
  source: z.string().max(100).default("Manual import"), sourceUrl: safeUrl.default(""),
  sourceNote: z.string().max(1000).default(""),
  documents: z.array(documentSchema).max(20).default([]),
  requirements: z.array(requirementSchema).max(100).default([]),
}).refine(t => new Set(t.requirements.map(r=>r.id)).size === t.requirements.length, "Requirement IDs must be unique")
  .refine(t => JSON.stringify(t).length <= 1500000, "Tender text exceeds 1.5 MB; import a shorter document excerpt");
export type TenderInput = z.infer<typeof tenderSchema>;
export type Tender = TenderInput & { id: string; ownerId: string | null; currentVersion: string; createdAt: string; checkedAt: string; updatedAt: string };
export type Version = { id: string; tenderId: string; ownerId: string | null; hash: string; observedAt: string; snapshot: TenderInput };
export const companySchema = z.object({
  name: z.string().max(200).default(""), categories: z.string().max(500).default(""),
  regions: z.array(z.string().max(100)).max(50).default([]), turnover: money,
  turnoverPeriod: z.string().max(100).default(""), turnoverEvidence: z.string().max(500).default(""),
  experience: z.string().max(5000).default(""),
  certifications: z.array(z.object({ name: z.string().max(100), expiresAt: dateValue, evidence: z.string().max(500) })).max(50).default([]),
});
export type Company = z.infer<typeof companySchema>;
export const stages = ["shortlisted", "reviewing", "preparing", "submitted", "won", "lost", "no-bid"] as const;
export const taskSchema = z.object({ id: z.string().min(1).max(100), title: z.string().min(1).max(500), done: z.boolean().default(false), assignee: z.string().max(100).default(""), dueAt: dateValue.default(""), notes: z.string().max(3000).default(""), requirementId: z.string().max(100).default(""), changed: z.boolean().default(false) });
export type Task = z.infer<typeof taskSchema>;
export const bidUpdateSchema = z.object({ stage: z.enum(stages), notes: z.string().max(10000), decision: z.string().max(2000), tasks: z.array(taskSchema).max(200), revision: z.number().int().nonnegative() }).refine(b => new Set(b.tasks.map(t=>t.id)).size === b.tasks.length, "Task IDs must be unique");
export type Bid = z.infer<typeof bidUpdateSchema> & { id: string; tenderId: string; ownerId: string; title: string; tenderVersion: string; updatedAt: string; createdAt: string; events: { at: string; message: string }[] };
export const resultSchema = z.object({ title: z.string().min(3).max(1000), reference: z.string().min(1).max(300), authority: z.string().max(500).default(""), winner: z.string().max(300).default(""), awardDate: dateValue.default(""), value: money, currency: z.string().regex(/^[A-Z]{3}$/).default("INR"), sourceUrl: safeUrl, country: z.string().default("India") });
export type Award = z.infer<typeof resultSchema> & { id: string; ownerId: string | null };
export type Notification = { id: string; ownerId: string; tenderId: string; title: string; createdAt: string; read: boolean };
