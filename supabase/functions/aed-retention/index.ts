import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { runAedRetention } from './worker.mjs';
// Scheduled machine-to-machine endpoint: Single-use scheduler token replaces user JWT auth.
// Never accepts submission IDs, paths, timestamps or a user-selected cleanup scope.
Deno.serve(async(req:Request)=>{
 const reply=(body:object,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 const token=req.headers.get('x-retention-token')||'';
 if(!/^[0-9a-f]{64}$/.test(token))return reply({error:'authentication_required'},401);
 try{
  const raw=await req.text();if(raw.length>16||raw.trim()!=='{}')return reply({error:'invalid_request'},400);
  const service=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:valid,error}=await service.rpc('aed_retention_authorize',{p_token:token});
  if(error||valid!==true)return reply({error:'authentication_required'},401);
  const result=await runAedRetention(service);
  console.log(JSON.stringify({event:'aed_retention',...result}));
  return reply(result,result.failed?503:200);
 }catch(_){console.error('aed_retention_incomplete');return reply({error:'cleanup_incomplete'},500);}
});
