import {z} from 'zod';
import {dateValue,type Company,type Requirement} from './schemas';
export const bidInformationSchema=z.object({
 text:z.string().trim().max(6000).default(''),fileId:z.string().max(100).default(''),
 amount:z.number().finite().nonnegative().nullable().default(null),period:z.string().trim().max(100).default(''),
 expiresAt:dateValue.default(''),
});
export type BidInformationInput=z.infer<typeof bidInformationSchema>;
export type BidInformationView=BidInformationInput&{requirementId:string;revision:number;fileName:string;fileAvailable:boolean;assessmentStale:boolean;updatedAt:string};
export function companyForBidRequirement(company:Company,r:Requirement,info:(BidInformationInput&{fileName:string;fileAvailable:boolean})|undefined):Company{
 if(!info)return company;
 const proof=info.fileAvailable?info.fileName:'';
 if(r.type==='turnover'&&(info.amount!==null||info.period))return {...company,turnover:info.amount,turnoverPeriod:info.period,turnoverEvidence:proof};
 if(r.type==='certification'&&info.expiresAt)return {...company,certifications:[...company.certifications.filter(c=>c.name.trim().toLowerCase()!==r.value.trim().toLowerCase()),{name:r.value,expiresAt:info.expiresAt,evidence:proof}]};
 return company;
}
