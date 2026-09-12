"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {LoaderCircle} from 'lucide-react';
import type {RunView} from '@/lib/tenderhut/matching';
import {useWorkspace} from './context';
async function request(action:string,runId?:string,offset?:number):Promise<RunView>{
 const res=await fetch('/api/matching',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,runId,offset})});
 const value=await res.json();if(!res.ok)throw new Error(value.error||'Matching unavailable.');return value;
}
export function AIMatching(){
 const {data}=useWorkspace();
 const [run,setRun]=useState<RunView|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[explanationErrors,setExplanationErrors]=useState<Record<number,string>>({});
 const current=useRef<RunView|null>(null),inFlight=useRef(false),mounted=useRef(true),sentinel=useRef<HTMLDivElement>(null),explanations=useRef(new Set<string>());
 const apply=useCallback((value:RunView)=>{
  // Page loading and explanation responses can finish in either order.
  const old=current.current;
  if(old?._id===value._id){
   const items=old.shown>value.shown?old.items:value.items;
   value={...(old.shown>value.shown?old:value),items:items.map(t=>({...t,explanation:value.items.find(v=>v.id===t.id)?.explanation||old.items.find(v=>v.id===t.id)?.explanation}))};
  }
  current.current=value;if(mounted.current)setRun(value);return value;
 },[]);
 const loadNext=useCallback(async()=>{
  const r=current.current;if(!r?.hasMore||r.stale||inFlight.current)return;
  inFlight.current=true;setBusy(true);setError('');
  try{const next=await request('page',r._id,r.shown);if(mounted.current&&current.current?._id===r._id)apply(next);}
  catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Tenders could not be loaded.');}
  finally{inFlight.current=false;if(mounted.current)setBusy(false);}
 },[apply]);
 useEffect(()=>{
  if(!run||run.stale)return;
  for(let offset=0;offset<run.shown;offset+=10){
   const key=`${run._id}:${offset}`;
   if(explanationErrors[offset]||explanations.current.has(key)||run.items.slice(offset,offset+10).every(t=>t.explanation))continue;
   explanations.current.add(key);
   void request('explain',run._id,offset).then(value=>{
    if(mounted.current&&current.current?._id===run._id)apply(value);
   }).catch(e=>{if(mounted.current&&current.current?._id===run._id)setExplanationErrors(errors=>({...errors,[offset]:e instanceof Error?e.message:'Explanations could not be loaded.'}));}).finally(()=>explanations.current.delete(key));
  }
 },[run,apply,explanationErrors]);
 useEffect(()=>{
  // A visible sentinel alone must not drain the shortlist on mount or resize.
  let previous=window.scrollY;
  const onScroll=()=>{const y=window.scrollY,down=y>previous;previous=y;if(down&&!loading&&!error&&sentinel.current&&sentinel.current.getBoundingClientRect().top<=window.innerHeight+50)void loadNext();};
  window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll);
 },[loadNext,loading,error]);
 const execute=useCallback(async()=>{
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');setExplanationErrors({});
  current.current=null;setRun(null);
  try{const next=await request('start');if(mounted.current)apply(next);}
  catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Matching unavailable.');}
  finally{inFlight.current=false;if(mounted.current)setBusy(false);}
 },[apply]);
 const canMatch=data.company.aiProfile.trim().length>=30;
 useEffect(()=>{
  mounted.current=true;const controller=new AbortController();
  const timer=window.setTimeout(()=>{
   const url=new URL(window.location.href),start=url.searchParams.get('start')==='true';
   if(start){url.searchParams.delete('start');window.history.replaceState(null,'',url.pathname+url.search+url.hash);}
   if(start&&canMatch){setLoading(false);void execute();return;}
   fetch('/api/matching',{signal:controller.signal,cache:'no-store'}).then(async r=>{
    const value=await r.json();if(controller.signal.aborted)return;
    if(!r.ok)throw new Error(value.error||'Previous matches could not be loaded.');if(value)apply(value);
   }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  },0);
  return()=>{window.clearTimeout(timer);mounted.current=false;controller.abort();};
 },[apply,canMatch,execute]);
 return <section className="panel form-panel ai-panel mt">
  <div className="matching-toolbar row between wrap">
   {run&&<span className="muted">{run.shown} tenders</span>}
   {canMatch&&<button className="button secondary small" disabled={busy||loading} onClick={()=>void execute()}>{run?'Search again':'Find tenders matching my profile'}</button>}
  </div>
  {!canMatch&&<p className="info-box"><Link href="/company">Complete your company capability profile</Link> to start matching.</p>}
  {loading&&<p role="status" className="row"><LoaderCircle className="spin" size={18} aria-hidden="true"/>Loading previous matches…</p>}
  {busy&&!run&&<p role="status" className="row"><LoaderCircle className="spin" size={18} aria-hidden="true"/>Finding your first 10 tenders…</p>}
  {error&&<p role="alert" className="error">{error}</p>}
  {run&&<>
   {run.stale&&<p className="info-box">Your profile or a tender changed. These are previous results; start a new search before loading more.</p>}
   {run.warnings.map((w,i)=><p key={i} className="info-box">{w}</p>)}
   {!run.total&&<p>No opportunities returned. Refine the offerings in your profile or use keyword discovery.</p>}
   {run.items.map((t,i)=><article className="ai-match-card" key={t.id}>
    <small>#{t.rank} · {t.quality}</small><h3><Link href={`/tenders/${t.id}`}>{t.title}</Link></h3>
    <div className="match-explanation" aria-label="AI explanation">
     {t.explanation?<><p><strong>Why it matches:</strong> {t.explanation.reason}</p><p><strong>Still to check:</strong> {t.explanation.gap}</p><details><summary>Notice excerpt</summary><blockquote>{t.explanation.quote}</blockquote></details></>:run.stale?<p>Start a new search to generate this explanation.</p>:explanationErrors[Math.floor(i/10)*10]?<p>Explanation could not be loaded. Retry below.</p>:<p role="status" className="row"><LoaderCircle className="spin" size={18} aria-hidden="true"/>Generating AI explanation…</p>}
    </div>
   </article>)}
   {Object.entries(explanationErrors).map(([offset,message])=><div key={offset} className="mt"><p role="alert" className="error">{message}</p><button className="button secondary" disabled={run.stale} onClick={()=>setExplanationErrors(errors=>{const next={...errors};delete next[Number(offset)];return next;})}>Retry explanations for results {Number(offset)+1}–{Math.min(Number(offset)+10,run.shown)}</button></div>)}
   {run.hasMore&&!run.stale&&<div ref={sentinel} className="mt" data-testid="matching-next-page">
    {busy?<p role="status" className="row"><LoaderCircle className="spin" size={18} aria-hidden="true"/>Loading the next 10 tenders…</p>:<button className="button secondary" onClick={()=>void loadNext()}>{error?'Retry next batch':'Load next 10 matches'}</button>}
   </div>}
   {!run.hasMore&&run.shown>0&&<p className="muted mt">You’ve reached the end of this shortlist.</p>}
   {!run.hasMore&&run.items.every(t=>t.explanation)&&<p role="status">Matching complete. Relevance is separate from eligibility.</p>}
  </>}
 </section>;
}
