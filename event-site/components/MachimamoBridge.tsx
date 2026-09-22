import {TrackedLink} from './TrackedLink';
import {machimamoMapUrl} from '@/lib/url-config';

export function MachimamoBridge(){
  const url=new URL(machimamoMapUrl());
  url.searchParams.set('from','machiibe');

  return (
    <section className="machimamo-bridge" aria-labelledby="machimamo-bridge-title">
      <div className="machimamo-bridge-copy">
        <p className="eyebrow">MACHI IBE × MACHI MAMO</p>
        <h2 id="machimamo-bridge-title">行き先を決めたら、当日の安心は「まちまも」へ。</h2>
        <p>まちイベでおでかけ先を探して、まちまもMAPで周辺の安全情報を確認。2つを行き来できるおでかけ導線です。</p>
        <div className="machimamo-bridge-points" aria-label="まちまもで確認できる情報">
          <span>🌡 暑さ指数</span>
          <span>❤️ AED</span>
          <span>👮 交番・警察署</span>
          <span>🗺 周辺MAP</span>
        </div>
      </div>
      <div className="machimamo-bridge-action">
        <small>おでかけ前・当日に</small>
        <TrackedLink href={url.toString()} metric="machimamo_map">まちまもMAPを開く →</TrackedLink>
      </div>
    </section>
  );
}
