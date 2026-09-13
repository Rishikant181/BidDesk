import {createWorker} from 'tesseract.js';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
import eng from '@tesseract.js-data/eng';
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>30000000)throw new Error('Input limit');}
const {pdfBase64,pages}=JSON.parse(input),task=getDocument({data:new Uint8Array(Buffer.from(pdfBase64,'base64')),verbosity:0});
let worker;
try{
 const pdf=await task.promise;if(pdf.numPages>250)throw new Error('Page limit');
 worker=await createWorker('eng',1,{langPath:eng.langPath,gzip:true,cacheMethod:'none',errorHandler:()=>{}});
 const result=[];
 for(const number of pages){const p=await pdf.getPage(number);let viewport=p.getViewport({scale:2});if(viewport.width*viewport.height>12000000)viewport=p.getViewport({scale:Math.sqrt(12000000/(viewport.width*viewport.height))*2});const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await p.render({canvasContext:canvas.getContext('2d'),viewport,canvas}).promise;const {data}=await worker.recognize(canvas.toBuffer('image/png'),{rotateAuto:true});if(data.text.length>25000)throw new Error('Text limit');result.push({page:number,text:data.text,confidence:data.confidence});}
 process.stdout.write(JSON.stringify(result));
}catch{process.exitCode=1;}finally{await worker?.terminate();await task.destroy();}
