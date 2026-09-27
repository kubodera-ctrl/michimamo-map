import type {Metadata} from 'next';
import Link from 'next/link';
import {cookies} from 'next/headers';
import {notFound,redirect} from 'next/navigation';
import {ADMIN_COOKIE,validateAdminSession} from '@/lib/admin-auth';
import {getAdminSupabase} from '@/lib/supabase-admin';
import type {CarouselInput} from '@/lib/machiibe-production-master';
import MachiibeFinalCarouselRenderer from '@/components/MachiibeFinalCarouselRenderer';
import {deriveOverallPostState} from '@/lib/publishing-state';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Production Revision',robots:{index:false,follow:false}};
type Params=Promise<{id:string}>;

function distribute<T>(items:T[],bucketCount:number){
  if(bucketCount<=0) return [] as T[][];
  const buckets=Array.from({length:bucketCount},()=>[] as T[]);
  items.forEach((item,index)=>buckets[index%bucketCount].push(item));
  return buckets;
}

export default async function ProductionDetailPage({params}:{params:Params}){
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) redirect('/admin/login');
  const {id}=await params;
  const db=getAdminSupabase();
  if(!db) notFound();

  const setResult=await db.from('publishing_post_sets').select('*').eq('id',id).eq('service','machiibe').maybeSingle();
  if(setResult.error || !setResult.data) notFound();

  const revisionResult=await db.from('publishing_revisions').select('*').eq('post_set_id',id).order('revision_number',{ascending:false}).limit(1).maybeSingle();
  if(revisionResult.error || !revisionResult.data) notFound();
  const revision=revisionResult.data;
  const input=revision.input_snapshot as CarouselInput;
  const pagePlan=(revision.page_plan||{}) as {pageCount?:number;eventCount?:number;partIndex?:number;partCount?:number};
  const pageCount=Number(pagePlan.pageCount||0);
  const middleCount=Math.max(0,pageCount-3);
  const middle=distribute(input.events,middleCount);

  const postsResult=await db.from('publishing_platform_posts')
    .select('platform,status,external_status,external_post_id,publish_id,posted_at,error_code,error_message')
    .eq('revision_id',revision.id);
  const posts=(postsResult.data||[]) as Array<{platform:'x'|'tiktok';status:any;external_status:string|null;external_post_id:string|null;publish_id:string|null;posted_at:string|null;error_code:string|null;error_message:string|null}>;
  const overall=deriveOverallPostState(posts.map((post)=>({platform:post.platform,status:post.status,externalStatus:post.external_status,externalPostId:post.external_post_id,publishId:post.publish_id})));

  return (
    <main className="admin-shell">
      <nav className="breadcrumb"><Link href="/admin/production">Production一覧</Link><span>›</span><span>{id}</span></nav>
      <div className="admin-topbar">
        <div>
          <p className="eyebrow">REVISION {revision.revision_number}</p>
          <h1>{(setResult.data.prefecture||'')+' '+(setResult.data.period_label||'')}</h1>
          <p>{setResult.data.production_type} / {revision.master_version} / 投稿状態：{overall}</p>
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>Facts / Rights</h2><p>生成元の確認済み事実と権利状態。ここをAIで補完しません。</p></div></div>
        <div className="admin-facts-grid">
          {input.events.map((event)=>(
            <article key={event.eventId}>
              <strong>{event.title}</strong>
              <small>{event.municipality} / {event.venueName}</small>
              <span>{event.startDate}{event.endDate&&event.endDate!==event.startDate?'〜'+event.endDate:''}</span>
              <span>{event.priceLabel} / {event.reservationLabel}</span>
              <span>source: {event.sourceName} / checked: {event.sourceCheckedAt}</span>
              <span>media: {event.imageMode} / rights: {event.mediaRightsStatus}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>9:16 Structure Preview</h2><p>Golden renderer反映前の構成確認。ページ数・情報割付・CTAの回帰確認用です。</p></div></div>
        <div className="admin-carousel-preview-grid">
          <article className="admin-carousel-page">
            <b>1 / {pageCount}</b><small>COVER</small>
            <h3>{input.area.prefecture}{input.area.municipalityName?' / '+input.area.municipalityName:''}</h3>
            <p>{input.period.periodLabel}</p>
            <strong>今週どこ行く？</strong>
          </article>
          <article className="admin-carousel-page">
            <b>2 / {pageCount}</b><small>HIGHLIGHTS</small>
            <h3>見どころ</h3>
            {input.events.slice(0,4).map((event)=><p key={event.eventId}>・{event.title}</p>)}
          </article>
          {middle.map((events,index)=>(
            <article className="admin-carousel-page" key={index}>
              <b>{index+3} / {pageCount}</b><small>EVENTS</small>
              {events.map((event)=>(
                <div className="admin-carousel-event" key={event.eventId}>
                  <strong>{event.title}</strong>
                  <p>{event.startDate} / {event.venueName}</p>
                  <p>{event.priceLabel}</p>
                </div>
              ))}
            </article>
          ))}
          <article className="admin-carousel-page">
            <b>{pageCount} / {pageCount}</b><small>CTA</small>
            <h3>詳しい条件は「まちイベ」で検索</h3>
            <p>保存して、一緒に行く人へ共有</p>
            <p>行く前・当日は「まちまも」で周辺確認</p>
          </article>
        </div>
      </section>

      <section className="admin-panel">
        <MachiibeFinalCarouselRenderer input={input} pageCount={pageCount} postSetId={id} revisionId={revision.id} />
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>QC / 承認</h2><p>Facts・Rights・PageCountは生成時検証済み。VisualとGoldenは目視/回帰確認後に更新してください。</p></div></div>
        <form action="/api/admin/production/qc" method="post" className="admin-qc-form">
          <input type="hidden" name="post_set_id" value={id} />
          <input type="hidden" name="revision_id" value={revision.id} />
          <label>Visual QC
            <select name="visual_qc" defaultValue={revision.visual_qc}>
              <option value="pending">pending</option><option value="pass">pass</option><option value="fail">fail</option>
            </select>
          </label>
          <label>Golden QC
            <select name="golden_qc" defaultValue={revision.golden_qc}>
              <option value="pending">pending</option><option value="pass">pass</option><option value="fail">fail</option>
            </select>
          </label>
          <label><input type="checkbox" name="approve" value="1" defaultChecked={revision.approval_status==='approved'} />管理者承認</label>
          <button className="admin-primary" type="submit">QCを保存</button>
        </form>
        <p>publishEligible: <strong>{revision.publish_eligible?'true':'false'}</strong></p>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>X / TikTok</h2><p>publishEligible=trueのRevisionだけ投稿操作を許可します。</p></div></div>
        <div className="admin-platform-actions">
          {(['x','tiktok'] as const).map((platform)=>{
            const post=posts.find((item)=>item.platform===platform);
            return <div key={platform}><strong>{platform==='x'?'X':'TikTok'}</strong><span>{post?.status||'未'}</span>{post?.external_status&&<small>{post.external_status}</small>}</div>;
          })}
        </div>
        {!revision.publish_eligible && <div className="admin-warning">Visual / Golden QCと管理者承認が完了するまで投稿できません。</div>}
      </section>
    </main>
  );
}
