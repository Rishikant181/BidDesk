import { readFile,writeFile,mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { collectIsro,parseIsro } from "../src/lib/ingestion";

async function main() {
  const args=process.argv.slice(2); const at=args.indexOf("--html");
  const records=at>=0 ? parseIsro(await readFile(args[at+1],"utf8")) : await collectIsro();
  const retrievedAt=new Date().toISOString();
  await mkdir("data/public",{recursive:true});
  const output=JSON.stringify({source:"ISRO",sourceUrl:"https://www.isro.gov.in/Tenders.html",retrievedAt,records},null,2)+"\n";
  await writeFile("data/public/isro-tenders.json",output);
  await writeFile("data/public/manifest.json",JSON.stringify({retrievedAt,count:records.length,source:"ISRO",url:"https://www.isro.gov.in/Tenders.html",attribution:"Department of Space / Indian Space Research Organisation",policy:"https://www.isro.gov.in/Copyright_Policy.html",sha256:createHash("sha256").update(output).digest("hex"),notes:"Public notice metadata, not complete tender-document extraction. Advertised windows may differ from individual lot deadlines. No fictional records."},null,2)+"\n");
  console.log(`Collected ${records.length} official notice records. No database writes performed.`);
}
main().catch(()=>{console.error("Collection failed; existing snapshot was not replaced. Verify official source access and structure.");process.exitCode=1;});
