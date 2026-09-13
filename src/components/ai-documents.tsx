"use client";
import {DocumentReview} from "./document-review";
import {uploadPdf} from "./workflow";
import {parsePageSelection,pageBatches} from "@/lib/document-pages";
import {useEffect,useState,useRef,useCallback} from "react";
import {Upload,Square} from "lucide-react";
import type {Tender} from "@/lib/schemas";
import type {SourceDocument,Extraction} from "@/lib/ai/contracts";
import {aiRead,aiRequest,AIButton,useAIAction} from "./ai-common";
import {Badge,SectionHeader,Loading,ErrorState,Spinner} from "./ui";
import {useWorkspace} from "./context";
import {Attachments} from "./attachments";
import {fieldLabel} from "@/lib/presentation";
type AIState={documents:(Omit<SourceDocument,"pages">&{pages:{page:number;characters:number;readable:boolean}[]})[];findings:{stale:boolean;fields:Extraction['fields'];requirements?:Extraction['requirements'];conflicts:string[]}|null};
export function AIDocuments({tender,onApplied}:{tender:Tender;onApplied:()=>Promise<void>}){
 const {refresh}=useWorkspace(),[state,setState]=useState<AIState|null>(null),[docId,setDocId]=useState(''),[pageRange,setPageRange]=useState(''),[progress,setProgress]=useState(''),[loadError,setLoadError]=useState('');
 const {busy,error,run}=useAIAction(),stop=useRef(false);
 const load=useCallback(async()=>{const s=await aiRead<AIState>(`?tenderId=${encodeURIComponent(tender.id)}`);setState(s);setLoadError('');setDocId(id=>s.documents.some(d=>d.id===id)?id:s.documents[0]?.id||'');return s;},[tender.id]);
 useEffect(()=>{let active=true;aiRead<AIState>(`?tenderId=${encodeURIComponent(tender.id)}`).then(s=>{if(active){setState(s);setLoadError('');setDocId(s.documents[0]?.id||'');}}).catch(e=>{if(active)setLoadError(e.message);});return()=>{active=false;};},[tender.id]);
 const document=state?.documents.find(d=>d.id===docId);
 async function changed(){await load();await onApplied();await refresh();window.dispatchEvent(new Event('workflow-change'));}
 async function local(file?:File){if(!file)return;await run(async()=>{setProgress('Uploading PDF…');const d=await uploadPdf(file,tender.id,tender.currentVersion);await load();setDocId(d.id);setPageRange('');setProgress('PDF ready to analyze.');});}
 async function analyze(){if(!document)return;stop.current=false;
  const completed=await run(async()=>{
   const selected=pageRange.trim()?parsePageSelection(pageRange,document.totalPages):document.pages.map(p=>p.page);
   const readable=document.pages.filter(p=>selected.includes(p.page)&&p.readable);
   if(!readable.length)throw new Error('This PDF needs OCR. Open Document options to read its scanned pages first.');
   const batches=pageBatches(readable.map(p=>({page:p.page,characters:p.characters})));
   for(let i=0;i<batches.length&&!stop.current;i++){let count=1;for(let chunkIndex=0;chunkIndex<count&&!stop.current;chunkIndex++){
    setProgress(`Analyzing PDF · batch ${i+1} of ${batches.length}, section ${chunkIndex+1}`);
    const result=await aiRequest<{totalChunks:number}>({action:'extract',documentId:document.id,pages:batches[i],chunkIndex});count=result.totalChunks;await load();
   }}
   setProgress(stop.current?'Paused. Findings from completed sections are saved.':`Analysis complete. Private findings saved.${readable.length<selected.length?' Some scanned pages still need OCR.':''}`);
  });
  if(!completed)setProgress('Analysis paused. Findings from completed sections are saved; retry to continue.');
  await changed().catch(e=>setLoadError(e.message));
 }
 return <section className="panel form-panel form-flow ai-panel mt" id="analyze-documents">
  <SectionHeader title="Analyze tender documents"><Badge tone="blue">AI assisted</Badge></SectionHeader>
  <p className="muted">Upload a PDF and run analysis. Findings and eligibility requirements are saved automatically.</p>
  <div className="document-upload"><label><span className="row"><Upload size={20}/>Upload a PDF</span><input aria-label="Attach tender PDF for AI" type="file" accept="application/pdf" disabled={busy} onChange={e=>void local(e.target.files?.[0])}/><small>PDF, including scans · up to 20 MB and 250 pages</small></label></div>
  <details className="transfer-section"><summary>Transfer attachments from the source portal</summary><Attachments tenderId={tender.id} onRead={()=>{void changed();}}/></details>
  {loadError?<ErrorState message={loadError} onRetry={()=>{void load().catch(e=>setLoadError(e.message));}}/>:!state?<Loading compact>Loading documents…</Loading>:null}
  {!!state?.documents.length&&<label>Document to analyze<select aria-label="Document to analyze" disabled={busy} value={docId} onChange={e=>{setDocId(e.target.value);setPageRange('');}}>{state.documents.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}</select></label>}
  {document&&<><div className="row wrap"><AIButton busy={busy} disabled={!!loadError} onClick={()=>void analyze()}>{busy?'Analyzing PDF…':'Analyze PDF'}</AIButton>{busy&&<button type="button" className="button secondary" onClick={()=>{stop.current=true;}}><Square size={14}/>Stop after this section</button>}</div>
   <details><summary>Document options</summary><div className="form-flow disclosure-body"><label>Pages to analyze (optional)<input disabled={busy} value={pageRange} onChange={e=>setPageRange(e.target.value)} placeholder="All readable pages, or a range such as 1-5,8"/></label><DocumentReview key={document.id} documentId={document.id} disabled={busy} onDraft={()=>{void load();}} onChange={()=>{void changed();}}/></div></details>
  </>}
  {progress&&<p role="status" className="info-box row">{busy&&<Spinner/>}{progress}</p>}
  {error&&<p className="error" role="alert">{error}</p>}
  {state?.findings&&<section className="form-flow section-divider" aria-label="Private findings"><SectionHeader title="Private findings"/>
   {state.findings.stale&&<p className="info-box">The tender or a document has changed. Run analysis again to update these findings.</p>}
   {state.findings.fields.map((f,i)=><div key={i}><h4>{fieldLabel(f.key)}</h4><p className="pre-wrap">{f.value}</p></div>)}
   {!!state.findings.requirements?.length&&<div className="form-flow"><h4>Eligibility requirements</h4>{state.findings.requirements.map((r,i)=><p key={i}>{r.label}</p>)}</div>}
   {!state.findings.fields.length&&!state.findings.requirements?.length&&<p>No findings were identified in the analyzed pages.</p>}
   {!!state.findings.conflicts.length&&<p className="info-box">Some document values conflict with each other or the tender listing. Resolve these differences before submitting a bid.</p>}
  </section>}
 </section>;
}
