-- DEV41 β publication gates. CODE-ONLY: do not apply to Production before explicit owner release approval.
-- ASP Runtime discovery metadata / browse-and-sort contract.
-- Source of truth remains Google Sheets ASP2 CURRENT. This migration is code-only until explicitly applied.
begin;

alter table public.asp_runtime_service_offers
  add column if not exists media_conditions_verified boolean not null default false,
  add column if not exists link_verified boolean not null default false,
  add column if not exists reward_permission text not null default 'unknown'
    check (reward_permission in ('allowed','denied','unknown')),
  add column if not exists reward_enabled boolean not null default false,
  add column if not exists reward_fixed_points integer
    check (reward_fixed_points is null or reward_fixed_points >= 0),
  add column if not exists action_type text
    check (action_type is null or action_type in (
      'free_registration','app_install','document_request','bank_account_opening',
      'purchase','service_contract','reservation','application','other'
    )),
  add column if not exists cost_type text
    check (cost_type is null or cost_type in ('free','paid')),
  add column if not exists purchase_required boolean,
  add column if not exists estimated_available_days integer
    check (estimated_available_days is null or estimated_available_days between 0 and 3650),
  add column if not exists source_added_at date,
  add column if not exists recommendation_rank integer
    check (recommendation_rank is null or recommendation_rank between 1 and 1000000),
  add column if not exists recommendation_note text,
  add column if not exists conversion_conditions text;

alter table public.asp_runtime_service_offers
  drop constraint if exists asp_runtime_beta_reward_off;
alter table public.asp_runtime_service_offers
  add constraint asp_runtime_beta_reward_off check (reward_enabled = false);

alter table public.asp_runtime_service_offers
  drop constraint if exists asp_runtime_reward_enabled_gate;
alter table public.asp_runtime_service_offers
  add constraint asp_runtime_reward_enabled_gate check (
    not reward_enabled or (
      reward_permission = 'allowed'
      and point_reward_allowed
      and reward_rule_confirmed
      and (reward_fixed_points is not null or reward_rate is not null)
      and reward_rule <> '{}'::jsonb
    )
  );

create or replace function public.get_asp_offers_for_placement(
  p_service_key text,
  p_placement_id text
)
returns table (
  offer_id text, asp text, program_id text, advertiser_name text, offer_name text,
  category text, creative_type text, creative_url text, tracking_url text,
  impression_tracking_url text,
  point_reward_allowed boolean, reward_rule jsonb, reward_amount numeric, reward_rate numeric
)
language sql stable security definer set search_path = '' as $$
  select o.offer_id, o.asp, o.program_id, o.advertiser_name, o.offer_name,
         o.category, s.creative_type, s.creative_url, s.tracking_url,
         s.impression_tracking_url,
         (s.reward_enabled and s.reward_permission = 'allowed' and s.point_reward_allowed and s.reward_rule_confirmed),
         case when s.reward_enabled and s.reward_permission = 'allowed' and s.point_reward_allowed and s.reward_rule_confirmed then s.reward_rule else '{}'::jsonb end,
         case when s.reward_enabled and s.reward_permission = 'allowed' and s.point_reward_allowed and s.reward_rule_confirmed then s.reward_amount else null end,
         case when s.reward_enabled and s.reward_permission = 'allowed' and s.point_reward_allowed and s.reward_rule_confirmed then s.reward_rate else null end
  from public.asp_runtime_offers o
  join public.asp_runtime_service_offers s on s.offer_id = o.offer_id
  join public.asp_runtime_placements p on p.offer_id = s.offer_id and p.service_key = s.service_key
  where p.service_key = p_service_key
    and p.placement_id = p_placement_id
    and p_service_key in ('machimamo','machiibe')
    and o.approval_status = 'approved'
    and s.source_listing_allowed
    and s.source_media_approved
    and s.production_listing_approved
    and s.media_conditions_verified
    and s.link_verified
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

