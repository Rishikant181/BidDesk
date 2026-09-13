"use client";
import {CitationReader} from "./document-review";
import {useState} from "react";
import {Spinner} from "./ui";
import {Sparkles} from "lucide-react";
import type {Citation} from "@/lib/ai/contracts";
export async function aiRequest<T>(body:Record<string,unknown>):Promise<T>{const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||"AI request failed");return d;}
export async function aiRead<T>(query=""):Promise<T>{const r=await fetch("/api/ai"+query,{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load AI state");return d;}
export function Citations({citations}:{citations:Citation[]}){return <div className="ai-citations">{citations.map((c,i)=><details key={i}><summary>Source · PDF page {c.page}</summary><div className="form-flow disclosure-body"><blockquote>{c.quote}</blockquote><div className="row wrap"><small>Document {c.documentId.slice(0,8)}</small><CitationReader citation={c}/></div></div></details>)}</div>;}
export function AIButton({onClick,disabled,busy=false,children}:{onClick:()=>void;disabled?:boolean;busy?:boolean;children:React.ReactNode}){return <button type="button" className="button secondary" onClick={onClick} disabled={disabled||busy} aria-busy={busy}>{busy?<Spinner/>:<Sparkles size={18}/>}{children}</button>;}
export function useAIAction(){const [busy,setBusy]=useState(false),[error,setError]=useState("");async function run(work:()=>Promise<void>){setBusy(true);setError("");try{await work();return true;}catch(e){setError(e instanceof Error?e.message:"AI operation failed");return false;}finally{setBusy(false);}}return {busy,error,run};}
