import { readFile, unlink } from "node:fs/promises";
import { MongoClient } from "mongodb";
export default async function teardown() {
 const {name}=JSON.parse(await readFile(".local/e2e-database.json","utf8"));
 if(name!==process.env.BIDDESK_TEST_DB || !/^biddesk_test_[a-f0-9]{16}$/.test(name)) throw new Error("Refusing cleanup outside this run's database");
 const client=new MongoClient(process.env.MONGODB_URI!);
 try { await client.db(name).dropDatabase(); await unlink(".local/e2e-database.json"); } finally { await client.close(); }
}