create or replace function public.get_asp_offers_for_discovery(
  p_service_key text,
  p_placement_id text
)
returns table (
  offer_id text, offer_name text, category text, tracking_url text,
  creative_type text, creative_url text,
  reward_enabled boolean, reward_fixed_points integer, reward_rate numeric,
  action_type text, cost_type text, purchase_required boolean,
  estimated_available_days integer, source_added_at date,
  recommendation_rank integer, recommendation_note text,
  conversion_conditions text, placement_sort_order integer, popularity_count bigint
)
language sql stable security definer set search_path = '' as $$
  select o.offer_id, o.offer_name, o.category, s.tracking_url,
         s.creative_type, s.creative_url,
         (s.reward_enabled and s.reward_permission = 'allowed' and s.point_reward_allowed and s.reward_rule_confirmed),
         case when s.reward_enabled and s.reward_permission = 'allowed' and s.point_reward_allowed and s.reward_rule_confirmed then s.reward_fixed_points else null end,
         case when s.reward_enabled and s.reward_permission = 'allowed' and s.point_reward_allowed and s.reward_rule_confirmed then s.reward_rate else null end,
         s.action_type, s.cost_type, s.purchase_required,
         s.estimated_available_days, s.source_added_at,
         s.recommendation_rank, s.recommendation_note,
         s.conversion_conditions, p.sort_order,
         (select count(*) from public.asp_runtime_clicks c
           where c.offer_id = s.offer_id and c.service_key = s.service_key)
  from public.asp_runtime_offers o
  join public.asp_runtime_service_offers s on s.offer_id = o.offer_id
  join public.asp_runtime_placements p on p.offer_id = s.offer_id and p.service_key = s.service_key
  where p.service_key = p_service_key
    and p.placement_id = p_placement_id
    and p_service_key in ('machimamo','machiibe')
    and o.approval_status = 'approved'
    and s.source_listing_allowed
    and s.source_media_approved
    and s.production_listing_approved
    and s.media_conditions_verified
    and s.link_verified
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
    if v_asp is null or v_program_id is null or v_offer_id is null
       or v_offer_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$'
       or nullif(trim(v_offer->>'advertiser_name'),'') is null
       or nullif(trim(v_offer->>'offer_name'),'') is null then
      raise exception 'stable source offer_id, program_id, and labels are required' using errcode = '22023';
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
      production_listing_approved, media_conditions_verified, link_verified,
      web_approval_status, app_approval_status, sns_approval_status, line_approval_status,
        tracking_url, creative_type, creative_url, impression_tracking_url,
        reward_permission, reward_enabled, point_reward_allowed, reward_rule_confirmed,
        reward_rule, reward_fixed_points, reward_amount, reward_rate,
        action_type, cost_type, purchase_required, estimated_available_days,
        source_added_at, recommendation_rank, recommendation_note, conversion_conditions,
        valid_from, valid_until, last_verified_at, source_master_updated_at, updated_at
      ) values (
        v_offer_id, v_service_key, coalesce((v_service->>'source_listing_allowed')::boolean,false),
        coalesce((v_service->>'source_media_approved')::boolean,false),
        coalesce((v_service->>'production_listing_approved')::boolean,false),
        coalesce((v_service->>'media_conditions_verified')::boolean,false),
        coalesce((v_service->>'link_verified')::boolean,false),
        coalesce(nullif(v_service->>'web_approval_status',''),'unknown'),
        coalesce(nullif(v_service->>'app_approval_status',''),'unknown'),
        coalesce(nullif(v_service->>'sns_approval_status',''),'unknown'),
        coalesce(nullif(v_service->>'line_approval_status',''),'unknown'),
        nullif(v_service->>'tracking_url',''), nullif(v_service->>'creative_type',''),
        nullif(v_service->>'creative_url',''), nullif(v_service->>'impression_tracking_url',''),
        coalesce(nullif(v_service->>'reward_permission',''),'unknown'),
        coalesce((v_service->>'reward_enabled')::boolean,false),
        coalesce((v_service->>'point_reward_allowed')::boolean,false),
        coalesce((v_service->>'reward_rule_confirmed')::boolean,false),
        coalesce(v_service->'reward_rule','{}'::jsonb),
        nullif(v_service->>'reward_fixed_points','')::integer,
        nullif(v_service->>'reward_amount','')::numeric, nullif(v_service->>'reward_rate','')::numeric,
        nullif(v_service->>'action_type',''), nullif(v_service->>'cost_type',''),
        case when nullif(v_service->>'purchase_required','') is null then null else (v_service->>'purchase_required')::boolean end,
        nullif(v_service->>'estimated_available_days','')::integer,
        nullif(v_service->>'source_added_at','')::date,
        nullif(v_service->>'recommendation_rank','')::integer,
        nullif(v_service->>'recommendation_note',''), nullif(v_service->>'conversion_conditions',''),
        nullif(v_service->>'valid_from','')::timestamptz, nullif(v_service->>'valid_until','')::timestamptz,
        nullif(v_service->>'last_verified_at','')::timestamptz, p_source_master_updated_at, now()
      ) on conflict (offer_id, service_key) do update set
        source_listing_allowed = excluded.source_listing_allowed,
        source_media_approved = excluded.source_media_approved,
        production_listing_approved = excluded.production_listing_approved,
        media_conditions_verified = excluded.media_conditions_verified,
        link_verified = excluded.link_verified,
        web_approval_status = excluded.web_approval_status,
        app_approval_status = excluded.app_approval_status,
        sns_approval_status = excluded.sns_approval_status,
        line_approval_status = excluded.line_approval_status,
        tracking_url = excluded.tracking_url, creative_type = excluded.creative_type,
        creative_url = excluded.creative_url, impression_tracking_url = excluded.impression_tracking_url,
        reward_permission = excluded.reward_permission, reward_enabled = excluded.reward_enabled,
        point_reward_allowed = excluded.point_reward_allowed,
        reward_rule_confirmed = excluded.reward_rule_confirmed, reward_rule = excluded.reward_rule,
        reward_fixed_points = excluded.reward_fixed_points,
        reward_amount = excluded.reward_amount, reward_rate = excluded.reward_rate,
        action_type = excluded.action_type, cost_type = excluded.cost_type,
        purchase_required = excluded.purchase_required,
        estimated_available_days = excluded.estimated_available_days,
        source_added_at = excluded.source_added_at,
        recommendation_rank = excluded.recommendation_rank,
        recommendation_note = excluded.recommendation_note,
        conversion_conditions = excluded.conversion_conditions,
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


revoke execute on function public.get_asp_offers_for_discovery(text,text) from public;
grant execute on function public.get_asp_offers_for_discovery(text,text) to anon, authenticated;

commit;
