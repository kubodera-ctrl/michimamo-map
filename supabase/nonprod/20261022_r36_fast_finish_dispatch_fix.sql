-- NONPROD-only: queued consumer may finish before Cron receives Queue.send() ACK.
-- In that race, completion is the strongest durable evidence of successful
-- dispatch; marking sent must not downgrade or fail a completed job.
CREATE OR REPLACE FUNCTION public.machiibe_nonprod_mark_dispatched_r36(p_outbox_id uuid,p_token uuid)
 RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_source bigint;v_status text;v_token uuid;v_lease timestamptz;
BEGIN
 SELECT d.source_id,d.status,d.claim_token,d.lease_until INTO v_source,v_status,v_token,v_lease
 FROM public.machiibe_nonprod_dispatch_outbox d WHERE d.id=p_outbox_id FOR UPDATE;
 IF v_source IS NULL THEN RETURN false;END IF;
 IF v_status IN ('sent','complete') THEN RETURN true;END IF;
 IF v_status<>'claimed' OR v_token IS DISTINCT FROM p_token OR v_lease<now() THEN RETURN false;END IF;
 UPDATE public.machiibe_nonprod_dispatch_outbox SET status='sent',claim_token=NULL,lease_until=NULL,
 sent_at=now(),updated_at=now() WHERE id=p_outbox_id;
 UPDATE public.regional_sources SET last_checked_at=now(),updated_at=now() WHERE id=v_source;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.machiibe_nonprod_mark_dispatched_r36(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.machiibe_nonprod_mark_dispatched_r36(uuid,uuid) TO service_role;
