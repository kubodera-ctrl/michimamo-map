-- Runtime copy of the ASP business master. Importing never enables an offer.
-- The Google Sheet remains the business source of truth; this schema is the app runtime.
begin;

create table if not exists public.asp_runtime_offers (
  offer_id text primary key,
  source_record_id text,
  asp text not null,
  program_id text not null,
  advertiser_name text not null,
  offer_name text not null,
  category text,
  media_type text,
  approval_status text not null default 'unknown'
    check (approval_status in ('approved','pending','rejected','ended','unknown')),
  automation_level text not null default 'X'
    check (automation_level in ('A','B','C','D','X')),
  source_master_updated_at timestamptz,
  imported_at timestamptz not null default now(),
  source_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asp, program_id)
);

create table if not exists public.asp_runtime_service_offers (
  offer_id text not null references public.asp_runtime_offers(offer_id) on delete restrict,
  service_key text not null check (service_key in ('machimamo','machiibe')),
  source_listing_allowed boolean not null default false,
  source_media_approved boolean not null default false,
  web_approval_status text not null default 'unknown'
    check (web_approval_status in ('approved','pending','rejected','unknown')),
  app_approval_status text not null default 'unknown'
    check (app_approval_status in ('approved','pending','rejected','unknown')),
  sns_approval_status text not null default 'unknown'
    check (sns_approval_status in ('approved','pending','rejected','unknown')),
  line_approval_status text not null default 'unknown'
    check (line_approval_status in ('approved','pending','rejected','unknown')),
  tracking_url text,
  creative_type text check (creative_type is null or creative_type in ('text','image','html')),
  creative_url text,
  impression_tracking_url text,
  point_reward_allowed boolean not null default false,
  reward_rule_confirmed boolean not null default false,
  reward_rule jsonb not null default '{}'::jsonb,
  reward_amount numeric(12,2),
  reward_rate numeric(8,5),
  valid_from timestamptz,
  valid_until timestamptz,
  last_verified_at timestamptz,
  source_master_updated_at timestamptz,
  publish_status text not null default 'draft'
    check (publish_status in ('draft','active','paused','ended')),
  listing_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (offer_id, service_key),
  check (tracking_url is null or tracking_url ~ '^https://[^[:space:]<>"'']+$'),
  check (creative_url is null or creative_url ~ '^https://[^[:space:]<>"'']+$'),
  check (impression_tracking_url is null or impression_tracking_url ~ '^https://[^[:space:]<>"'']+$'),
  check (not point_reward_allowed or reward_rule_confirmed)
);

create table if not exists public.asp_runtime_placements (
  offer_id text not null,
  service_key text not null,
  placement_id text not null check (length(placement_id) between 1 and 80),
  enabled boolean not null default false,
  sort_order integer not null default 100,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (offer_id, service_key, placement_id),
  foreign key (offer_id, service_key)
    references public.asp_runtime_service_offers(offer_id, service_key) on delete restrict
);

create table if not exists public.asp_runtime_clicks (
  click_id uuid primary key default gen_random_uuid(),
  offer_id text not null,
  service_key text not null,
  placement_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  anonymous_session_id uuid,
  clicked_at timestamptz not null default now(),
  source_screen text not null check (length(source_screen) between 1 and 100),
  foreign key (offer_id, service_key, placement_id)
    references public.asp_runtime_placements(offer_id, service_key, placement_id) on delete restrict,
  check (user_id is not null or anonymous_session_id is not null)
);

create index if not exists asp_runtime_service_gate_idx
  on public.asp_runtime_service_offers(service_key, publish_status, listing_enabled, valid_until);
create index if not exists asp_runtime_placements_gate_idx
  on public.asp_runtime_placements(service_key, placement_id, enabled, sort_order);
create index if not exists asp_runtime_clicks_offer_time_idx
  on public.asp_runtime_clicks(offer_id, service_key, clicked_at desc);

