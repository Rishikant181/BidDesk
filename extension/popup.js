/* global chrome */
let code='',origin='';
const status=document.getElementById('status'),send=document.getElementById('send'),inspect=document.getElementById('inspect'),input=document.getElementById('code'),destination=document.getElementById('destination');
input.oninput=()=>{code='';origin='';send.hidden=true;destination.textContent='';status.textContent='';};
inspect.onclick=async()=>{
 inspect.disabled=true;input.disabled=true;send.hidden=true;status.textContent='';destination.textContent='';
 try{
  const candidate=input.value.trim(),g=await chrome.runtime.sendMessage({action:'inspect',code:candidate});
  if(!g||g.ok===false)throw Error(g?.error||'Invalid pairing code.');
  code=candidate;origin=g.origin;destination.textContent=`Tender: ${g.title}. Destination: ${g.origin}. TenderHut bid: ${g.bidId}.`;send.hidden=false;
 }catch(e){code='';origin='';status.textContent=e.message||'Invalid pairing code. Generate a new code inside BidDesk.';}
 finally{inspect.disabled=false;input.disabled=false;}
};
send.onclick=async()=>{
 send.disabled=true;inspect.disabled=true;input.disabled=true;status.textContent='Downloading and transferring. Keep this popup and the TenderHut tab open until the transfer finishes.';
 try{
  // Request from the click gesture, before messaging the service worker.
  if(!origin||!await chrome.permissions.request({origins:[origin+'/*']})){status.textContent='Site access was not granted. Paste your pairing code again to retry.';return;}
  const r=await chrome.runtime.sendMessage({action:'transfer',code});
  status.textContent=r?.ok?'Transfer complete. Return to BidDesk and choose Review transferred files.':r?.error||'Transfer failed. Generate a new code and retry.';
 }catch{status.textContent='Transfer interrupted. Check Review transferred files in BidDesk before generating a new code and retrying.';}
 finally{input.value='';code='';origin='';send.hidden=true;send.disabled=false;inspect.disabled=false;input.disabled=false;destination.textContent='';}
};
