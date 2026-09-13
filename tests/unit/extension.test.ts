import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {readZip} from '../../src/lib/attachments/zip';
it('extension keeps TenderHut credentials in the browser and validates its sender/destination',async()=>{
 let listener:(m:unknown,s:unknown,reply:(value:unknown)=>void)=>boolean=()=>false;const calls:{url:string;init:RequestInit}[]=[];
 const fakeFetch=vi.fn(async(url:string,init:RequestInit)=>{calls.push({url,init});if(url.endsWith('/auth/refresh'))return Response.json({access_token:'isolated-test-token'});if(url.endsWith('/documents/zip'))return new Response(new Uint8Array([80,75,3,4]));return Response.json({ok:true});});
 const contains=vi.fn(async({origins}:{origins:string[]})=>origins[0]==='http://localhost:3000/*');
 const chrome={permissions:{contains},runtime:{getPlatformInfo:async()=>({}),id:'test-extension',getURL:(p:string)=>'chrome-extension://test/'+p,onMessage:{addListener:(f:typeof listener)=>{listener=f;}}},tabs:{query:async()=>[{id:1,url:'https://tenderhut.in/app'}]},scripting:{executeScript:async({func,args}:{func:(id:string)=>Promise<unknown>;args:[string]})=>[{result:await func(...args)}]}};
 runInNewContext(readFileSync('extension/background.js','utf8'),{chrome,URL,TextDecoder,Uint8Array,atob,btoa,AbortSignal,fetch:fakeFetch,setInterval,clearInterval});
 const g={origin:'http://localhost:3000',bidId:'6716549',title:'Public test tender',token:'a'.repeat(64)},code=Buffer.from(JSON.stringify(g)).toString('base64url'),sender={id:'test-extension',url:'chrome-extension://test/popup.html'};
 const message=(m:unknown,s:unknown=sender)=>new Promise(resolve=>{expect(listener(m,s,resolve)).toBe(true);});
 expect(await message({action:'inspect',code},{id:'evil',url:'https://evil.test'})).toMatchObject({ok:false,error:'Invalid sender'});
 const bad=Buffer.from(JSON.stringify({...g,origin:'http://evil.test'})).toString('base64url');expect(await message({action:'transfer',code:bad})).toMatchObject({ok:false,error:'Invalid destination'});expect(calls).toHaveLength(0);
 const hosted=Buffer.from(JSON.stringify({...g,origin:'https://biddesk.example.test'})).toString('base64url');
 expect(await message({action:'inspect',code:hosted})).toMatchObject({origin:'https://biddesk.example.test'});
 expect(await message({action:'transfer',code:hosted})).toMatchObject({ok:false,error:'Allow access to this BidDesk site before transferring.'});expect(calls).toHaveLength(0);
 contains.mockResolvedValue(true);
 expect(await message({action:'transfer',code:hosted})).toEqual({ok:true});
 expect(calls.find(c=>c.url.startsWith('https://biddesk.example.test'))!.init.credentials).toBe('omit');
 for(const origin of ['https://user:pass@biddesk.example.test','https://biddesk.example.test/path','https://biddesk.example.test?next=evil','https://biddesk.example.test#fragment','file:///tmp/test']){
  expect(await message({action:'inspect',code:Buffer.from(JSON.stringify({...g,origin})).toString('base64url')})).toMatchObject({ok:false,error:'Invalid destination'});
 }
 expect(await message({action:'transfer',code})).toEqual({ok:true});const upload=calls.find(c=>c.url.startsWith('http://localhost'))!;expect(upload.init.headers).toEqual({'Content-Type':'application/zip','X-BidDesk-Transfer':g.token});expect(upload.init.credentials).toBe('omit');expect(JSON.stringify(upload.init)).not.toContain('isolated-test-token');expect(calls.find(c=>c.url.endsWith('/documents/zip'))!.init.headers).toEqual({Authorization:'Bearer isolated-test-token'});
});

it('ships a Chrome MV3 worker and a ZIP matching the extension source',()=>{
 const manifest=JSON.parse(readFileSync('extension/manifest.json','utf8'));
 expect(manifest.optional_host_permissions).toEqual(['https://*/*']);expect(manifest.host_permissions).not.toContain('https://*/*');
 expect(manifest.background).toEqual({service_worker:'background.js'});expect(manifest.browser_specific_settings).toBeUndefined();
 const entries=readZip(readFileSync('public/biddesk-attachment-extension.zip'));
 expect(entries.map(e=>e.name).sort()).toEqual(['README.md','background.js','manifest.json','popup.html','popup.js']);
 for(const entry of entries)expect(entry.data.equals(readFileSync('extension/'+entry.name))).toBe(true);
});

it('requests only the inspected site from the transfer click and stops on permission denial',async()=>{
 type Element={value:string;hidden:boolean;disabled:boolean;textContent:string;onclick:()=>Promise<void>;oninput:()=>void};
 const elements=Object.fromEntries(['status','send','inspect','code','destination'].map(id=>[id,{value:'',hidden:false,disabled:false,textContent:'',onclick:async()=>{},oninput:()=>{}}])) as Record<string,Element>;
 const events:string[]=[];
 const request=vi.fn(async(options:unknown)=>{events.push('permission');expect(options).toEqual({origins:['https://biddesk.example.test/*']});return false;});
 const sendMessage=vi.fn(async(message:{action:string})=>{events.push(message.action);return message.action==='inspect'?{title:'Tender',bidId:'123',origin:'https://biddesk.example.test'}:{ok:true};});
 runInNewContext(readFileSync('extension/popup.js','utf8'),{document:{getElementById:(id:string)=>elements[id]},chrome:{permissions:{request},runtime:{sendMessage}}});
 elements.code.value='test-pairing-code';await elements.inspect.onclick();await elements.send.onclick();
 expect(events).toEqual(['inspect','permission']);expect(elements.status.textContent).toContain('not granted');expect(elements.send.hidden).toBe(true);
 request.mockImplementation(async()=>{events.push('permission');return true;});elements.code.value='test-pairing-code';await elements.inspect.onclick();await elements.send.onclick();
 expect(events.slice(-3)).toEqual(['inspect','permission','transfer']);expect(elements.status.textContent).toContain('Transfer complete');
 elements.code.value='test-pairing-code';await elements.inspect.onclick();elements.code.oninput();expect(elements.send.hidden).toBe(true);expect(elements.destination.textContent).toBe('');
});