alter table public.asp_runtime_offers enable row level security;
alter table public.asp_runtime_service_offers enable row level security;
alter table public.asp_runtime_placements enable row level security;
alter table public.asp_runtime_clicks enable row level security;

revoke all on public.asp_runtime_offers, public.asp_runtime_service_offers,
  public.asp_runtime_placements, public.asp_runtime_clicks from public, anon, authenticated;

create or replace function public.get_asp_offers_for_placement(
  p_service_key text,
  p_placement_id text
)
returns table (
  offer_id text, asp text, program_id text, advertiser_name text, offer_name text,
  category text, creative_type text, creative_url text, tracking_url text,
  point_reward_allowed boolean, reward_rule jsonb, reward_amount numeric, reward_rate numeric
)
language sql stable security definer set search_path = '' as $$
  select o.offer_id, o.asp, o.program_id, o.advertiser_name, o.offer_name,
         o.category, s.creative_type, s.creative_url, s.tracking_url,
         (s.point_reward_allowed and s.reward_rule_confirmed),
         case when s.point_reward_allowed and s.reward_rule_confirmed then s.reward_rule else '{}'::jsonb end,
         case when s.point_reward_allowed and s.reward_rule_confirmed then s.reward_amount else null end,
         case when s.point_reward_allowed and s.reward_rule_confirmed then s.reward_rate else null end
  from public.asp_runtime_offers o
  join public.asp_runtime_service_offers s on s.offer_id = o.offer_id
  join public.asp_runtime_placements p on p.offer_id = s.offer_id and p.service_key = s.service_key
  where p.service_key = p_service_key
    and p.placement_id = p_placement_id
    and p_service_key in ('machimamo','machiibe')
    and o.approval_status = 'approved'
    and s.source_listing_allowed
    and s.source_media_approved
    and s.web_approval_status = 'approved'
    and s.tracking_url is not null
    and s.publish_status = 'active'
    and s.listing_enabled
    and p.enabled
    and (s.valid_from is null or s.valid_from <= now())
    and (s.valid_until is null or s.valid_until > now())
    and (p.valid_from is null or p.valid_from <= now())
    and (p.valid_until is null or p.valid_until > now())
  order by p.sort_order, o.offer_id;
$$;

create or replace function public.admin_import_asp_runtime(
  p_password text,
  p_source_master_updated_at timestamptz,
  p_offers jsonb
)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_offer jsonb;
  v_service jsonb;
  v_service_key text;
  v_count integer := 0;
  v_offer_id text;
  v_asp text;
  v_program_id text;
