import { mkdir, writeFile } from "node:fs/promises";
import { getDb, ensureIndexes, getClient } from "../../src/lib/db";
export default async function setup() {
 const name=process.env.BIDDESK_TEST_DB;
 if(!name || !/^biddesk_test_[a-f0-9]{16}$/.test(name)) throw new Error("Missing isolated test database");
 process.env.MONGODB_DB=name;
 const db=await getDb();
 if((await db.listCollections().toArray()).length) throw new Error("Refusing to use a nonempty test database");
 await ensureIndexes();
 await mkdir(".local",{recursive:true});await writeFile(".local/e2e-database.json",JSON.stringify({name}));
 await getClient().close();
}
