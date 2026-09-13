import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {readZip} from '../../src/lib/attachments/zip';
it('extension keeps TenderHut credentials in the browser and validates its sender/destination',async()=>{
 let listener:(m:unknown,s:unknown,reply:(value:unknown)=>void)=>boolean=()=>false;const calls:{url:string;init:RequestInit}[]=[];
 const fakeFetch=vi.fn(async(url:string,init:RequestInit)=>{calls.push({url,init});if(url.endsWith('/auth/refresh'))return Response.json({access_token:'isolated-test-token'});if(url.endsWith('/documents/zip'))return new Response(new Uint8Array([80,75,3,4]));return Response.json({ok:true});});
 const chrome={runtime:{getPlatformInfo:async()=>({}),id:'test-extension',getURL:(p:string)=>'chrome-extension://test/'+p,onMessage:{addListener:(f:typeof listener)=>{listener=f;}}},tabs:{query:async()=>[{id:1,url:'https://tenderhut.in/app'}]},scripting:{executeScript:async({func,args}:{func:(id:string)=>Promise<unknown>;args:[string]})=>[{result:await func(...args)}]}};
 runInNewContext(readFileSync('extension/background.js','utf8'),{chrome,URL,TextDecoder,Uint8Array,atob,btoa,AbortSignal,fetch:fakeFetch,setInterval,clearInterval});
 const g={origin:'http://localhost:3000',bidId:'6716549',title:'Public test tender',token:'a'.repeat(64)},code=Buffer.from(JSON.stringify(g)).toString('base64url'),sender={id:'test-extension',url:'chrome-extension://test/popup.html'};
 const message=(m:unknown,s:unknown=sender)=>new Promise(resolve=>{expect(listener(m,s,resolve)).toBe(true);});
 expect(await message({action:'inspect',code},{id:'evil',url:'https://evil.test'})).toMatchObject({ok:false,error:'Invalid sender'});
 const bad=Buffer.from(JSON.stringify({...g,origin:'https://evil.test'})).toString('base64url');expect(await message({action:'transfer',code:bad})).toMatchObject({ok:false,error:'Invalid destination'});expect(calls).toHaveLength(0);
 expect(await message({action:'transfer',code})).toEqual({ok:true});const upload=calls.find(c=>c.url.startsWith('http://localhost'))!;expect(upload.init.headers).toEqual({'Content-Type':'application/zip','X-BidDesk-Transfer':g.token});expect(upload.init.credentials).toBe('omit');expect(JSON.stringify(upload.init)).not.toContain('isolated-test-token');expect(calls.find(c=>c.url.endsWith('/documents/zip'))!.init.headers).toEqual({Authorization:'Bearer isolated-test-token'});
});

it('ships a Chrome MV3 worker and a ZIP matching the extension source',()=>{
 const manifest=JSON.parse(readFileSync('extension/manifest.json','utf8'));
 expect(manifest.background).toEqual({service_worker:'background.js'});expect(manifest.browser_specific_settings).toBeUndefined();
 const entries=readZip(readFileSync('public/biddesk-attachment-extension.zip'));
 expect(entries.map(e=>e.name).sort()).toEqual(['README.md','background.js','manifest.json','popup.html','popup.js']);
 for(const entry of entries)expect(entry.data.equals(readFileSync('extension/'+entry.name))).toBe(true);
});
