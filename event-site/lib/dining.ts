import { getPublicSupabase } from './supabase';

export const DINING_GENRES = [
  ['all','指定なし'],['japanese','和食'],['western','洋食'],['italian','イタリアン'],
  ['chinese','中華'],['yakiniku','焼肉'],['sushi','寿司'],['ramen','ラーメン'],
  ['cafe','カフェ'],['buffet','ビュッフェ'],['family_restaurant','ファミレス'],['other','その他']
] as const;

export const CHILD_PRICE_OPTIONS = [
  ['','指定なし'],['free','無料'],['half','半額以上の割引'],['child_price','子ども料金あり']
] as const;

export const DINING_ACCESSIBILITY_OPTIONS = [
  ['wheelchair','車いす対応'],['accessible_toilet','バリアフリートイレ'],
  ['accessible_parking','優先・障害者用駐車場'],['disability_discount','障害者手帳等の割引']
] as const;

export type DiningPriceRule={
  age_group:string;
  meal_period:string;
  rule_type:string;
  percent_off:number|null;
  fixed_price_yen:number|null;
  condition_text:string|null;
  source_url:string;
  last_verified_at:string;
};

export type DiningOverlay={
  identity_key:string;
  name:string;
  prefecture:string|null;
  municipality:string|null;
  address:string|null;
  latitude:number|null;
  longitude:number|null;
  official_url:string|null;
  child_friendly:boolean|null;
  kids_menu:boolean|null;
  high_chair:boolean|null;
  stroller_ok:boolean|null;
  baby_food_allowed:boolean|null;
  private_room:boolean|null;
  non_smoking:boolean|null;
  parking:boolean|null;
  barrier_free:boolean|null;
  accessibility_keys:string[];
  child_price_rules:DiningPriceRule[];
  source_url:string;
  last_verified_at:string|null;
};

export async function getDiningOverlays(input:{
  preschool?:string;
  elementary?:string;
  accessibility?:string;
  limit?:number;
}):Promise<DiningOverlay[]> {
  const db=getPublicSupabase();
  if(!db) return [];
  const {data,error}=await db.rpc('get_verified_family_dining_overlays',{
    p_place_keys:null,
    p_preschool_price:input.preschool||null,
    p_elementary_price:input.elementary||null,
    p_accessibility_keys:input.accessibility?[input.accessibility]:null,
    p_limit:input.limit??200
  });
  if(error){
    console.error('get_verified_family_dining_overlays failed',error.message);
    return [];
  }
  return (data??[]) as DiningOverlay[];
}

export function distanceKm(lat1:number,lng1:number,lat2:number,lng2:number) {
  const toRad=(v:number)=>v*Math.PI/180;
  const r=6371;
  const dLat=toRad(lat2-lat1);
  const dLng=toRad(lng2-lng1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return r*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export function diningRuleLabel(rule:DiningPriceRule) {
  const age=rule.age_group==='preschool'?'未就学児':rule.age_group==='elementary'?'小学生':rule.age_group==='age_0_2'?'0〜2歳':rule.age_group;
  let price=rule.rule_type==='free'?'無料':rule.rule_type==='half'?'半額':rule.rule_type==='child_price'?'子ども料金あり':rule.rule_type;
  if(rule.rule_type==='percent_discount' && rule.percent_off!=null) price=`${rule.percent_off}%割引`;
  if(rule.rule_type==='fixed_price' && rule.fixed_price_yen!=null) price=`${rule.fixed_price_yen.toLocaleString('ja-JP')}円`;
  return `${age}：${price}`;
}
