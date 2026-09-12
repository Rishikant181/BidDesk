import Link from "next/link";
import { headers } from "next/headers";
import { redirect,notFound } from "next/navigation";
import { configurationReady } from "@/lib/db";
import { getAuth } from "@/lib/auth";
import { Application } from "@/components/application";
export const dynamic="force-dynamic";
export default async function Workspace({params}:{params:Promise<{path:string[]}>}) {
  const {path}=await params;
  if(!["overview","discover","tenders","compare","bids","calendar","company"].includes(path[0])) notFound();
  if(path[0]==="tenders" ? path.length!==2 || !/^th-\d+$/.test(path[1]) : path[0]==="bids" ? path.length>2 : path.length!==1) notFound();
  if(!configurationReady()) redirect("/setup");
  let session;
  try{session=await getAuth().api.getSession({headers:await headers()});}catch{return <main className="setup"><h1>Atlas is unavailable</h1><p>Check your local connection, database access, and Atlas IP access list, then reload this page.</p><Link className="button" href="/overview">Try again</Link></main>;}
  if(!session) redirect("/sign-in");
  return <Application path={path}/>;
}
