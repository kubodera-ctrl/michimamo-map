-- pg_net queues contain scheduler authentication headers; no client needs access.
revoke all on net.http_request_queue,net._http_response from public,anon,authenticated;
revoke usage on schema net from public,anon,authenticated;
-- Verification: hosted grants are owned by supabase_admin, so these revokes
-- did not remove inherited access. The follow-up one_time_scheduler_auth
-- migration removes the long-lived secret instead; do not treat this as a gate.
