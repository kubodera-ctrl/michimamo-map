'use strict';

// UI/domain contract only. Does not render, write a database, or call social APIs.
const PRODUCTION_LABELS = Object.freeze({
  SINGLE: 'TikTok SHORT / SINGLE · 43秒',
  WEEKLY: 'TikTok LONG / WEEKLY · CURRENT尺'
});

const WEEKLY_PRESETS = Object.freeze([6, 9, 12]);
const WEEKLY_PREFECTURES = Object.freeze([
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県',
  '三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
  '鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県',
  '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'
]);

const POST_STATES = Object.freeze([
  'not_started', 'preparing', 'processing', 'uploaded_unpublished',
  'posted', 'failed', 'connection_required'
]);

function weeklyDurationSec(newsCount) {
  if (!Number.isSafeInteger(newsCount) || newsCount < 1) throw new TypeError('newsCount must be a positive integer');
  return 38 + 12 * Math.ceil(newsCount / 3);
}

function weeklySetKey({ weekStart, prefecture }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart || '')) throw new TypeError('weekStart must be YYYY-MM-DD');
  if (!WEEKLY_PREFECTURES.includes(prefecture)) throw new TypeError('prefecture must be one of the 47 prefectures');
  return `${weekStart}:${prefecture}`;
}

function publishingIdempotencyKey({ revisionId, renderId, platform }) {
  if (![revisionId, renderId].every(x => typeof x === 'string' && x.trim())) throw new TypeError('revisionId and renderId are required');
  if (!['X', 'TIKTOK'].includes(platform)) throw new TypeError('platform must be X or TIKTOK');
  return `${revisionId}:${renderId}:${platform}`;
}

function isCompletedPost({ platform, status, externalPostId, finalStatus }) {
  if (status !== 'posted' || !externalPostId) return false;
  if (platform === 'X') return true;
  return platform === 'TIKTOK' && finalStatus === 'PUBLISHED';
}

function overallSingleStatus(xPosted, tiktokPosted) {
  if (xPosted && tiktokPosted) return '済';
  if (xPosted || tiktokPosted) return '一部済';
  return '未';
}

module.exports = {
  PRODUCTION_LABELS, WEEKLY_PRESETS, WEEKLY_PREFECTURES, POST_STATES,
  weeklyDurationSec, weeklySetKey, publishingIdempotencyKey,
  isCompletedPost, overallSingleStatus
};
