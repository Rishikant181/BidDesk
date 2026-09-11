import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getClient, configurationReady } from "./db";
function createAuth() {
  return betterAuth({
    database: mongodbAdapter(getClient().db(process.env.MONGODB_DB || "biddesk"),{client:getClient()}),
    secret:process.env.BETTER_AUTH_SECRET, baseURL:process.env.BETTER_AUTH_URL || "http://localhost:3000",
    emailAndPassword:{enabled:true,minPasswordLength:10},
    rateLimit:{enabled:true,storage:"database",window:60,max:30},
    session:{expiresIn:60*60*24*7},
  });
}
let auth: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  if (!configurationReady()) throw new Error("Configure Atlas and a 32-character BETTER_AUTH_SECRET in .env.local.");
  if (!auth) auth = createAuth();
  return auth;
}
