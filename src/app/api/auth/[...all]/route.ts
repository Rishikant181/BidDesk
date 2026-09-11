import { getAuth } from "@/lib/auth";
export const runtime="nodejs";
async function handler(req: Request) {
  try { return await getAuth().handler(req); }
  catch { return Response.json({message:"Authentication is unavailable. Check Atlas and the local authentication configuration."},{status:503}); }
}
export { handler as GET, handler as POST };
