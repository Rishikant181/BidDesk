"use client";
import {useState} from "react";
import {Sparkles} from "lucide-react";
import type {Citation} from "@/lib/ai/contracts";
export async function aiRequest<T>(body:Record<string,unknown>):Promise<T>{const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||"AI request failed");return d;}
export async function aiRead<T>(query=""):Promise<T>{const r=await fetch("/api/ai"+query,{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load AI state");return d;}
export function AIConsent({value,onChange}:{value:boolean;onChange:(v:boolean)=>void}){return <label className="checkbox-label ai-consent"><input type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)}/>I approve sending the selected document text and AI-shareable evidence to Gemini. These inputs are public or non-sensitive demo material unless the administrator has enabled private-data processing.</label>;}
export function Citations({citations}:{citations:Citation[]}){return <div className="ai-citations">{citations.map((c,i)=><details key={i}><summary>Source · PDF page {c.page}</summary><blockquote>{c.quote}</blockquote><small>Document {c.documentId.slice(0,8)}</small></details>)}</div>;}
export function AIButton({onClick,disabled,children}:{onClick:()=>void;disabled?:boolean;children:React.ReactNode}){return <button type="button" className="button secondary" onClick={onClick} disabled={disabled}><Sparkles size={16}/>{children}</button>;}
export function useAIAction(){const [busy,setBusy]=useState(false),[error,setError]=useState("");async function run(work:()=>Promise<void>){setBusy(true);setError("");try{await work();}catch(e){setError(e instanceof Error?e.message:"AI operation failed");}finally{setBusy(false);}}return {busy,error,run};}
