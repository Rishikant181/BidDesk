import {getAuth} from './auth';
import {AiError} from './ai/runtime';
import {ZodError} from 'zod';
export const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
export async function account(req:Request){const session=await getAuth().api.getSession({headers:req.headers});if(!session)throw new AiError('Please sign in again.',401);return session.user;}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin&&origin!==process.env.BETTER_AUTH_URL)throw new AiError('Invalid request origin.',403);}
export function failure(e:unknown){if(e instanceof AiError)return json({error:e.message},e.status);if(e instanceof ZodError)return json({error:e.issues.map(i=>i.message).join('; ')},400);if(e instanceof SyntaxError)return json({error:'Invalid request.'},400);if(e instanceof Error&&e.message==='NOT_FOUND')return json({error:'Record not found.'},404);console.error('Workflow failed',e instanceof Error?e.name:'Error');return json({error:'Could not complete this operation. Reload and retry.'},503);}
