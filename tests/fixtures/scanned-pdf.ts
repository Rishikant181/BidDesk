import {createCanvas} from '@napi-rs/canvas';
import {deflateSync} from 'node:zlib';
// A raster-only fixture: there is no PDF text for the extractor to recover.
export function scannedPdf(rotated=false){
 const canvas=createCanvas(1000,700),ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1000,700);ctx.fillStyle='black';ctx.font='32px sans-serif';
 if(rotated){ctx.translate(500,350);ctx.rotate(-Math.PI/2);ctx.translate(-350,-500);}
 ctx.fillText('LABORATORY EQUIPMENT',50,90);ctx.fillText('Certificate number 12345',50,160);ctx.fillText('Item                 Quantity',50,250);ctx.fillText('Instruments       120',50,310);ctx.fillText('Sensors              25',50,370);
 const pixels=ctx.getImageData(0,0,1000,700).data,rgb=Buffer.alloc(1000*700*3);for(let i=0,j=0;i<pixels.length;i+=4){rgb[j++]=pixels[i];rgb[j++]=pixels[i+1];rgb[j++]=pixels[i+2];}
 const image=deflateSync(rgb),content='q 500 0 0 350 0 0 cm /Scan Do Q';
 const objects=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 350] /Resources << /XObject << /Scan 5 0 R >> >> /Contents 4 0 R >>'),Buffer.from(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`),Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1000 /Height 700 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.length} >>\nstream\n`),image,Buffer.from('\nendstream')])];
 const parts=[Buffer.from('%PDF-1.4\n')],offsets=[0];let length=parts[0].length;for(let i=0;i<objects.length;i++){offsets.push(length);const object=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),objects[i],Buffer.from('\nendobj\n')]);parts.push(object);length+=object.length;}
 parts.push(Buffer.from(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${length}\n%%EOF`));return Buffer.concat(parts);
}
