# ASP β Candidate Report — ASP2 CURRENT 2026-09-28

Authority: Google Sheets まちまも・まちイベ ASP案件マスター。Git/DBを第二正本にしない。
Flow: ASP2 CURRENT -> validated import -> ASP Runtime Master -> placement -> user display。

## Counts service=machimamo
- total: 103
- A 通常広告として厳格gate通過・今すぐβ掲載可能: 0
- B ポイント還元候補: 0
- C 提携承認 + tracking URLあり、ただしpublic gate未完: 30
- D 現在不適格/準備不足: 73

## Verification shortlist — Cであり未掲載
|offer_id|案件|カテゴリ|ASP|tracking URL|placement候補|reward|blocker|
|---|---|---|---|---|---|---|---|
|ofr_000026|Akippa|自動車・駐車場|A8|https://px.a8.net/svt/ejp?a8mat=4BAH9J+CNGO3M+3NAY+5YRHE|life/asp_feature|denied|media_conditions=false, link_verified=false, placement未承認|
|ofr_000075|Hamic|通信・GPS・見守り|A8|https://px.a8.net/svt/ejp?a8mat=4BCH7Q+ASS4CI+XTI+ZQ80I|child/asp_feature|denied|media_conditions=false, link_verified=false, placement未承認|
|ofr_000098|DTI SIM|国内格安SIM|A8|https://px.a8.net/svt/ejp?a8mat=4BCHZN+38P0W2+1QFI+2Z68LU|life/asp_feature|unknown|link_verified=trueだがmedia_conditions/placement未完|
|ofr_000057|じゃらん 遊び・体験|レジャー・体験予約|ValueCommerce|https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3779876&pid=892710213|未割当|unknown|広告タグ/媒体条件/placement|
|ofr_000037|特P|自動車・駐車場|A8|https://px.a8.net/svt/ejp?a8mat=4BAH9J+CY6GZM+43U8+C03K2|life/asp_feature|unknown|media条件/link/placement|
|ofr_000023|インズウェブ|自動車・駐車場|A8|https://px.a8.net/svt/ejp?a8mat=4BAH9J+9CDZ42+2PS+15OZHU|life/asp_feature|denied|media条件/link/placement|
|ofr_000093|アクティビティジャパン|旅行・レジャー・体験|ValueCommerce|https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3779876&pid=892710212|未割当|unknown|広告タグ/media条件/placement|

この7件は掲載候補ではなく、3〜10件のβ検証優先shortlist。ユーザー価値・親和性を理由に先に条件確認するだけ。

## Legacy Production conflict
- Production/mainにRuntimeを通らない特P、軒先、Ipsos、CampusTop等の直リンクあり。
- ＋10,000pt / ＋500,000pt表示あり。一方CURRENT reward-enabled=0。
- Ipsos ofr_000033: reward permission 要確認 / master ad link空。
- CampusTop ofr_000034: reward permission 要確認 / master ad link空。
- 軒先 ofr_000051: reward permission 要確認 / master ad link空。
- 特P ofr_000037 CURRENT URLは ...+C03K2。Production bannerは別suffix、CURRENT link_verified=false。
- よって旧直書き広告はβ P0。guardrail branchでは削除せず非表示。

## Placement
- MAP: overlay/sticky広告は初期βOFF。map controls/post/auth/modalを阻害しない。
- Parking modal: 現direct linksはOFF。verified parking placementのみ後で再表示。
- MyPage: identity/LINE/point coreより下。認証導線横には置かない。
- Point: normal adは PR・ポイント還元なし を明示。reward gate通過時だけ数値表示。
- News: content後のnon-sticky。close/scroll/sourceを阻害しない。
- Today/Machiibe: primary content/action後。
- Post/Auth: 広告なし。

## Discovery low inventory
0件はempty state。1〜3件は利用可能filterだけを表示/compact化。人気順は実positive usage+明示enableのみ。

## Click
ユーザーtap -> async click record -> ASP official tracking URL。計測失敗で遷移を止めない。bot巡回/Preview自動click禁止。

## Conversion
pending -> verified -> approved | rejected -> reversed。
approvedのみasp_reward append、credited approvalのreversedのみasp_reward_reversal。pending/verifiedはavailableに入れない。
