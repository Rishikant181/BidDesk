"use client";
import { useEffect,useRef,useState,useId,useSyncExternalStore } from "react";
import { X,Inbox,LoaderCircle,AlertCircle,Save } from "lucide-react";
import { clsx } from "clsx";
export function Badge({children,tone="neutral"}:{children:React.ReactNode;tone?:string}){return <span className={clsx("badge",tone)}>{typeof children==='string'?children.replace(/tenderhu(?:n)?t/gi,'Public notice'):children}</span>;}
export function Empty({title,children}:{title:string;children?:React.ReactNode}){return <div className="empty"><Inbox size={30}/><h3>{title}</h3><div>{children}</div></div>;}
export function Spinner(){return <LoaderCircle className="spin" size={18} aria-hidden="true"/>;}
export function Loading({children="Loading your workspace…",compact=false}:{children?:React.ReactNode;compact?:boolean}){return <div className={compact?"loading compact":"loading"} role="status"><Spinner/>{children}</div>;}
export function ErrorState({message,onRetry}:{message:string;onRetry?:()=>void}){return <div className="error-state"><p className="error" role="alert"><AlertCircle size={20} aria-hidden="true"/>{message}</p>{onRetry&&<button type="button" className="button secondary" onClick={onRetry}>Try again</button>}</div>;}
export function AsyncButton({onClick,children,pending="Working…",className="button secondary",disabled=false,...props}:Omit<React.ButtonHTMLAttributes<HTMLButtonElement>,"onClick">&{onClick:()=>Promise<unknown>;pending?:string}){const [busy,setBusy]=useState(false),lock=useRef(false);return <button {...props} type={props.type||"button"} className={className} disabled={disabled||busy} aria-busy={busy} onClick={async()=>{if(lock.current)return;lock.current=true;setBusy(true);try{await onClick();}finally{lock.current=false;setBusy(false);}}}>{busy?<><Spinner/>{pending}</>:children}</button>;}
export function SaveBar({dirty,busy,label="Save changes",onSave}:{dirty:boolean;busy:boolean;label?:string;onSave?:()=>void}){return <div className="save-bar"><span role="status" className={dirty?"unsaved":"muted"}>{busy?"Saving your changes…":dirty?"Unsaved changes":"All changes saved"}</span><button type={onSave?"button":"submit"} className="button" disabled={busy||!dirty} onClick={onSave} aria-busy={busy}>{busy?<Spinner/>:<Save size={18}/>} {busy?"Saving…":label}</button></div>;}
// Protect edits when following links or closing/reloading the page. The browser
// owns the unload prompt; normal in-app links use the same explicit decision.
export function useUnsavedChanges(dirty:boolean){useEffect(()=>{if(!dirty)return;const unload=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};const click=(e:MouseEvent)=>{const a=(e.target as Element).closest?.("a[href]") as HTMLAnchorElement|null;if(!a||a.hasAttribute("download")||a.target==="_blank"||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0||a.href===location.href||(new URL(a.href).pathname===location.pathname&&new URL(a.href).search===location.search&&new URL(a.href).hash))return;if(!window.confirm("You have unsaved changes. Leave without saving?")){e.preventDefault();e.stopPropagation();}};window.addEventListener("beforeunload",unload);document.addEventListener("click",click,true);return()=>{window.removeEventListener("beforeunload",unload);document.removeEventListener("click",click,true);};},[dirty]);}

export function SectionHeader({title,children}:{title:string;children?:React.ReactNode}){return <div className="section-header"><h3>{title}</h3>{children}</div>;}
export function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null),titleId=useId();
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
  return <dialog ref={ref} aria-labelledby={titleId} className={clsx("modal",wide&&"modal-wide")} onCancel={onClose}><div className="section-header"><h3 id={titleId}>{title}</h3><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></div><div className="modal-body">{children}</div></dialog>;
}
export function download(filename:string,content:string,type="text/csv;charset=utf-8") {const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export function useMobileLayout(){return useSyncExternalStore(callback=>{const media=window.matchMedia("(max-width:760px)");media.addEventListener("change",callback);return()=>media.removeEventListener("change",callback);},()=>window.matchMedia("(max-width:760px)").matches,()=>false);}