begin
  perform public.admin_validate(p_password);
  if p_source_master_updated_at is null or jsonb_typeof(p_offers) <> 'array'
     or jsonb_array_length(p_offers) > 300 or pg_column_size(p_offers) > 2000000 then
    raise exception 'invalid import payload' using errcode = '22023';
  end if;
  for v_offer in select value from jsonb_array_elements(p_offers) loop
    if v_offer ?| array['html','raw_html','tag_html','complete_ad_tag'] then
      raise exception 'raw HTML tags are not accepted' using errcode = '22023';
    end if;
    v_asp := nullif(trim(v_offer->>'asp'),'');
    v_program_id := nullif(trim(v_offer->>'program_id'),'');
    v_offer_id := nullif(trim(v_offer->>'offer_id'),'');
    if v_asp is null or v_program_id is null or v_offer_id is distinct from (v_asp || ':' || v_program_id)
       or nullif(trim(v_offer->>'advertiser_name'),'') is null
       or nullif(trim(v_offer->>'offer_name'),'') is null then
      raise exception 'offer_id must be stable asp:program_id; required labels missing' using errcode = '22023';
    end if;
    if v_offer ? 'services' and jsonb_typeof(v_offer->'services') <> 'object' then
      raise exception 'services must be an object' using errcode = '22023';
    end if;
    insert into public.asp_runtime_offers(
      offer_id, source_record_id, asp, program_id, advertiser_name, offer_name,
      category, media_type, approval_status, automation_level,
      source_master_updated_at, imported_at, source_snapshot, updated_at
    ) values (
      v_offer_id, nullif(v_offer->>'source_record_id',''), v_asp, v_program_id,
      trim(v_offer->>'advertiser_name'), trim(v_offer->>'offer_name'),
      nullif(v_offer->>'category',''), nullif(v_offer->>'media_type',''),
      coalesce(nullif(v_offer->>'approval_status',''),'unknown'),
      coalesce(nullif(v_offer->>'automation_level',''),'X'),
      p_source_master_updated_at, now(),
      jsonb_build_object(
        'source_record_id',v_offer->>'source_record_id',
        'advertiser_name',v_offer->>'advertiser_name',
        'offer_name',v_offer->>'offer_name',
        'category',v_offer->>'category',
        'media_type',v_offer->>'media_type',
        'approval_status',v_offer->>'approval_status',
        'automation_level',v_offer->>'automation_level'
      ), now()
    ) on conflict (offer_id) do update set
      source_record_id = excluded.source_record_id, advertiser_name = excluded.advertiser_name,
      offer_name = excluded.offer_name, category = excluded.category, media_type = excluded.media_type,
      approval_status = excluded.approval_status, automation_level = excluded.automation_level,
      source_master_updated_at = excluded.source_master_updated_at, imported_at = now(),
      source_snapshot = excluded.source_snapshot, updated_at = now();
    for v_service_key, v_service in
      select key, value from jsonb_each(coalesce(v_offer->'services','{}'::jsonb))
    loop
      if v_service_key not in ('machimamo','machiibe') or jsonb_typeof(v_service) <> 'object' then
        raise exception 'invalid service key or service payload' using errcode = '22023';
      end if;
      if v_service ?| array['html','raw_html','tag_html','complete_ad_tag'] then
        raise exception 'raw HTML tags are not accepted' using errcode = '22023';
      end if;
      insert into public.asp_runtime_service_offers(
        offer_id, service_key, source_listing_allowed, source_media_approved,
        web_approval_status, app_approval_status, sns_approval_status, line_approval_status,
        tracking_url, creative_type, creative_url, impression_tracking_url,
        point_reward_allowed, reward_rule_confirmed, reward_rule, reward_amount, reward_rate,
        valid_from, valid_until, last_verified_at, source_master_updated_at, updated_at
      ) values (
        v_offer_id, v_service_key, coalesce((v_service->>'source_listing_allowed')::boolean,false),
        coalesce((v_service->>'source_media_approved')::boolean,false),
        coalesce(nullif(v_service->>'web_approval_status',''),'unknown'),
        coalesce(nullif(v_service->>'app_approval_status',''),'unknown'),
        coalesce(nullif(v_service->>'sns_approval_status',''),'unknown'),
        coalesce(nullif(v_service->>'line_approval_status',''),'unknown'),
        nullif(v_service->>'tracking_url',''), nullif(v_service->>'creative_type',''),
        nullif(v_service->>'creative_url',''), nullif(v_service->>'impression_tracking_url',''),
        coalesce((v_service->>'point_reward_allowed')::boolean,false),
        coalesce((v_service->>'reward_rule_confirmed')::boolean,false),
        coalesce(v_service->'reward_rule','{}'::jsonb),
        nullif(v_service->>'reward_amount','')::numeric, nullif(v_service->>'reward_rate','')::numeric,
        nullif(v_service->>'valid_from','')::timestamptz, nullif(v_service->>'valid_until','')::timestamptz,
        nullif(v_service->>'last_verified_at','')::timestamptz, p_source_master_updated_at, now()
      ) on conflict (offer_id, service_key) do update set
        source_listing_allowed = excluded.source_listing_allowed,
        source_media_approved = excluded.source_media_approved,
        web_approval_status = excluded.web_approval_status,
        app_approval_status = excluded.app_approval_status,
        sns_approval_status = excluded.sns_approval_status,
        line_approval_status = excluded.line_approval_status,
        tracking_url = excluded.tracking_url, creative_type = excluded.creative_type,
        creative_url = excluded.creative_url, impression_tracking_url = excluded.impression_tracking_url,
        point_reward_allowed = excluded.point_reward_allowed,
        reward_rule_confirmed = excluded.reward_rule_confirmed, reward_rule = excluded.reward_rule,
        reward_amount = excluded.reward_amount, reward_rate = excluded.reward_rate,
        valid_from = excluded.valid_from, valid_until = excluded.valid_until,
        last_verified_at = excluded.last_verified_at,
        source_master_updated_at = excluded.source_master_updated_at, updated_at = now();
    end loop;
    v_count := v_count + 1;
  end loop;
  insert into public.admin_audit_log(action,target_type,target_id,detail,actor_user_id)
  values ('asp_runtime_imported','asp_master',p_source_master_updated_at::text,
    jsonb_build_object('offer_count',v_count,'source_master_updated_at',p_source_master_updated_at),v_actor);
  return v_count;
