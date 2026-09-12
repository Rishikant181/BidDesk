import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
it('extension keeps TenderHut credentials in the browser and validates its sender/destination',async()=>{
 let listener:(m:unknown,s:unknown)=>Promise<unknown>=async()=>{};const calls:{url:string;init:RequestInit}[]=[];
 const fakeFetch=vi.fn(async(url:string,init:RequestInit)=>{calls.push({url,init});if(url.endsWith('/auth/refresh'))return Response.json({access_token:'isolated-test-token'});if(url.endsWith('/documents/zip'))return new Response(new Uint8Array([80,75,3,4]));return Response.json({ok:true});});
 const browser={runtime:{id:'test-extension',getURL:(p:string)=>'moz-extension://test/'+p,onMessage:{addListener:(f:typeof listener)=>{listener=f;}}},tabs:{query:async()=>[{id:1,url:'https://tenderhut.in/app'}]},scripting:{executeScript:async({func,args}:{func:(id:string)=>Promise<unknown>;args:[string]})=>[{result:await func(...args)}]}};
 runInNewContext(readFileSync('extension/background.js','utf8'),{browser,URL,TextDecoder,Uint8Array,atob,btoa,AbortSignal,fetch:fakeFetch});
 const g={origin:'http://localhost:3000',bidId:'6716549',title:'Public test tender',token:'a'.repeat(64)},code=Buffer.from(JSON.stringify(g)).toString('base64url'),sender={id:'test-extension',url:'moz-extension://test/popup.html'};
 await expect(listener({action:'inspect',code},{id:'evil',url:'https://evil.test'})).rejects.toThrow();
 const bad=Buffer.from(JSON.stringify({...g,origin:'https://evil.test'})).toString('base64url');await expect(listener({action:'transfer',code:bad},sender)).rejects.toThrow();
 expect(await listener({action:'transfer',code},sender)).toEqual({ok:true});const upload=calls.find(c=>c.url.startsWith('http://localhost'))!;expect(upload.init.headers).toEqual({'Content-Type':'application/zip','X-BidDesk-Transfer':g.token});expect(upload.init.credentials).toBe('omit');expect(JSON.stringify(upload.init)).not.toContain('isolated-test-token');expect(calls.find(c=>c.url.endsWith('/documents/zip'))!.init.headers).toEqual({Authorization:'Bearer isolated-test-token'});
});
