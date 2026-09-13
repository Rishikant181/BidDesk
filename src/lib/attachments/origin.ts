import {AiError} from '../ai/runtime';

// Use the operator's configured origin; never derive a hosted destination from
// forwarded headers or an arbitrary request host.
export function attachmentOrigin(req:Request){
 const request=new URL(req.url);
 const configured=process.env.BETTER_AUTH_URL;
 let destination:URL;
 try{destination=new URL(configured||request.origin);}catch{throw new AiError('Configure BETTER_AUTH_URL with your BidDesk site URL.',503);}
 const local=destination.protocol==='http:'&&['localhost','127.0.0.1'].includes(destination.hostname);
 if(destination.username||destination.password||destination.pathname!=='/'||destination.search||destination.hash||(!local&&(!configured||destination.protocol!=='https:')))
  throw new AiError('Configure BETTER_AUTH_URL with an HTTPS site URL (HTTP is allowed only for localhost).',503);
 if(request.origin!==destination.origin)throw new AiError('Open BidDesk at the configured BETTER_AUTH_URL to transfer attachments.',403);
 return destination.origin;
}
