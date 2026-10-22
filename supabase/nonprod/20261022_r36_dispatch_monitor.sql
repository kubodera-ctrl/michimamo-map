-- Non-production only: durable, bounded scheduler + dispatch + audit. Never apply to Production.
-- Requires R33/R34 and keeps all Source approvals, public events and existing RLS intact.
DO $preflight$
BEGIN
 IF to_regclass('public.machiibe_ingest_jobs') IS NULL
 OR to_regclass('public.machiibe_ingest_items') IS NULL
 OR to_regclass('public.regional_sources') IS NULL
 OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='machiibe_ingest_items' AND column_name='receipt_key') THEN
   RAISE EXCEPTION 'R36_REQUIRES_R33_AND_R34_NONPROD';
 END IF;
 IF to_regclass('public.machiibe_nonprod_dispatch_outbox') IS NOT NULL THEN
   RAISE EXCEPTION 'R36_ALREADY_APPLIED_MANUAL_REVIEW_REQUIRED';
 END IF;
END $preflight$;

CREATE TABLE public.machiibe_nonprod_dispatch_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_id bigint NOT NULL REFERENCES public.regional_sources(id),
 job_id uuid NOT NULL UNIQUE REFERENCES public.machiibe_ingest_jobs(id),
 idempotency_key text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','sent','complete','dead_letter')),
 claim_token uuid,
 lease_until timestamptz,
 attempts int NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 12),
 last_error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz,
 completed_at timestamptz,
 CHECK ((status='claimed') = (claim_token IS NOT NULL)),
 CHECK (status <> 'claimed' OR lease_until IS NOT NULL)
);
CREATE INDEX machiibe_nonprod_dispatch_due_idx ON public.machiibe_nonprod_dispatch_outbox(status,updated_at,id);
CREATE INDEX machiibe_nonprod_dispatch_source_idx ON public.machiibe_nonprod_dispatch_outbox(source_id,status);

