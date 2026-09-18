export type EventStatus =
  | 'scheduled'
  | 'changed'
  | 'postponed'
  | 'cancelled'
  | 'sold_out'
  | 'registration_closed';

export type PriceType = 'free' | 'partly_free' | 'paid' | 'unknown';
export type LocationPrecision = 'exact_venue' | 'exact_address' | 'street' | 'approximate' | 'unknown';

export type EventOccurrence = {
  date:string;
  start_time:string|null;
  end_time:string|null;
  status:'scheduled'|'cancelled'|'sold_out'|'registration_closed';
  source_note:string|null;
};

export type EventSummary = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  start_date: string;
  end_date: string;
  duration_days: number;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  schedule_type: 'single' | 'continuous' | 'recurring' | 'irregular';
  event_status: EventStatus;
  status_note: string | null;
  venue_name: string | null;
  prefecture: string;
  municipality: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  location_precision: LocationPrecision;
  location_verified: boolean;
  price_text: string | null;
  price_type: PriceType;
  is_free: boolean | null;
  reservation_required: boolean | null;
  organizer_name: string | null;
  official_url: string;
  category_keys: string[];
  age_group_keys: string[];
  indoor: boolean | null;
  audience_intent: 'child_centered' | 'family_friendly' | 'general' | 'adult_oriented';
  fandom_slugs: string[];
  accessibility_keys: string[];
  accessibility_notes: string | null;
  image_url: string | null;
  source_name: string;
  source_url: string;
  source_updated_at: string | null;
  last_verified_at: string | null;
  updated_at: string;
};

export type EventDetail = EventSummary & {
  timezone: string;
  postal_code: string | null;
  status_updated_at: string | null;
  occurrences: EventOccurrence[];
  place_external_id: string | null;
  reservation_text: string | null;
  ticket_url: string | null;
  image_source_url: string | null;
  image_license: string | null;
  fetched_at: string;
};

export type EventSearchInput = {
  startDate: string;
  endDate: string;
  prefecture?: string;
  keyword?: string;
  excludeTerms?: string[];
  categories?: string[];
  ageGroups?: string[];
  durationBuckets?: string[];
  accessibilityOnly?: boolean;
  accessibilityKeys?: string[];
  audienceIntents?: string[];
  fandomSlugs?: string[];
  priceTypes?: PriceType[];
  updatedAfter?: string;
  freeOnly?: boolean;
  excludeAdultOriented?: boolean;
  indoorOnly?: boolean;
  sort?: 'recommended' | 'start_date' | 'short_first' | 'newest';
  limit?: number;
  offset?: number;
};

export type EventSearchError = 'unconfigured' | 'request_failed' | null;

export type EventSearchResult = {
  events: EventSummary[];
  error: EventSearchError;
};

export type EventPageResult = EventSearchResult & {
  page: number;
  pageSize: number;
  hasPrevious: boolean;
  hasNext: boolean;
};
