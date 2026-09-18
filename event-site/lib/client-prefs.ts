export const PREF_KEYS = {
  savedEvents:'machiibe_saved_events_v1',
  hiddenEvents:'machiibe_hidden_events_v1',
  viewedEvents:'machiibe_viewed_events_v1',
  savedSearches:'machiibe_saved_searches_v1',
  lastVisit:'machiibe_last_visit_v1',
  previousVisitSession:'machiibe_previous_visit_session_v1'
} as const;

export type SavedSearch={
  id:string;
  label:string;
  url:string;
  createdAt:string;
};

function canUseStorage() {
  return typeof window !== 'undefined';
}

export function readStringArray(key:string):string[] {
  if(!canUseStorage()) return [];
  try {
    const parsed=JSON.parse(localStorage.getItem(key)||'[]');
    return Array.isArray(parsed) ? parsed.filter((v)=>typeof v==='string') : [];
  } catch { return []; }
}

export function writeStringArray(key:string,values:string[]) {
  if(!canUseStorage()) return;
  localStorage.setItem(key,JSON.stringify([...new Set(values)]));
  window.dispatchEvent(new CustomEvent('machiibe:prefs'));
}

export function toggleInArray(key:string,value:string):boolean {
  const current=new Set(readStringArray(key));
  if(current.has(value)) current.delete(value); else current.add(value);
  writeStringArray(key,[...current]);
  return current.has(value);
}

export function setViewed(slug:string) {
  if(!canUseStorage()) return;
  try {
    const parsed=JSON.parse(localStorage.getItem(PREF_KEYS.viewedEvents)||'{}');
    const map=parsed && typeof parsed==='object' ? parsed : {};
    map[slug]=new Date().toISOString();
    localStorage.setItem(PREF_KEYS.viewedEvents,JSON.stringify(map));
  } catch {}
}

export function wasViewed(slug:string):boolean {
  if(!canUseStorage()) return false;
  try {
    const parsed=JSON.parse(localStorage.getItem(PREF_KEYS.viewedEvents)||'{}');
    return Boolean(parsed?.[slug]);
  } catch { return false; }
}

export function getPreviousVisit():string|null {
  if(!canUseStorage()) return null;
  return sessionStorage.getItem(PREF_KEYS.previousVisitSession)
    || localStorage.getItem(PREF_KEYS.lastVisit);
}

export function beginVisitSession() {
  if(!canUseStorage()) return;
  if(sessionStorage.getItem(PREF_KEYS.previousVisitSession)!==null) return;
  const previous=localStorage.getItem(PREF_KEYS.lastVisit)||'';
  sessionStorage.setItem(PREF_KEYS.previousVisitSession,previous);
  window.setTimeout(()=>localStorage.setItem(PREF_KEYS.lastVisit,new Date().toISOString()),1500);
}

export function readSavedSearches():SavedSearch[] {
  if(!canUseStorage()) return [];
  try {
    const parsed=JSON.parse(localStorage.getItem(PREF_KEYS.savedSearches)||'[]');
    return Array.isArray(parsed) ? parsed.filter((v)=>v && typeof v.url==='string' && typeof v.label==='string') : [];
  } catch { return []; }
}

export function saveCurrentSearch(label:string,url:string) {
  if(!canUseStorage()) return;
  const current=readSavedSearches();
  const normalized=url.replace(/([?&])page=\d+(&|$)/,'$1').replace(/[?&]$/,'');
  const existing=current.find((item)=>item.url===normalized);
  if(existing) return;
  const next=[{id:String(Date.now()),label,url:normalized,createdAt:new Date().toISOString()},...current].slice(0,20);
  localStorage.setItem(PREF_KEYS.savedSearches,JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('machiibe:prefs'));
}

export function deleteSavedSearch(id:string) {
  if(!canUseStorage()) return;
  localStorage.setItem(PREF_KEYS.savedSearches,JSON.stringify(readSavedSearches().filter((item)=>item.id!==id)));
  window.dispatchEvent(new CustomEvent('machiibe:prefs'));
}
