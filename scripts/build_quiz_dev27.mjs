import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = path.resolve(root, '../upload/machimamo_quiz_3choice_400.json');
const outDir = path.join(root, 'data/quiz_dev27');
const data = JSON.parse(fs.readFileSync(source, 'utf8'));

data.meta = {
  ...data.meta,
  title: 'まちまもMAP 交通安全3択クイズ 430問',
  version: '4.0-dev27-stamps-430',
  verifiedAsOf: '2026-09-17',
  questionCount: 430,
  carCount: 215,
  bicycleCount: 215,
  rewardPolicy: {
    normal: '車・自転車・ミックスのいずれも10問中9問以上で週間スタンプ1個。全種類合計で1日1個まで。',
    extra: '共通問題プールから100問。1問5秒、98問以上正解で週間スタンプ3個。週1回まで。',
    retry: '報酬獲得後も無制限に挑戦可能。',
    weekly: '日本時間の月曜から日曜。最大11個、10個で50pt、週1回。翌週へ繰り越さない。',
  },
};
delete data.meta.extraModeImplementation;

const rewrites = {
  'BIKE-084': '自転車運転者講習の対象危険行為として、信号に関するものは？',
  'BIKE-085': '自転車運転者講習の対象危険行為として、歩道での通行方法に関するものは？',
  'BIKE-086': '自転車運転者講習の対象危険行為として、路側帯での通行方法に関するものは？',
  'BIKE-087': '自転車運転者講習の対象危険行為として、環状交差点に関するものは？',
};
for (const q of data.questions) {
  if (rewrites[q.id]) q.question = rewrites[q.id];
  if (q.id === 'BIKE-035') q.explanation = '傘を手に持つ運転は操作を妨げて危険で、各都道府県公安委員会の遵守事項にも従う必要があります。雨の強弱だけで許されるものではありません。';
  if (q.id === 'BIKE-033' || q.id === 'BIKE-034') q.explanation = 'イヤホンの形や装着だけで直ちに違反と決まるものではありませんが、安全運転に必要な交通の音や声が聞こえない状態での運転は禁止されています。';
  if (q.id === 'BIKE-078') q.explanation = '反則金を期限内に納付した場合、一定の要件の下で当該反則行為について刑事手続へ移行せず、起訴・有罪判決による前科は生じません。';
}

