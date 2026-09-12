"use client";
import { createContext,useContext } from "react";
import type { Tender,Company,Bid,Notification } from "@/lib/schemas";
export type Workspace={user:{id:string;name:string;email:string};company:Company;tenders:Tender[];bids:Bid[];favorites:string[];notifications:Notification[]};
export async function api<T=Record<string,unknown>>(body:Record<string,unknown>):Promise<T>{const res=await fetch("/api/data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw new Error(data.error || "Request failed");return data;}
export async function read<T>(params="",signal?:AbortSignal):Promise<T>{const res=await fetch("/api/data?"+params,{cache:"no-store",signal});const data=await res.json();if(!res.ok)throw new Error(data.error || "Request failed");return data;}
export const WorkspaceContext=createContext<{data:Workspace;refresh:()=>Promise<void>;notify:(text:string,error?:boolean)=>void}|null>(null);
export function useWorkspace(){const v=useContext(WorkspaceContext);if(!v)throw new Error("Workspace context missing");return v;}
export function useAction(){const {refresh,notify}=useWorkspace();return async(body:Record<string,unknown>,message="Saved")=>{try{const result=await api(body);await refresh();notify(message);return result;}catch(e){notify(e instanceof Error?e.message:"Unable to save",true);return null;}};}