end;
$$;

create or replace function public.admin_list_asp_runtime(p_password text)
returns table (
  offer_id text, asp text, program_id text, advertiser_name text, offer_name text,
  category text, service_key text, approval_status text, source_listing_allowed boolean,
  source_media_approved boolean, web_approval_status text, app_approval_status text,
  sns_approval_status text, line_approval_status text, tracking_url text,
  creative_type text, creative_url text, impression_tracking_url text,
  publish_status text, listing_enabled boolean, point_reward_allowed boolean,
  reward_rule_confirmed boolean, reward_rule jsonb, reward_amount numeric,
  reward_rate numeric, automation_level text, placements jsonb, click_count bigint,
  last_verified_at timestamptz, source_master_updated_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid();
begin
  perform public.admin_validate(p_password);
  return query
  select o.offer_id,o.asp,o.program_id,o.advertiser_name,o.offer_name,o.category,
    s.service_key,o.approval_status,s.source_listing_allowed,s.source_media_approved,
    s.web_approval_status,s.app_approval_status,s.sns_approval_status,s.line_approval_status,
    s.tracking_url,s.creative_type,s.creative_url,s.impression_tracking_url,s.publish_status,
    s.listing_enabled,s.point_reward_allowed,s.reward_rule_confirmed,s.reward_rule,
    s.reward_amount,s.reward_rate,o.automation_level,
    coalesce((select jsonb_agg(jsonb_build_object(
      'placement_id',p.placement_id,'enabled',p.enabled,'sort_order',p.sort_order,
      'valid_from',p.valid_from,'valid_until',p.valid_until) order by p.sort_order)
      from public.asp_runtime_placements p
      where p.offer_id=s.offer_id and p.service_key=s.service_key),'[]'::jsonb),
    (select count(*) from public.asp_runtime_clicks c
      where c.offer_id=s.offer_id and c.service_key=s.service_key),
    s.last_verified_at,s.source_master_updated_at
  from public.asp_runtime_offers o
  join public.asp_runtime_service_offers s on s.offer_id=o.offer_id
  order by o.offer_name,s.service_key;
end;
$$;

create or replace function public.record_asp_offer_click(
  p_offer_id text,
  p_service_key text,
  p_placement_id text,
  p_source_screen text,
  p_anonymous_session_id uuid default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_click_id uuid;
begin
  if p_source_screen is null or length(p_source_screen) not between 1 and 100 then
    raise exception 'invalid source screen' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.get_asp_offers_for_placement(p_service_key, p_placement_id) x
    where x.offer_id = p_offer_id
  ) then
    raise exception 'offer is not currently publishable' using errcode = '42501';
  end if;
  if auth.uid() is null and p_anonymous_session_id is null then
    raise exception 'anonymous session required' using errcode = '22023';
  end if;
  insert into public.asp_runtime_clicks(
    offer_id, service_key, placement_id, user_id, anonymous_session_id, source_screen
  ) values (
    p_offer_id, p_service_key, p_placement_id, auth.uid(),
    case when auth.uid() is null then p_anonymous_session_id else null end,
    p_source_screen
  ) returning click_id into v_click_id;
  return v_click_id;
end;
$$;

create or replace function public.admin_set_asp_publication(
  p_password text,
  p_offer_id text,
  p_service_key text,
  p_publish_status text,
  p_listing_enabled boolean,
  p_placements jsonb default '[]'::jsonb
)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_item jsonb;
begin
  perform public.admin_validate(p_password);
  if p_publish_status not in ('draft','active','paused','ended') then
    raise exception 'invalid publish status' using errcode = '22023';
  end if;
  if jsonb_typeof(p_placements) <> 'array' or jsonb_array_length(p_placements) > 30 then
    raise exception 'invalid placements' using errcode = '22023';
  end if;
  update public.asp_runtime_service_offers s
    set publish_status = p_publish_status, listing_enabled = p_listing_enabled, updated_at = now()
    where s.offer_id = p_offer_id and s.service_key = p_service_key;
  if not found then raise exception 'offer not found' using errcode = 'P0002'; end if;
  update public.asp_runtime_placements p set enabled = false, updated_at = now()
    where p.offer_id = p_offer_id and p.service_key = p_service_key
      and not exists (
        select 1 from jsonb_array_elements(p_placements) x
        where x->>'placement_id' = p.placement_id
      );
  for v_item in select value from jsonb_array_elements(p_placements) loop
    if coalesce(v_item->>'placement_id','') !~ '^[a-z0-9][a-z0-9._-]{0,79}$' then
      raise exception 'invalid placement id' using errcode = '22023';
    end if;
    insert into public.asp_runtime_placements(
      offer_id, service_key, placement_id, enabled, sort_order, valid_from, valid_until
    ) values (
      p_offer_id, p_service_key, v_item->>'placement_id',
      coalesce((v_item->>'enabled')::boolean,false),
      coalesce((v_item->>'sort_order')::integer,100),
      nullif(v_item->>'valid_from','')::timestamptz,
      nullif(v_item->>'valid_until','')::timestamptz
    ) on conflict (offer_id,service_key,placement_id) do update set
      enabled = excluded.enabled, sort_order = excluded.sort_order,
      valid_from = excluded.valid_from, valid_until = excluded.valid_until, updated_at = now();
  end loop;
  insert into public.admin_audit_log(action,target_type,target_id,detail,actor_user_id)
  values ('asp_publication_updated','asp_offer',p_offer_id,
    jsonb_build_object('service_key',p_service_key,'publish_status',p_publish_status,
      'listing_enabled',p_listing_enabled,'placements',p_placements),v_actor);
end;
$$;

revoke execute on function public.get_asp_offers_for_placement(text,text) from public;
revoke execute on function public.record_asp_offer_click(text,text,text,text,uuid) from public;
revoke execute on function public.admin_import_asp_runtime(text,timestamptz,jsonb) from public, anon;
revoke execute on function public.admin_list_asp_runtime(text) from public, anon;
revoke execute on function public.admin_set_asp_publication(text,text,text,text,boolean,jsonb) from public, anon;
grant execute on function public.get_asp_offers_for_placement(text,text) to anon, authenticated;
grant execute on function public.record_asp_offer_click(text,text,text,text,uuid) to anon, authenticated;
grant execute on function public.admin_import_asp_runtime(text,timestamptz,jsonb) to authenticated;
grant execute on function public.admin_list_asp_runtime(text) to authenticated;
grant execute on function public.admin_set_asp_publication(text,text,text,text,boolean,jsonb) to authenticated;

commit;