CREATE TABLE public.machiibe_nonprod_job_receipts (
 job_id uuid NOT NULL REFERENCES public.machiibe_ingest_jobs(id) ON DELETE CASCADE,
 receipt_key text NOT NULL REFERENCES public.machiibe_ingest_items(receipt_key) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (job_id,receipt_key)
);
CREATE TABLE public.machiibe_nonprod_scheduler_ticks (
 slot_utc bigint PRIMARY KEY CHECK(slot_utc>=0),
 scheduled_at timestamptz NOT NULL,
 sources_scanned int NOT NULL CHECK(sources_scanned BETWEEN 0 AND 100),
 eligible_sources int NOT NULL CHECK(eligible_sources BETWEEN 0 AND 100),
 due_sources int NOT NULL CHECK(due_sources BETWEEN 0 AND 100),
 registered_jobs int NOT NULL CHECK(registered_jobs BETWEEN 0 AND 3),
 dispatched_jobs int NOT NULL CHECK(dispatched_jobs BETWEEN 0 AND 3),
 stalled_jobs int NOT NULL CHECK(stalled_jobs BETWEEN 0 AND 100),
 failed_jobs int NOT NULL CHECK(failed_jobs BETWEEN 0 AND 100),
 dead_letters int NOT NULL CHECK(dead_letters BETWEEN 0 AND 100),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.machiibe_nonprod_monitor_alerts (
 fingerprint text PRIMARY KEY CHECK (char_length(fingerprint) BETWEEN 4 AND 180),
 alert_code text NOT NULL CHECK(alert_code ~ '^[A-Z_]{4,45}$'),
 source_id bigint REFERENCES public.regional_sources(id) ON DELETE SET NULL,
 severity text NOT NULL CHECK(severity IN ('info','warning')),
 first_seen_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 occurrences int NOT NULL DEFAULT 1 CHECK (occurrences BETWEEN 1 AND 1000000),
 delivered_at timestamptz,
 CHECK (delivered_at IS NULL) -- notifications remain OFF
);

ALTER TABLE public.machiibe_nonprod_dispatch_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machiibe_nonprod_job_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machiibe_nonprod_scheduler_ticks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machiibe_nonprod_monitor_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.machiibe_nonprod_dispatch_outbox,public.machiibe_nonprod_job_receipts,public.machiibe_nonprod_scheduler_ticks,public.machiibe_nonprod_monitor_alerts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.machiibe_nonprod_dispatch_outbox,public.machiibe_nonprod_job_receipts,public.machiibe_nonprod_scheduler_ticks,public.machiibe_nonprod_monitor_alerts TO service_role;

-- Source locks serialize concurrent scheduler ticks. Everything in this function is one transaction.
CREATE FUNCTION public.machiibe_nonprod_register_due_r36(
 p_source_id bigint,p_idempotency_key text,p_scheduled_at timestamptz
) RETURNS TABLE(job_id uuid,outbox_id uuid,created boolean)
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE s public.regional_sources%rowtype; v_freq integer;v_slot bigint; v_backoff integer; v_job uuid; v_out uuid;
BEGIN
 IF p_source_id IS NULL OR p_source_id<1 OR p_scheduled_at IS NULL OR p_scheduled_at > now()+interval '5 minutes'
   OR p_scheduled_at < now()-interval '15 minutes' THEN RAISE EXCEPTION 'R36_INVALID_DUE_PARAMETERS'; END IF;
 SELECT * INTO s FROM public.regional_sources WHERE id=p_source_id FOR UPDATE;
 IF NOT FOUND OR s.is_active IS NOT TRUE OR s.automated_fetch_allowed IS NOT TRUE
   OR s.event_use_allowed IS NOT TRUE OR s.terms_review_status<>'reviewed_allowed'
   OR s.acquisition_mode NOT IN ('official_page_monitor','official_api','open_data','rss','partner_feed')
   OR s.robots_status NOT IN ('allowed','not_applicable') OR s.commercial_use_status<>'allowed'
   OR s.reuse_status<>'allowed' OR s.redistribution_status<>'allowed' OR s.cache_status<>'allowed'
   OR s.source_stage NOT IN ('FETCH_ALLOWED','DRY_RUN_PASS','PREVIEW_ENABLED','PRODUCTION_REVIEW')
   OR s.fetch_method IS NULL OR s.fetch_method='MANUAL'
   OR s.update_frequency_minutes NOT BETWEEN 15 AND 525600
   OR s.last_terms_checked_at IS NULL OR s.last_terms_checked_at > p_scheduled_at
   OR nullif(btrim(s.attribution_requirement),'') IS NULL
   OR NOT (coalesce(s.data_url,s.homepage_url) ~* '^https://') THEN
     RAISE EXCEPTION 'R36_SOURCE_POLICY_BLOCKED';
 END IF;
 v_freq:=s.update_frequency_minutes;
 v_slot:=floor(extract(epoch from p_scheduled_at)/(v_freq*60))::bigint;
 IF p_idempotency_key IS DISTINCT FROM ('r36:nonprod:'||p_source_id||':'||v_freq||':'||v_slot) THEN
   RAISE EXCEPTION 'R36_SLOT_KEY_MISMATCH';
 END IF;
 v_backoff:=least(16,round(power(2,least(4,greatest(coalesce(s.consecutive_failures,0),0))))::int);
 IF s.last_checked_at IS NOT NULL AND s.last_checked_at+(v_freq*v_backoff||' minutes')::interval>p_scheduled_at THEN
   RETURN; END IF;
 -- At most one unfinished dispatch for a source. Prevents overlapping schedules.
 IF EXISTS(SELECT 1 FROM public.machiibe_nonprod_dispatch_outbox d WHERE d.source_id=p_source_id
   AND d.status IN ('pending','claimed','sent')) THEN RETURN; END IF;
 -- Limit project-level new jobs to 48/day even if Worker is accidentally invoked too often.
 IF (SELECT count(*) FROM public.machiibe_nonprod_dispatch_outbox WHERE created_at>=date_trunc('day',p_scheduled_at)
   AND created_at<date_trunc('day',p_scheduled_at)+interval '1 day') >= 48 THEN
   RAISE EXCEPTION 'R36_DAILY_BUDGET_BLOCKED'; END IF;
 INSERT INTO public.machiibe_ingest_jobs(source_id,idempotency_key,status,requested_by,requested_at)
 VALUES(p_source_id,p_idempotency_key,'queued','r36-nonprod-scheduler',p_scheduled_at)
 ON CONFLICT(idempotency_key) DO NOTHING RETURNING id INTO v_job;
 IF v_job IS NULL THEN RETURN; END IF;
 INSERT INTO public.machiibe_nonprod_dispatch_outbox(source_id,job_id,idempotency_key)
 VALUES(p_source_id,v_job,p_idempotency_key) RETURNING id INTO v_out;
 RETURN QUERY SELECT v_job,v_out,true;
END $$;

-- Recover abandoned claims after 120s and re-send unconfirmed sent jobs after 30 minutes.
-- At-least-once queue behavior; the ingest receipt + per-job link make retries idempotent.
CREATE FUNCTION public.machiibe_nonprod_claim_dispatch_r36(p_limit integer DEFAULT 3)
 RETURNS TABLE(outbox_id uuid,job_id uuid,source_id bigint,claim_token uuid)
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_limit IS NULL OR p_limit<1 OR p_limit>3 THEN RAISE EXCEPTION 'R36_DISPATCH_BATCH_OUT_OF_BOUNDS'; END IF;
 RETURN QUERY
 WITH picked AS (
   SELECT d.id FROM public.machiibe_nonprod_dispatch_outbox d
   JOIN public.regional_sources s ON s.id=d.source_id
   WHERE ((d.status='pending') OR (d.status='claimed' AND d.lease_until<now())
      OR (d.status='sent' AND d.updated_at<now()-interval '30 minutes'))
     AND d.attempts<6 AND s.is_active AND s.automated_fetch_allowed
     AND s.event_use_allowed AND s.terms_review_status='reviewed_allowed'
     AND s.source_stage IN ('FETCH_ALLOWED','DRY_RUN_PASS','PREVIEW_ENABLED','PRODUCTION_REVIEW')
     AND s.robots_status IN ('allowed','not_applicable')
     AND s.commercial_use_status='allowed' AND s.reuse_status='allowed'
     AND s.redistribution_status='allowed' AND s.cache_status='allowed'
     AND s.last_terms_checked_at IS NOT NULL AND s.last_terms_checked_at<=now()
     AND nullif(btrim(s.attribution_requirement),'') IS NOT NULL
   ORDER BY d.created_at,d.id FOR UPDATE OF d SKIP LOCKED LIMIT p_limit
 )
 UPDATE public.machiibe_nonprod_dispatch_outbox d
 SET status='claimed',claim_token=gen_random_uuid(),lease_until=now()+interval '120 seconds',
     attempts=attempts+1,updated_at=now()
 FROM picked WHERE d.id=picked.id
 RETURNING d.id,d.job_id,d.source_id,d.claim_token;
END $$;

CREATE FUNCTION public.machiibe_nonprod_mark_dispatched_r36(p_outbox_id uuid,p_token uuid)
 RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_source bigint;
BEGIN
 UPDATE public.machiibe_nonprod_dispatch_outbox SET status='sent',claim_token=NULL,lease_until=NULL,
   sent_at=now(),updated_at=now()
 WHERE id=p_outbox_id AND status='claimed' AND claim_token=p_token AND lease_until>=now()
 RETURNING source_id INTO v_source;
 IF v_source IS NULL THEN RETURN false;END IF;
 UPDATE public.regional_sources SET last_checked_at=now(),updated_at=now() WHERE id=v_source;
 RETURN true;
END $$;

CREATE FUNCTION public.machiibe_nonprod_release_claim_r36(p_outbox_id uuid,p_token uuid,p_error text)
 RETURNS boolean LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 WITH updated AS (UPDATE public.machiibe_nonprod_dispatch_outbox
 SET status='pending',claim_token=NULL,lease_until=NULL,updated_at=now(),last_error_code=left(coalesce(p_error,'dispatch_failure'),80)
 WHERE id=p_outbox_id AND status='claimed' AND claim_token=p_token
 RETURNING id) SELECT EXISTS(SELECT 1 FROM updated);
$$;

CREATE FUNCTION public.machiibe_nonprod_finish_dispatch_r36(p_job_id uuid,p_success boolean,p_error text DEFAULT NULL)
 RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_source bigint;v_status text;
BEGIN
 SELECT d.source_id,d.status INTO v_source,v_status
 FROM public.machiibe_nonprod_dispatch_outbox d WHERE d.job_id=p_job_id FOR UPDATE;
 IF v_source IS NULL THEN RETURN false; END IF;
 IF v_status='complete' AND p_success IS TRUE THEN RETURN true; END IF;
 IF v_status='dead_letter' AND p_success IS FALSE THEN RETURN true; END IF;
 IF v_status NOT IN ('claimed','sent') THEN RETURN false; END IF;
 UPDATE public.machiibe_nonprod_dispatch_outbox SET
 status=CASE WHEN p_success THEN 'complete' ELSE 'dead_letter' END,
 claim_token=NULL,lease_until=NULL,last_error_code=CASE WHEN p_success THEN NULL ELSE left(coalesce(p_error,'source_rejected'),80) END,
 completed_at=now(),updated_at=now() WHERE job_id=p_job_id;
 IF p_success THEN
   UPDATE public.regional_sources SET last_success_at=now(),last_checked_at=now(),consecutive_failures=0,
   fetch_status='healthy',updated_at=now() WHERE id=v_source;
 ELSE
   UPDATE public.regional_sources SET last_failure_at=now(),consecutive_failures=consecutive_failures+1,
   fetch_status='degraded',updated_at=now() WHERE id=v_source;
 END IF;
 RETURN true;
END $$;

-- Map an immutable content-addressed receipt to every job that consumed it.
CREATE FUNCTION public.machiibe_nonprod_link_job_receipts_r36(p_job_id uuid,p_receipt_keys text[])
 RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_source bigint;v_matching integer;v_linked integer;
BEGIN
 IF p_job_id IS NULL OR p_receipt_keys IS NULL OR cardinality(p_receipt_keys) NOT BETWEEN 1 AND 200
 OR cardinality(p_receipt_keys)<>(SELECT count(DISTINCT x) FROM unnest(p_receipt_keys) x) THEN
   RAISE EXCEPTION 'R36_INVALID_RECEIPT_BATCH';END IF;
 SELECT source_id INTO v_source FROM public.machiibe_ingest_jobs WHERE id=p_job_id;
 IF v_source IS NULL THEN RAISE EXCEPTION 'R36_JOB_NOT_REGISTERED';END IF;
 SELECT count(*) INTO v_matching FROM public.machiibe_ingest_items
 WHERE receipt_key=ANY(p_receipt_keys) AND source_id=v_source;
 IF v_matching<>cardinality(p_receipt_keys) THEN RAISE EXCEPTION 'R36_MISSING_RECEIPT';END IF;
 INSERT INTO public.machiibe_nonprod_job_receipts(job_id,receipt_key)
 SELECT p_job_id,unnest(p_receipt_keys) ON CONFLICT DO NOTHING;
 SELECT count(*) INTO v_linked FROM public.machiibe_nonprod_job_receipts
 WHERE job_id=p_job_id AND receipt_key=ANY(p_receipt_keys);
 IF v_linked<>cardinality(p_receipt_keys) THEN RAISE EXCEPTION 'R36_RECEIPT_LINK_NOT_PERSISTED';END IF;
 RETURN v_linked;
END $$;

CREATE FUNCTION public.machiibe_nonprod_record_tick_r36(
 p_slot bigint,p_scheduled_at timestamptz,p_stats jsonb,p_alerts jsonb DEFAULT '[]'::jsonb)
 RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE a jsonb;v_source bigint;v_fp text;v_code text;v_severity text;
BEGIN
 IF p_scheduled_at IS NULL OR p_slot<>floor(extract(epoch from p_scheduled_at)/3600)::bigint
    OR p_stats IS NULL OR jsonb_typeof(p_stats)<>'object'
    OR p_alerts IS NULL OR jsonb_typeof(p_alerts)<>'array' OR jsonb_array_length(p_alerts)>40 THEN
   RAISE EXCEPTION 'R36_TICK_CONTRACT_INVALID';END IF;
 INSERT INTO public.machiibe_nonprod_scheduler_ticks(slot_utc,scheduled_at,sources_scanned,eligible_sources,due_sources,
 registered_jobs,dispatched_jobs,stalled_jobs,failed_jobs,dead_letters)
 VALUES(p_slot,p_scheduled_at,
 (p_stats->>'scanned')::int,(p_stats->>'eligible')::int,(p_stats->>'due')::int,
 (p_stats->>'registered')::int,(p_stats->>'dispatched')::int,(p_stats->>'stalled')::int,
 (p_stats->>'failed')::int,(p_stats->>'dead_letter')::int)
 ON CONFLICT(slot_utc) DO UPDATE SET recorded_at=now(),
 sources_scanned=excluded.sources_scanned,eligible_sources=excluded.eligible_sources,
 due_sources=excluded.due_sources,registered_jobs=excluded.registered_jobs,
 dispatched_jobs=excluded.dispatched_jobs,stalled_jobs=excluded.stalled_jobs,
 failed_jobs=excluded.failed_jobs,dead_letters=excluded.dead_letters;
 FOR a IN SELECT value FROM jsonb_array_elements(p_alerts) LOOP
   v_fp=a->>'fingerprint'; v_code=a->>'code'; v_severity=a->>'severity';
   v_source=CASE WHEN a ? 'sourceId' AND (a->>'sourceId') ~ '^[0-9]{1,12}$' THEN (a->>'sourceId')::bigint ELSE NULL END;
   IF v_fp IS NULL OR length(v_fp) NOT BETWEEN 4 AND 180
       OR v_code !~ '^[A-Z_]{4,45}$' OR v_severity NOT IN ('info','warning') THEN
     RAISE EXCEPTION 'R36_INVALID_MONITOR_ALERT';END IF;
   INSERT INTO public.machiibe_nonprod_monitor_alerts(fingerprint,alert_code,source_id,severity)
   VALUES(v_fp,v_code,v_source,v_severity)
   ON CONFLICT(fingerprint) DO UPDATE SET last_seen_at=now(),
      occurrences=least(1000000,public.machiibe_nonprod_monitor_alerts.occurrences+1);
 END LOOP;
 RETURN true;
END $$;

-- Private service-only surface; tables default to deny all via RLS.
DO $restrict$
DECLARE r record;
BEGIN
 FOR r IN SELECT oid::regprocedure AS signature FROM pg_proc
 WHERE pronamespace='public'::regnamespace AND proname LIKE 'machiibe_nonprod_%_r36'
 LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',r.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',r.signature);
 END LOOP;
END $restrict$;
