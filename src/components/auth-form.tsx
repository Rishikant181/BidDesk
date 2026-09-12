"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight,CheckCircle2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
export function AuthForm({signup=false}:{signup?:boolean}) {
  const router=useRouter();
  const [error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setError("");setBusy(true);const data=new FormData(e.currentTarget);
    try{
      const email=String(data.get("email")),password=String(data.get("password"));
      const result=signup ? await authClient.signUp.email({email,password,name:String(data.get("name"))}) : await authClient.signIn.email({email,password});
      if(result.error) throw new Error(result.error.message || "Sign in failed");
      router.push("/discover");router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Unable to connect");setBusy(false);}
  }
  return <div className="auth-layout"><section className="auth-story"><Link href="/" className="brand"><span className="brandmark">B</span>BidDesk<span className="tiny-pill">WORKSPACE</span></Link><div><p className="eyebrow">OPPORTUNITY, MEET PREPARATION.</p><h1>Your next contract<br/>starts with<br/><span>a clearer picture.</span></h1><p>Find the right tenders. Understand the requirements.<br/>Move every bid forward with confidence.</p><div className="story-points">{["Real notices. Original sources.","Eligibility you can explain.","Your preparation, in one place."].map(t=><p key={t}><CheckCircle2 size={18}/>{t}</p>)}</div></div><small>Built for Indian suppliers and contractors.</small><div className="orb"/></section><section className="auth-main"><form className="auth-form" onSubmit={submit}><div className="auth-icon"><ArrowUpRight/></div><p className="eyebrow">YOUR BIDDESK WORKSPACE</p><h2>{signup?"Make room for opportunity.":"Welcome back."}</h2><p className="muted">{signup?"Create an account to save tenders and prepare your bids.":"Sign in to pick up where you left off."}</p>{signup&&<label>Full name<input name="name" autoComplete="name" required maxLength={100} placeholder="Your name"/></label>}<label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@company.com"/></label><label>Password<input name="password" type="password" minLength={10} autoComplete={signup?"new-password":"current-password"} required placeholder="At least 10 characters"/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="button wide" disabled={busy}>{busy?"Connecting…":signup?"Create workspace":"Sign in"}<ArrowUpRight size={17}/></button><p className="auth-switch">{signup?"Already have an account?":"New to BidDesk?"} <Link href={signup?"/sign-in":"/sign-up"}>{signup?"Sign in":"Create an account"}</Link></p><div className="auth-note">A private workspace with real tender data.<br/>No subscription or payment required.</div></form></section></div>;
}
