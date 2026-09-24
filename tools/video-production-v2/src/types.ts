import {z} from 'zod';

export const rightsLevelSchema=z.enum(['SELF_OWNED','EXPLICIT_PERMISSION','PUBLIC_LICENSE','CC_BY','PUBLIC_DOMAIN','REVIEW','BLOCKED']);
export const mediaUseModeSchema=z.enum(['FULL_VIDEO','VIDEO_EXCERPT','STILL_ONLY','AUDIO_DISABLED','ATTRIBUTION_REQUIRED','LINK_ONLY','DO_NOT_USE']);

export const mediaClipSchema=z.object({
  url:z.string().url(),
  durationSeconds:z.number().positive(),
  startAtSeconds:z.number().nonnegative().default(0),
  useDurationSeconds:z.number().positive().optional(),
  fit:z.enum(['contain','cover']).default('contain'),
});

export const summaryPhaseSchema=z.object({
  fromSeconds:z.number().nonnegative(),
  label:z.string().min(1).max(24),
  text:z.string().min(1).max(180),
});

export const safetyPointSchema=z.object({
  title:z.string().min(1).max(28),
  detail:z.string().min(1).max(60),
  icon:z.enum(['rain','car','info','alert']).default('info'),
});

export const machimamoVideoSchema=z.object({
  templateVersion:z.literal('machimamo-card-v2').default('machimamo-card-v2'),
  format:z.enum(['short','long']).default('short'),
  durationSeconds:z.number().positive(),
  endCardSeconds:z.number().min(3).max(7).default(4.5),
  publishedAtLabel:z.string().min(1).max(32),
  newsSourceName:z.string().min(1).max(60),
  newsSourceURL:z.string().url(),
  mediaSourceName:z.string().min(1).max(80),
  rightsEvidenceURL:z.string().url(),
  headline1:z.string().min(1).max(36),
  headline2:z.string().min(1).max(36),
  locationLabel:z.string().max(42).optional(),
  summaryPhases:z.array(summaryPhaseSchema).min(1).max(8),
  safetyPoints:z.array(safetyPointSchema).length(3),
  media:z.array(mediaClipSchema).min(1).max(4),
  mediaLabel:z.string().min(1).max(80),
  mediaSubLabel:z.string().max(80).optional(),
  rightsLevel:rightsLevelSchema,
  mediaUseMode:z.array(mediaUseModeSchema).min(1),
  commercialUseAllowed:z.boolean(),
  modificationAllowed:z.boolean(),
  audioAllowed:z.boolean().default(false),
  attributionRequired:z.boolean().default(false),
  attributionText:z.string().max(180).optional(),
  sourceUiFree:z.boolean(),
  mapCtaTitle:z.string().default('近くで何が起きてる？'),
  mapCtaText:z.string().default('まちまもMAPで確認'),
  profileCta:z.string().default('詳しくはプロフィールから'),
});

export type MachimamoVideoProps=z.infer<typeof machimamoVideoSchema>;
export type MediaClip=z.infer<typeof mediaClipSchema>;
