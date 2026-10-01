import type {Metadata} from 'next';
import Link from 'next/link';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {ADMIN_COOKIE,validateAdminSession} from '@/lib/admin-auth';
import {getAdminSupabase} from '@/lib/supabase-admin';
import {deriveOverallPostState,type PlatformPostSnapshot} from '@/lib/publishing-state';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Production一覧',robots:{index:false,follow:false}};

type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]||'':v||'';

type PostSetRow={
  id:string;production_type:string;prefecture:string|null;municipality:string|null;area_group_id:string|null;
  period_start:string|null;period_end:string|null;period_label:string|null;feature_key:string|null;
  event_count:number;status:string;updated_at:string;
};
type RevisionRow={
  id:string;post_set_id:string;revision_number:number;facts_qc:string;rights_qc:string;visual_qc:string;
  golden_qc:string;page_count_qc:string;disclaimer_qc:string;approval_status:string;publish_eligible:boolean;
};
type PlatformRow={post_set_id:string;revision_id:string;platform:'x'|'tiktok';status:PlatformPostSnapshot['status'];external_status:string|null;posted_at:string|null};

function platformLabel(row:PlatformRow|undefined){
  if(!row) return '未';
  if(row.status==='posted') return '済';
  if(row.status==='failed') return '失敗';
  if(['queued','uploading','sent','posting'].includes(row.status)) return '処理中';
  return '未';
}

export default async function ProductionPage({searchParams}:{searchParams:SearchParams}){
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) redirect('/admin/login');

  const params=await searchParams;
  const stateFilter=one(params.state)||'all';
  const includeDone=one(params.includeDone)==='1';
  const created=one(params.created);
  const db=getAdminSupabase();

  let sets:PostSetRow[]=[];
  let revisions:RevisionRow[]=[];
  let posts:PlatformRow[]=[];
  let unavailable=false;

  if(db){
    const setResult=await db.from('publishing_post_sets')
      .select('id,production_type,prefecture,municipality,area_group_id,period_start,period_end,period_label,feature_key,event_count,status,updated_at')
      .eq('service','machiibe')
      .order('updated_at',{ascending:false})
      .limit(200);
    if(setResult.error){
      unavailable=true;
    }else{
      sets=(setResult.data||[]) as PostSetRow[];
      const ids=sets.map((row)=>row.id);
      if(ids.length){
        const [revResult,postResult]=await Promise.all([
          db.from('publishing_revisions')
            .select('id,post_set_id,revision_number,facts_qc,rights_qc,visual_qc,golden_qc,page_count_qc,disclaimer_qc,approval_status,publish_eligible')
            .in('post_set_id',ids)
            .order('revision_number',{ascending:false}),
          db.from('publishing_platform_posts')
            .select('post_set_id,revision_id,platform,status,external_status,posted_at')
            .in('post_set_id',ids)
            .order('created_at',{ascending:false})
        ]);
        if(!revResult.error) revisions=(revResult.data||[]) as RevisionRow[];
        if(!postResult.error) posts=(postResult.data||[]) as PlatformRow[];
      }
    }
  }else unavailable=true;

  const latestRevision=new Map<string,RevisionRow>();
  for(const revision of revisions){
    if(!latestRevision.has(revision.post_set_id)) latestRevision.set(revision.post_set_id,revision);
  }

  const filtered=sets.filter((set)=>{
    const revision=latestRevision.get(set.id);
    const revisionPosts=revision?posts.filter((post)=>post.revision_id===revision.id):[];
    const overall=deriveOverallPostState(revisionPosts.map((post)=>({
      platform:post.platform,status:post.status,externalStatus:post.external_status
    })));
    if(!includeDone && overall==='済') return false;
    return stateFilter==='all' || overall===stateFilter;
  });

  return (
    <main className="admin-shell">
      <div className="admin-topbar">
        <div>
          <p className="eyebrow">PRODUCTION</p>
          <h1>まちイベ Production一覧</h1>
          <p>PostSet → Revision → QC → 承認 → X/TikTok投稿を同一画面で追跡します。</p>
          <div className="admin-quick-links">
            <Link href="/admin/production/new">新しいCAROUSELを作成 →</Link>
            <Link href="/admin/social-master">CURRENT Master確認 →</Link>
            <Link href="/preview/carousel-golden-fixtures/normal-5p">Golden NORMAL 5P →</Link>
            <Link href="/preview/carousel-golden-fixtures/extended-7p">Golden EXTENDED 7P →</Link>
            <Link href="/preview/carousel-golden-fixtures/holiday-8p">Golden HOLIDAY 8P →</Link>
            <Link href="/admin">ダッシュボードへ →</Link>
          </div>
        </div>
      </div>

      {created && <div className="admin-success">Productionを作成しました：{created}</div>}
      {unavailable && <div className="admin-warning">Production DBはまだ本番未適用です。Migration反映後に一覧が有効になります。</div>}

      <section className="admin-panel">
        <form className="admin-filter-row" method="get">
          <label>投稿状態
            <select name="state" defaultValue={stateFilter}>
              {['all','未','一部済','済','失敗','投稿処理中'].map((value)=><option value={value} key={value}>{value==='all'?'すべて':value}</option>)}
            </select>
          </label>
          <label><input type="checkbox" name="includeDone" value="1" defaultChecked={includeDone} />済を表示</label>
          <button type="submit">絞り込む</button>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-production-table-wrap">
          <table className="admin-production-table">
            <thead><tr>
              <th>都道府県</th><th>地域</th><th>対象期間</th><th>特集</th><th>件数</th><th>Type</th>
              <th>生成</th><th>QC</th><th>承認</th><th>X</th><th>TikTok</th><th>投稿状態</th><th>投稿日時</th><th>操作</th>
            </tr></thead>
            <tbody>
              {filtered.map((set)=>{
                const revision=latestRevision.get(set.id);
                const revisionPosts=revision?posts.filter((post)=>post.revision_id===revision.id):[];
                const x=revisionPosts.find((post)=>post.platform==='x');
                const tiktok=revisionPosts.find((post)=>post.platform==='tiktok');
                const overall=deriveOverallPostState(revisionPosts.map((post)=>({platform:post.platform,status:post.status,externalStatus:post.external_status})));
                const qc=revision
                  ? [revision.facts_qc,revision.rights_qc,revision.visual_qc,revision.golden_qc,revision.page_count_qc,revision.disclaimer_qc].every((value)=>value==='pass')?'pass':'確認中'
                  : '未';
                const postedAt=[x?.posted_at,tiktok?.posted_at].filter(Boolean).sort().at(-1)||'—';
                return (
                  <tr key={set.id}>
                    <td>{set.prefecture||'—'}</td>
                    <td>{set.municipality||set.area_group_id||'全域'}</td>
                    <td>{set.period_label||[set.period_start,set.period_end].filter(Boolean).join('〜')||'—'}</td>
                    <td>{set.feature_key||'通常'}</td>
                    <td>{set.event_count}</td>
                    <td>{set.production_type}</td>
                    <td>{set.status}</td>
                    <td>{qc}</td>
                    <td>{revision?.approval_status||'未'}</td>
                    <td>{platformLabel(x)}</td>
                    <td>{platformLabel(tiktok)}</td>
                    <td>{overall}</td>
                    <td>{postedAt}</td>
                    <td><Link href={`/admin/production/${set.id}`}>開く</Link></td>
                  </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan={14}>対象Productionはありません。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
