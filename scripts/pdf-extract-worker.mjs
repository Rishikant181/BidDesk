import {parentPort,workerData} from 'node:worker_threads';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
// Use an explicit string envelope: the web runtime can serialize typed arrays
// into plain numeric-key objects across the Worker boundary.
const encoded=workerData?.pdfBase64;
if(typeof encoded!=="string"||!encoded.length||encoded.length>Math.ceil(20*1024*1024/3)*4)throw new Error("Invalid PDF worker input.");
const bytes=Uint8Array.from(Buffer.from(encoded,"base64"));
if(!bytes.length||bytes.length>20*1024*1024)throw new Error("Invalid PDF worker size.");
const task=getDocument({data:bytes,verbosity:0});
try {const pdf=await task.promise;if(pdf.numPages>250)throw new Error('PDF exceeds 250 pages.');const pages=[],warnings=[];let total=0;for(let i=1;i<=pdf.numPages;i++){const content=await(await pdf.getPage(i)).getTextContent();const text=content.items.map(x=>'str' in x?x.str+(x.hasEOL?'\n':' '):'').join('');if(text.length>25000)throw new Error('A page exceeds the text limit.');total+=text.length;if(total>700000)throw new Error('Document exceeds 700,000 characters.');if(text.trim().length<30)warnings.push(`Page ${i} has little or no readable text; visual content was not analyzed.`);pages.push({page:i,text});}parentPort.postMessage({pages,totalPages:pdf.numPages,warnings});}catch{parentPort.postMessage({error:'PDF could not be read within the page/text limits. Use a readable excerpt or enter details manually.'});}finally{await task.destroy();}
