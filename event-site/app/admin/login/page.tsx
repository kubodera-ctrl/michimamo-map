import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata:Metadata={
  title:'運営ログイン',
  robots:{index:false,follow:false}
};

type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]||'':v||'';

export default async function AdminLoginPage({searchParams}:{searchParams:SearchParams}){
  const params=await searchParams;
  const error=one(params.error);
  return (
    <main className="admin-login-shell">
      <div className="admin-login-card">
        <p className="eyebrow">MACHI IBE ADMIN</p>
        <h1>まちイベ運営画面</h1>
        <p>管理者用パスワードを入力してください。</p>
        {error==='1' && <div className="admin-error">パスワードが違います。</div>}
        {error==='config' && <div className="admin-error">管理者用環境変数が未設定です。</div>}
        {error==='rate' && <div className="admin-error">試行回数が多いため、一時的にログインを制限しています。</div>}
        <form action="/api/admin/login" method="post">
          <label>管理者パスワード
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <button className="search-button" type="submit">ログイン</button>
        </form>
        <Link href="/">まちイベへ戻る</Link>
      </div>
    </main>
  );
}
