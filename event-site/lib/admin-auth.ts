import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE='machiibe_admin_session';
const MAX_AGE_SECONDS=60*60*12;

function digest(value:string){
  return createHash('sha256').update(value).digest();
}

function sign(payload:string){
  const secret=process.env.MACHIIBE_ADMIN_SESSION_SECRET || '';
  if(!secret) return '';
  return createHmac('sha256',secret).update(payload).digest('hex');
}

export function adminConfigReady(){
  const password=process.env.MACHIIBE_ADMIN_PASSWORD || '';
  const sessionSecret=process.env.MACHIIBE_ADMIN_SESSION_SECRET || '';
  return password.length>=16 && sessionSecret.length>=32;
}

export function validateAdminPassword(input:string){
  const expected=process.env.MACHIIBE_ADMIN_PASSWORD || '';
  if(!expected || !input) return false;
  const a=digest(input);
  const b=digest(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}

export function createAdminSessionToken(){
  const exp=Math.floor(Date.now()/1000)+MAX_AGE_SECONDS;
  const payload=`v1.${exp}`;
  const signature=sign(payload);
  return signature ? `${payload}.${signature}` : '';
}

export function validateAdminSession(value:string|undefined|null){
  if(!value) return false;
  const parts=value.split('.');
  if(parts.length!==3 || parts[0]!=='v1') return false;
  const exp=Number(parts[1]);
  if(!Number.isFinite(exp) || exp<=Math.floor(Date.now()/1000)) return false;
  const payload=`${parts[0]}.${parts[1]}`;
  const expected=sign(payload);
  if(!expected) return false;
  const a=Buffer.from(parts[2]);
  const b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}

export const ADMIN_SESSION_MAX_AGE=MAX_AGE_SECONDS;
