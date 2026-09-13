import {afterEach,expect,it,vi} from 'vitest';
import {attachmentOrigin} from '../../src/lib/attachments/origin';
afterEach(()=>vi.unstubAllEnvs());
const request=(origin:string)=>new Request(origin+'/api/attachments');
it('pairs the configured HTTPS site and accepts a trailing slash in configuration',()=>{
 vi.stubEnv('BETTER_AUTH_URL','https://biddesk.example.test/');
 expect(attachmentOrigin(request('https://biddesk.example.test'))).toBe('https://biddesk.example.test');
 expect(()=>attachmentOrigin(request('https://other.example.test'))).toThrow('configured BETTER_AUTH_URL');
});
it('does not accept forwarded headers as authority for a destination',()=>{
 vi.stubEnv('BETTER_AUTH_URL','https://biddesk.example.test');
 expect(()=>attachmentOrigin(new Request('https://other.example.test/api/attachments',{headers:{'x-forwarded-host':'biddesk.example.test'}}))).toThrow('configured BETTER_AUTH_URL');
});
it('requires explicit HTTPS configuration for hosted transfers',()=>{
 for(const value of ['', 'http://biddesk.example.test','https://user:pass@biddesk.example.test','https://biddesk.example.test/path','invalid']){
  vi.stubEnv('BETTER_AUTH_URL',value);
  expect(()=>attachmentOrigin(request('https://biddesk.example.test'))).toThrow('Configure BETTER_AUTH_URL');
 }
});
it('retains local development without allowing a remote HTTP destination',()=>{
 vi.stubEnv('BETTER_AUTH_URL','');
 expect(attachmentOrigin(request('http://localhost:3000'))).toBe('http://localhost:3000');
 expect(attachmentOrigin(request('http://127.0.0.1:3001'))).toBe('http://127.0.0.1:3001');
 expect(()=>attachmentOrigin(request('http://other.example.test'))).toThrow('Configure BETTER_AUTH_URL');
});
