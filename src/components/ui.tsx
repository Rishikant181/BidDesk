"use client";
import { useEffect,useRef } from "react";
import { X,Inbox,LoaderCircle } from "lucide-react";
import { clsx } from "clsx";
export function Badge({children,tone="neutral"}:{children:React.ReactNode;tone?:string}){return <span className={clsx("badge",tone)}>{children}</span>;}
export function Empty({title,children}:{title:string;children?:React.ReactNode}){return <div className="empty"><Inbox size={30}/><h3>{title}</h3><div>{children}</div></div>;}
export function Loading(){return <div className="loading"><LoaderCircle className="spin" size={22}/> Loading your workspace…</div>;}
export function SectionHeader({title,children}:{title:string;children?:React.ReactNode}){return <div className="section-header"><h3>{title}</h3>{children}</div>;}
export function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
  return <dialog ref={ref} className={clsx("modal",wide&&"modal-wide")} onCancel={onClose}><div className="section-header"><h3>{title}</h3><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></div><div className="modal-body">{children}</div></dialog>;
}
export function download(filename:string,content:string,type="text/csv;charset=utf-8") {const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
