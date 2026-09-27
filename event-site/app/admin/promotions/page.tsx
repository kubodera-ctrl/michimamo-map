import type {Metadata} from 'next';
import Link from 'next/link';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {ADMIN_COOKIE,validateAdminSession} from '@/lib/admin-auth';
import {getAdminSupabase} from '@/lib/supabase-admin';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'広告・PR管理',robots:{index:false,follow:false}};

type Promotion={id:string;source_master_id:string|null;promotion_type:string;provider_name:string|null;advertiser_name:string|null;campaign_name:string;category:string|null;placement_keys:string[];tags:string[];approval_status:string;machiibe_media_approval:string;target_url:string|null;reward_mode:string;enabled:boolean;disclosure_label:string;last_checked_at:string|null;notes:string|null};

export default async function PromotionsPage(){
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) redirect('/admin/login');
  const db=getAdminSupabase();
  let items:Promotion[]=[];
  let unavailable=false;
  if(db){
    const result=await db.from('machiibe_promotions').select('*').order('updated_at',{ascending:false}).limit(200);
    if(result.error) unavailable=true;
    else items=(result.data||[]) as Promotion[];
  }else unavailable=true;

  return (
    <main className="admin-shell">
      <nav className="breadcrumb"><Link href="/admin">運営ダッシュボード</Link><span>›</span><span>広告・PR管理</span></nav>
      <div className="admin-topbar"><div><p className="eyebrow">MONETIZATION</p><h1>ASP / スポンサー / PR管理</h1><p>まちイベでは原則ポイント還元なし。媒体承認・専用URL確認前のASPはONにできません。</p></div></div>
      {unavailable&&<div className="admin-warning">広告管理DBはまだ本番未適用です。Migration反映後に有効になります。</div>}
      <section className="admin-panel">
        <div className="admin-production-table-wrap"><table className="admin-production-table">
          <thead><tr><th>種別</th><th>案件</th><th>ASP/提供元</th><th>掲載位置</th><th>案件状態</th><th>まちイベ媒体</th><th>還元</th><th>表示</th><th>編集</th></tr></thead>
          <tbody>
            {items.map((item)=>(
              <tr key={item.id}>
                <td>{item.promotion_type}</td>
                <td><strong>{item.campaign_name}</strong>{item.category&&<small>{item.category}</small>}</td>
                <td>{item.provider_name||item.advertiser_name||'—'}</td>
                <td>{item.placement_keys.join(' / ')||'未設定'}</td>
                <td>{item.approval_status}</td>
                <td>{item.machiibe_media_approval}</td>
                <td>{item.reward_mode==='none'?'なし':'将来token'}</td>
                <td>{item.enabled?'ON':'OFF'}</td>
                <td>
                  <form action="/api/admin/promotions/update" method="post" className="admin-inline-edit">
                    <input type="hidden" name="id" value={item.id} />
                    <select name="media_approval" defaultValue={item.machiibe_media_approval}>
                      <option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option><option value="not_required">not_required</option>
                    </select>
                    <input type="url" name="target_url" defaultValue={item.target_url||''} placeholder="まちイベ専用 https URL" />
                    <label><input type="checkbox" name="enabled" value="1" defaultChecked={item.enabled} />ON</label>
                    <button type="submit">保存</button>
                  </form>
                </td>
              </tr>
            ))}
            {!items.length&&<tr><td colSpan={9}>登録案件はありません。</td></tr>}
          </tbody>
        </table></div>
      </section>
    </main>
  );
}
