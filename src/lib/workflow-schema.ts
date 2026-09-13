import { z } from 'zod';

export const preferencesSchema = z.object({
  regions: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  strictRegion: z.boolean().default(false), minValue: z.number().nonnegative().nullable().default(null),
  maxValue: z.number().nonnegative().nullable().default(null), strictValue: z.boolean().default(false),
  excludedWork: z.array(z.string().trim().min(2).max(100)).max(30).default([]),
  minimumDays: z.number().int().min(0).max(365).default(0),
}).refine(p=>p.minValue===null||p.maxValue===null||p.minValue<=p.maxValue,'Minimum value exceeds maximum');
export type Preferences = z.infer<typeof preferencesSchema>;
export const evidenceSchema = z.object({
  title:z.string().trim().min(3).max(200),type:z.enum(['certification','financial','project','other']),
  fileId:z.string().max(100).default(''), period:z.string().max(100).default(''),
  expiresAt:z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).default(''),
  issuedAt:z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).default(''),
  amount:z.number().finite().nonnegative().nullable().default(null), notes:z.string().max(3000).default(''),
});
export type Evidence = z.infer<typeof evidenceSchema> & {id:string;ownerId:string;revision:number;updatedAt:string;deleted?:boolean;fileMissing?:boolean};
export type ReviewJudgment = {requirementId:string;outcome:'supporting evidence'|'evidence gap'|'needs review';note:string;evidence:string;evidenceIds:string[];inputHash:string;recordedAt:string;stale?:boolean};
export const watchSchema=z.object({enabled:z.boolean().default(false),saved:z.boolean().default(true),bids:z.boolean().default(true),email:z.boolean().default(false),days:z.array(z.number().int().min(0).max(90)).max(10).default([7,3,1])});
export type Watch = z.infer<typeof watchSchema>;
export const decisionSchema=z.object({choice:z.enum(['bid','no-bid','undecided']),reasons:z.string().min(10).max(3000),gaps:z.string().max(3000).default(''),effortHours:z.number().nonnegative().max(100000).nullable().default(null)});
export const submissionSchema=z.object({submittedAt:z.string().max(40).default(''),reference:z.string().max(300).default(''),fileId:z.string().max(100).default(''),notes:z.string().max(3000).default(''),outcome:z.enum(['pending','won','lost']).default('pending'),outcomeDate:z.string().max(40).default(''),outcomeReason:z.string().max(3000).default('')});
export type BidRecord={ownerId:string;tenderId:string;decision?:z.infer<typeof decisionSchema>;submission?:z.infer<typeof submissionSchema>;inputHash?:string;decisionHash?:string;snapshot?:{version:string;status:string;issues:{key:string;title:string;requirementId?:string}[];coverage:{total:number;analyzed:number;reviewed:number}};reviewer?:string;decidedAt?:string;updatedAt?:string;history?:{value:z.infer<typeof decisionSchema>;inputHash:string;status:string;issues:{key:string;title:string;requirementId?:string}[];at:string;reviewer:string}[]};
