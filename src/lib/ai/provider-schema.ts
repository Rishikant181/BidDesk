import {z} from "zod";
// Gemini accepts a JSON Schema subset. Full bounds still apply when Zod parses
// the returned value; unsupported string constraints must not reach the API.
export function providerSchema(schema:z.ZodType):Record<string,unknown>{
 const walk=(node:unknown):unknown=>{
  if(Array.isArray(node))return node.map(walk);
  if(!node||typeof node!=="object")return node;
  const result:Record<string,unknown>={};
  for(const [key,value] of Object.entries(node)){
   if(["$schema","minLength","maxLength","exclusiveMinimum","exclusiveMaximum","minimum","maximum","minItems","maxItems"].includes(key))continue;
   result[key]=key==="properties"?Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([name,definition])=>[name,walk(definition)])):walk(value);
  }
  return result;
 };
 return walk(z.toJSONSchema(schema)) as Record<string,unknown>;
}
