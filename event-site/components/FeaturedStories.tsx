import Link from 'next/link';

const stories=[
  {
    eyebrow:'WEEKEND',
    title:'今週末、どこ行く？',
    description:'土日のおでかけ候補を、全国のイベントからまとめて探す。',
    href:'/?when=weekend',
    mark:'01',
    visual:'SAT / SUN',
    theme:'weekend'
  },
  {
    eyebrow:'INDOOR',
    title:'雨の日も暑い日も。室内おでかけ',
    description:'天候に左右されにくい、親子向けの屋内イベントをチェック。',
    href:'/?when=today&rainy=1',
    mark:'02',
    visual:'INSIDE',
    theme:'indoor'
  },
  {
    eyebrow:'OSHI KATSU',
    title:'推し活イベントを見つける',
    description:'作品・キャラ・クリエイター名から、確認済み情報を探す。',
    href:'/?when=30days',
    mark:'03',
    visual:'FANDOM',
    theme:'oshi'
  },
  {
    eyebrow:'FREE',
    title:'完全無料のイベント',
    description:'入場・参加が完全無料と確認できたイベントに絞って探す。',
    href:'/?when=30days&price=free',
    mark:'04',
    visual:'¥0',
    theme:'free'
  },
  {
    eyebrow:'EXPERIENCE',
    title:'作る・釣る・探す。体験から選ぶ',
    description:'宝石探し、釣り、ガラス細工、指輪作りなど参加型のおでかけ。',
    href:'/?when=30days&experience=experience',
    mark:'05',
    visual:'DO IT',
    theme:'experience'
  },
  {
    eyebrow:'FOR KIDS',
    title:'子どもが主役のおでかけ',
    description:'見るだけじゃなく、子ども自身が楽しみやすいイベントを探す。',
    href:'/?when=30days&childFocus=1',
    mark:'06',
    visual:'KIDS',
    theme:'kids'
  }
] as const;

export function FeaturedStories(){
  return (
    <section className="featured-stories" aria-labelledby="featured-stories-title">
      <div className="featured-stories-head">
        <div>
          <p className="eyebrow">FEATURE</p>
          <h2 id="featured-stories-title">注目記事・おでかけ特集</h2>
        </div>
        <p>イベント一覧とは別に、目的からおでかけ候補を見つける特集です。</p>
      </div>
      <div className="featured-story-grid">
        {stories.map((story)=>(
          <Link className={`featured-story-card featured-story-${story.theme}`} href={story.href} key={story.title}>
            <div className="featured-story-visual" aria-hidden="true">
              <div className="featured-story-visual-top">
                <span className="featured-story-index">{story.mark}</span>
                <span className="featured-story-signal"><i /><i /><i /></span>
              </div>
              <strong className="featured-story-word">{story.visual}</strong>
              <b>{story.eyebrow}</b>
            </div>
            <div className="featured-story-copy">
              <small>{story.eyebrow}</small>
              <strong>{story.title}</strong>
              <p>{story.description}</p>
              <span>特集を見る →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
