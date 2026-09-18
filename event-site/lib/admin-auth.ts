import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE='machiibe_admin_session';

function digest(value:string){
  return createHash('sha256').update(value).digest();
}

export function adminConfigReady(){
  return Boolean(process.env.MACHIIBE_ADMIN_PASSWORD && process.env.MACHIIBE_ADMIN_SESSION_SECRET);
}

export function validateAdminPassword(input:string){
  const expected=process.env.MACHIIBE_ADMIN_PASSWORD || '';
  if(!expected || !input) return false;
  const a=digest(input);
  const b=digest(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}

export function adminSessionToken(){
  const secret=process.env.MACHIIBE_ADMIN_SESSION_SECRET || '';
  if(!secret) return '';
  return createHmac('sha256',secret).update('machiibe-admin-v1').digest('hex');
}

export function validateAdminSession(value:string|undefined|null){
  const expected=adminSessionToken();
  if(!expected || !value) return false;
  const a=Buffer.from(value);
  const b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}
