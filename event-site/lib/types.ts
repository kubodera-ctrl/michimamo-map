export type EventSummary = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  venue_name: string | null;
  prefecture: string;
  municipality: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  price_text: string | null;
  is_free: boolean | null;
  reservation_required: boolean | null;
  organizer_name: string | null;
  official_url: string;
  category_keys: string[];
  age_group_keys: string[];
  indoor: boolean | null;
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
  categories?: string[];
  ageGroups?: string[];
  freeOnly?: boolean;
  indoorOnly?: boolean;
  limit?: number;
  offset?: number;
};