const signs = [
  ['CAR-201','car','左方つづら折りあり','前方に左から始まる連続した急カーブがある','前方が一方通行である','左折しなければならない'],
  ['CAR-202','car','踏切あり（電車）','前方に踏切がある','路面電車専用道路である','駅への案内である'],
  ['CAR-203','car','踏切あり（機関車）','前方に踏切がある','蒸気機関車だけ通行できる','鉄道車両の駐車場である'],
  ['CAR-204','car','右方背向屈折あり','前方に右から始まる屈折が連続している','右折しなければならない','右側だけ通行できる'],
  ['CAR-205','car','落石のおそれあり','落石や路上の石に注意する','石を積んだ車は通行できない','砂利道の終わりを示す'],
  ['CAR-206','car','環状交差点','前方に環状交差点がある','その場で転回しなければならない','ロータリー内は一時停止禁止である'],
  ['CAR-207','car','転回禁止','車両の転回を禁止する','右折だけを禁止する','追越しを禁止する'],
  ['CAR-208','car','追越しのための右側部分はみ出し通行禁止','追越しのため道路右側へはみ出すことを禁止する','すべての追越しを一律に禁止する','右折を禁止する'],
  ['CAR-209','car','指定方向外進行禁止（直進）','直進方向以外へ進めない','直進だけが禁止される','直進車が優先道路である'],
  ['CAR-210','car','指定方向外進行禁止（左折）','左折方向以外へ進めない','左折だけが禁止される','左側通行の開始を示す'],
  ['CAR-211','car','指定方向外進行禁止（右折）','右折方向以外へ進めない','右折だけが禁止される','右側通行を指示する'],
  ['CAR-212','car','指定方向外進行禁止（直進・左折）','直進または左折だけ進める','右折または転回だけ進める','すべての方向へ進める'],
  ['CAR-213','car','指定方向外進行禁止（直進・右折）','直進または右折だけ進める','左折だけ進める','直進だけが禁止される'],
  ['CAR-214','car','規制の始まり','ここから本標識の規制が始まる','ここで規制が終わる','50m先だけ規制される'],
  ['CAR-215','car','規制の終わり','ここで本標識の規制が終わる','ここから規制が始まる','休日だけ規制される'],
  ['BIKE-201','bicycle','普通自転車歩道通行可','普通自転車が歩道を通行できることを示す','自転車が必ず歩道を高速走行することを示す','歩行者が通行できないことを示す'],
  ['BIKE-202','bicycle','普通自転車専用通行帯','普通自転車の専用通行帯を示す','自転車通行止めを示す','歩行者専用通路を示す'],
  ['BIKE-203','bicycle','自転車ナビマーク','自転車の通行位置と方向を分かりやすく示す法定外表示','自転車だけに信号無視を認める標示','駐輪場を示す規制標識'],
  ['BIKE-204','bicycle','自転車ナビライン','自転車の通行位置と方向を分かりやすく示す法定外表示','青色部分を歩行者通行止めにする規制','自転車の最高速度を示す'],
  ['BIKE-205','bicycle','時間指定「8-20」','本標識の規制が8時から20時に適用される','8月20日だけ適用される','8分間だけ適用される'],
  ['BIKE-206','bicycle','車種指定「自転車を除く」','自転車は本標識の規制対象から除かれる','自転車だけが規制対象になる','自転車を降りても必ず規制される'],
  ['BIKE-207','bicycle','区域内','本標識の規制区域内である','規制が終了した','国道だけを示す'],
  ['BIKE-208','bicycle','日曜・休日を除く','日曜・休日は本標識の規制対象外となる','日曜・休日だけ規制される','祝日の表示は無効である'],
  ['BIKE-209','bicycle','一方通行「自転車を除く」','自転車は補助標識により一方通行規制から除外される','自転車も必ず同じ方向だけ進む','自転車だけ進入禁止になる'],
  ['BIKE-210','bicycle','車両進入禁止「自転車を除く」','自転車は補助標識により進入禁止の対象外となる','自転車を押しても通行止めになる','自転車だけ進入禁止になる'],
  ['BIKE-211','bicycle','横断歩道と自転車横断帯の見分け','自転車横断帯を含む標識か図柄を確認する','青色なら必ず自転車横断帯である','歩行者がいなければ同じ意味になる'],
  ['BIKE-212','bicycle','最高速度と最低速度の見分け','数字の下の青い横線など標識の意匠を確認する','数字が同じなら意味も同じ','自転車には標識の区別が不要である'],
  ['BIKE-213','bicycle','駐車禁止と駐停車禁止の見分け','赤い斜線1本と赤い×印の違いを確認する','どちらも全く同じ意味である','色だけでなく地域名だけを見る'],
  ['BIKE-214','bicycle','通行止めと車両通行止めの見分け','対象が全交通か車両かを標識の図柄で確認する','どちらも歩行者だけを対象とする','自転車にはどちらも関係しない'],
  ['BIKE-215','bicycle','車両進入禁止と一方通行の組合せ','出口側の進入禁止と進行方向を併せて確認する','赤い標識だけ見て逆走する','自転車は補助標識を確認しなくてよい'],
];

for (const [id,vehicleType,signName,correct,wrong1,wrong2] of signs) {
  data.questions.push({id,vehicleType,category:'画像標識',topicKey:`dev27_${id.toLowerCase().replace('-','_')}`,type:'single_select',question:'画像の標識・表示について、正しい説明はどれ？',choices:[{value:'A',label:correct},{value:'B',label:wrong1},{value:'C',label:wrong2}],correctValue:'A',explanation:`画像は「${signName}」です。${correct}ものです。補助標識がある場合は、本標識と組み合わせて判断します。`,violationName:null,penaltyType:null,fineAmountYen:null,points:null,applicableAge:null,effectiveFrom:null,penaltyNote:null,difficulty:'normal',tags:['画像標識'],sourceKeys:['MLIT_SIGN_LIST'],sourceCheckedAt:'2026-09-17',visualRef:{kind:'road_sign',signName,assetNeeded:false}});
}

// Do not reveal the answer in the prompt. Every visual question is backed by
// a vetted local image extracted from an official source.
for (const q of data.questions) {
  if (q.visualRef) {
    q.question = '画像の標識・表示について、正しい説明はどれ？';
    q.visualRef = {...q.visualRef, assetNeeded:false, renderer:'official_asset_v1'};
  }
}

fs.mkdirSync(outDir, {recursive:true});
fs.writeFileSync(path.join(outDir, 'quiz_questions_430.json'), JSON.stringify(data,null,2)+'\n');
const bank = data.questions.map(q => ({
  id:q.id, mode:q.vehicleType === 'bicycle' ? 'bike' : 'car',
  q:q.question, o:q.choices.map(c=>c.label),
  a:q.choices.findIndex(c=>c.value===q.correctValue), e:q.explanation,
  sign:q.visualRef?.signName || null,
}));
const sqlBank = JSON.stringify(bank).replaceAll("'", "''");
const sql = fs.readFileSync(path.join(root,'scripts/quiz_dev27_template.sql'),'utf8')
  .replace('__QUIZ_BANK_JSON__', sqlBank);
fs.writeFileSync(path.join(root,'supabase/migrations/20260917002422_quiz_stamps_dev27.sql'),sql);
console.log(`wrote ${data.questions.length} questions`);
