'use client';
import {useState} from 'react';
import type {Workflow} from '@/lib/workflow';
import {bidInformationSchema,type BidInformationInput} from '@/lib/bid-information-schema';
import {uploadPdf} from './workflow';
import {Spinner,useUnsavedChanges} from './ui';
export function BidRequirementInformation({tenderId,row,onSaved}:{tenderId:string;row:Workflow['rows'][number];onSaved:()=>void}){
 const initial=bidInformationSchema.parse(row.information||{});
 const [requirementHash,setRequirementHash]=useState(row.requirementHash),[value,setValue]=useState(initial),[saved,setSaved]=useState(initial),[revision,setRevision]=useState(row.information?.revision||0),[file,setFile]=useState<File|null>(null),[fileName,setFileName]=useState(row.information?.fileName||''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
 const dirty=!!file||JSON.stringify(value)!==JSON.stringify(saved);useUnsavedChanges(dirty);
 const change=(patch:Partial<BidInformationInput>)=>{setValue(v=>({...v,...patch}));setStatus('');};
 async function save(){
  if(busy)return;setBusy(true);setError('');setStatus('');let submitted=value;
  try{
   if(file){setStatus('Uploading your PDF…');const uploaded=await uploadPdf(file);submitted={...value,fileId:uploaded.id};setValue(submitted);setFileName(file.name);setFile(null);}
   setStatus('Saving and checking this requirement…');
   const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'eligibility.requirement',tenderId,requirementId:row.requirement.id,requirementHash,revision,value:submitted})});
   const result=await response.json();
   if(response.ok||typeof result.savedRevision==='number'){
    setRevision(response.ok?result.revision:result.savedRevision);setSaved(submitted);setStatus(response.ok?'Information saved for this bid. Requirement rechecked.':'Information saved for this bid. Retry to complete the check.');
    window.dispatchEvent(new Event('workflow-change'));onSaved();
   }
   if(!response.ok)throw new Error(result.error||'Could not recheck this requirement.');
  }catch(e){setError(e instanceof Error?e.message:'Could not save this information.');setStatus(s=>s.includes('Information saved')?s:'');}
  finally{setBusy(false);}
 }
 return <details><summary>{row.information?'Edit bid-only information':'Add missing information'}</summary><div className="form-flow disclosure-body">
  <p className="muted">Saved only for this bid. Your details and readable PDF text are used to recheck this requirement.</p>
  <label>Details for this requirement<textarea aria-label="Details for this requirement" rows={4} maxLength={6000} disabled={busy} value={value.text} onChange={e=>change({text:e.target.value})} placeholder="Enter the information needed for this requirement, such as your dedicated support number and support hours."/></label>
  {row.requirement.type==='turnover'&&<div className="form-grid"><label>Turnover for this bid (INR)<input type="number" min="0" disabled={busy} value={value.amount??''} onChange={e=>change({amount:e.target.value?Number(e.target.value):null})}/></label><label>Financial period for this bid<input disabled={busy} value={value.period} placeholder={row.requirement.period||'FY 2025–26'} onChange={e=>change({period:e.target.value})}/></label><p className="muted">Attach the financial evidence PDF for these figures.</p></div>}
  {row.requirement.type==='certification'&&<label>Certificate expiry for this bid<input type="date" disabled={busy} value={value.expiresAt} onChange={e=>change({expiresAt:e.target.value})}/></label>}
  {value.fileId&&<div className="row wrap"><a className="grow pre-wrap" href={'/api/files?id='+encodeURIComponent(value.fileId)} target="_blank" rel="noreferrer">Open {fileName||'attached PDF'}</a><button type="button" className="text-button" disabled={busy} onClick={()=>{change({fileId:''});setFile(null);setFileName('');}}>Remove attachment</button></div>}
  <label>{value.fileId?'Replace evidence PDF':'Attach evidence PDF (optional)'}<input aria-label="Bid-only evidence PDF" type="file" accept="application/pdf" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]||null);setStatus('');}}/><small>Use a text-readable PDF excerpt, up to 20 MB and 20,000 extracted characters.</small></label>
  {((row.information?.revision||0)!==revision||row.requirementHash!==requirementHash)&&!busy&&<div className="form-flow"><p className="info-box">A newer saved version is available.</p><button type="button" className="button secondary" onClick={()=>{const latest=bidInformationSchema.parse(row.information||{});setValue(latest);setSaved(latest);setRequirementHash(row.requirementHash);setRevision(row.information?.revision||0);setFileName(row.information?.fileName||'');setFile(null);setError('');setStatus('');}}>Load saved information</button></div>}
  <button type="button" className="button" disabled={busy||!row.information&&!value.text.trim()&&!value.fileId&&!file&&value.amount===null&&!value.expiresAt} aria-busy={busy} onClick={()=>void save()}>{busy?<><Spinner/>Checking this requirement…</>:'Save & recheck this requirement'}</button>
  {status&&<p role="status" className="info-box">{status}</p>}{error&&<p role="alert" className="error">{error}</p>}
 </div></details>;
}
