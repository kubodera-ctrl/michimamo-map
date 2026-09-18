export const DINING_GENRES = [
  ['all','指定なし'],
  ['japanese','和食'],
  ['western','洋食'],
  ['italian','イタリアン'],
  ['chinese','中華'],
  ['yakiniku','焼肉'],
  ['sushi','寿司'],
  ['ramen','ラーメン'],
  ['cafe','カフェ'],
  ['buffet','ビュッフェ'],
  ['family_restaurant','ファミレス'],
  ['other','その他']
] as const;

export const CHILD_PRICE_OPTIONS = [
  ['','指定なし'],
  ['free','無料'],
  ['half','半額以上の割引'],
  ['child_price','子ども料金あり']
] as const;

export const DINING_ACCESSIBILITY_OPTIONS = [
  ['wheelchair','車いす対応'],
  ['accessible_toilet','バリアフリートイレ'],
  ['accessible_parking','優先・障害者用駐車場'],
  ['disability_discount','障害者手帳等の割引']
] as const;
