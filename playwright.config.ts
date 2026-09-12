import { defineConfig } from "@playwright/test";
import { config } from "dotenv";
import { randomBytes } from "node:crypto";
config({path:".env.local",quiet:true});
// Every run gets a fresh database; never reuse the configured demo database.
process.env.BIDDESK_TEST_DB ||= `biddesk_test_${randomBytes(8).toString("hex")}`;
const production=process.env.BIDDESK_E2E_PRODUCTION === "1";
export default defineConfig({
 testDir:"./tests/e2e",workers:1,timeout:120000,expect:{timeout:15000},
 use:{baseURL:"http://localhost:3001",viewport:{width:1440,height:1000},trace:"retain-on-failure",screenshot:"only-on-failure"},
 globalSetup:"./tests/e2e/setup.ts",globalTeardown:"./tests/e2e/teardown.ts",
 webServer:{command:production?"npm start -- --port 3001":"npm run dev -- --port 3001",url:"http://localhost:3001/sign-in",reuseExistingServer:false,timeout:120000,env:{BIDDESK_AI_TEST_STUB:"1",BIDDESK_SOURCE_TEST_FIXTURES:"1",MONGODB_DB:process.env.BIDDESK_TEST_DB,BETTER_AUTH_URL:"http://localhost:3001",BIDDESK_DIST_DIR:production?".next":".next-test"}},
});
