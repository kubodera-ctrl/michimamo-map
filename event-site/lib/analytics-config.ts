export function normalizeGaMeasurementId(value:string|undefined|null){
  const id=(value||'').trim().toUpperCase();
  return /^G-[A-Z0-9]{4,20}$/.test(id) ? id : '';
}
