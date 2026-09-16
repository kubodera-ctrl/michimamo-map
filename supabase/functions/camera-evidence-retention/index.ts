import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { runRetention } from './worker.mjs';
const allowedOrigin='https://machimamo-map.vercel.app';
Deno.serve(async(req:Request)=>{
 const headers={'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 const reply=(body:object,status=200)=>new Response(JSON.stringify(body),{status,headers});
 const requestOrigin=req.headers.get('origin');
 if(requestOrigin&&requestOrigin!==allowedOrigin)return reply({error:'origin_denied'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 const authorization=req.headers.get('Authorization')||'';
 if(!authorization.startsWith('Bearer '))return reply({error:'authentication_required'},401);
 try{
  const body=await req.text();if(body.length>512)return reply({error:'invalid_request'},400);
  if(body.trim()&&JSON.stringify(JSON.parse(body))!=='{}')return reply({error:'invalid_request'},400);
  const url=Deno.env.get('SUPABASE_URL')!;
  const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await caller.auth.getUser(authorization.slice(7));if(error||!data.user)return reply({error:'authentication_required'},401);
  const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  return reply(await runRetention(service));
 }catch(_){return reply({error:'cleanup_incomplete_retry_later'},500);}
});
