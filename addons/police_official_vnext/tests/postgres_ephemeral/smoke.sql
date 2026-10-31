-- Only run in public GitHub Actions ephemeral postgres:17 container.
\set ON_ERROR_STOP on
select set_config('machimamo.test_uid','00000000-0000-0000-0000-000000000001',false);
do $$begin
 if (select enabled from public.police_official_release_gate) then raise exception 'Release gate must default OFF';end if;
 if has_table_privilege('authenticated','public.police_official_documents','select') then raise exception 'Authenticated has raw SELECT';end if;
 if has_table_privilege('anon','public.police_official_documents','select') then raise exception 'Anon should not access raw records';end if;
 if has_function_privilege('anon','public.admin_review_police_official(text,bigint,text,text,text,text,text)','execute') then raise exception 'Anon can review data';end if;
 if has_function_privilege('anon','public.admin_get_police_official_review(text)','execute') then raise exception 'Anon can list review queue';end if;
end;$$;
set role anon;
do $$declare r jsonb;begin
 r:=public.police_official_public_mail();
 if jsonb_array_length(r->'records')<>0 then raise exception 'Disabled release leaked rows';end if;
end;$$;
reset role;
set role service_role;
do $$declare r jsonb;begin
 r:=public.police_stage_official_document(jsonb_build_object(
  'dataset','mail','record_key','demo-case-00001','revision',1,
  'source_url','https://mail.keishicho.metro.tokyo.lg.jp/opendata/',
  'source_file_sha256',repeat('a',64),'content_hash',repeat('b',64),
  'payload',jsonb_build_object('source_id','tokyo_mail_keishicho_opendata','location_precision','municipality',
                             'latitude',null,'longitude',null,'title','架空の試験データ','area_label','架空区',
                             'private_raw_victim_details','NEVER_PUBLIC'),
  'source_status','active','source_id_verified',true,'is_fixture',false,'requires_review',false));
 if r->>'status'<>'staged_pending_review' then raise exception 'Initial stage failed';end if;
 -- Keep the ID returned by the trusted staging RPC. Do not allow an
 -- authenticated user to SELECT the raw documents table for its ID.
 perform set_config('machimamo.test_document_id',r->>'document_id',false);
 r:=public.police_stage_official_document(jsonb_build_object(
  'dataset','mail','record_key','demo-case-00001','revision',1,
  'source_url','https://mail.keishicho.metro.tokyo.lg.jp/opendata/',
  'source_file_sha256',repeat('a',64),'content_hash',repeat('b',64),
  'payload',jsonb_build_object('source_id','tokyo_mail_keishicho_opendata','location_precision','municipality'),
  'source_status','active','source_id_verified',true,'is_fixture',false,'requires_review',false));
 if r->>'status'<>'duplicate' then raise exception 'Idempotence failed';end if;
end;$$;
reset role;
set role authenticated;
do $$declare r jsonb;begin
 r:=public.admin_get_police_official_review('EXAMPLE_TEST_PASSWORD_ONLY');
 if (r->>'pending')::int<>1 or jsonb_array_length(r->'queue')<>1 then raise exception 'Reviewer queue missing';end if;
 r:=public.admin_review_police_official('EXAMPLE_TEST_PASSWORD_ONLY',
  current_setting('machimamo.test_document_id')::bigint,
  'approve',repeat('b',64),repeat('a',64),'https://mail.keishicho.metro.tokyo.lg.jp/opendata/policy','fixture_review_test');
 if r->>'reviewed'<>'true' then raise exception 'Approval failed';end if;
 if jsonb_array_length(public.police_official_public_mail()->'records')<>0 then
  raise exception 'Approved but release gate OFF should not show data';
 end if;
end;$$;
reset role;
-- A test-only temporary release gate activation validates actual public RPC
-- and immediately resets it to OFF in the DISPOSABLE test database.
-- NEVER use this operation against a persistent or real Supabase project.
update public.police_official_release_gate set enabled=true where id=true;
set role anon;
do $$declare j jsonb;begin
 j:=public.police_official_public_mail();
 if jsonb_array_length(j->'records')<>1 then raise exception 'Approved public mail record missing';end if;
 if (j->'records'->0) ? 'private_raw_victim_details' then raise exception 'PRIVATE SOURCE FIELD LEAK';end if;
 if j->'records'->0->>'id'<>'demo-case-00001' then raise exception 'Published identity mismatch';end if;
 if (j->'records'->0->>'review_status')<>'approved' then raise exception 'Approval label missing';end if;
end;$$;
reset role;
update public.police_official_release_gate set enabled=false where id=true;
set role service_role;
do $$declare r jsonb;begin
 r:=public.police_stage_official_document(jsonb_build_object(
  'dataset','mail','record_key','demo-case-00001','revision',2,
  'source_url','https://mail.keishicho.metro.tokyo.lg.jp/opendata/',
  'source_file_sha256',repeat('c',64),'content_hash',repeat('d',64),
  'payload',jsonb_build_object('source_id','tokyo_mail_keishicho_opendata','location_precision','municipality'),
  'source_status','withdrawn','source_id_verified',true,'is_fixture',false,'requires_review',false));
 if r->>'status'<>'staged_pending_review' then raise exception 'New revision failed';end if;
end;$$;
reset role;
do $$begin
 if (select count(*) from public.police_official_documents where latest)<>1 then
  raise exception 'Previous version still latest';
 end if;
 if (select count(*) from public.police_official_documents where latest and review_status='approved')<>0 then
  raise exception 'Withdrawn revision left public approval';
 end if;
 if (select count(*) from public.police_official_review_audit)<>1 then
  raise exception 'Review audit missing';
 end if;
 if (select count(*) from public.admin_audit_log where action='police_official_approve')<>1 then
  raise exception 'Existing admin audit integration missing';
 end if;
end;$$;
-- Synthetic cumulative-file test. NO real incidents or DB writes outside this disposable DB.
set role service_role;
do $$declare r jsonb;begin
 r:=public.police_stage_official_document(jsonb_build_object(
  'dataset','precursor','record_key','precursor:2026:09','revision',1,
  'source_url','https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/zencho.html',
  'source_file_sha256',repeat('e',64),'content_hash',repeat('f',64),
  'period_year',2026,'period_month',9,
  'payload',jsonb_build_object('records',jsonb_build_array(jsonb_build_object(
      'municipality','架空市','area_label','路上','event_type','声かけ',
      'recognized_count_cumulative',2,
      'record_count_basis','official_csv_rows_cumulative_not_unique_incidents',
      'private_victim_attribute','SHOULD_NOT_LEAK',
      'latitude',null,'longitude',null))),
  'source_status','active','source_id_verified',false,'is_fixture',false,'requires_review',false));
 if r->>'status'<>'staged_pending_review' then raise exception 'Precursory cumulative staging failure';end if;
 perform set_config('machimamo.test_precursor_doc_id',r->>'document_id',false);
end;$$;
reset role;
set role authenticated;
do $$declare r jsonb;begin
 r:=public.admin_review_police_official('EXAMPLE_TEST_PASSWORD_ONLY',
  current_setting('machimamo.test_precursor_doc_id')::bigint,
  'approve',repeat('f',64),repeat('e',64),
  'https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/zencho.html',
  'synthetic_precursor_approved_in_ephemeral_only');
 if r->>'reviewed'<>'true' then raise exception 'Synthetic precursor approval failed';end if;
end;$$;
reset role;
-- Enabling for a single SELECT in this disposable database is SAFE (never persistent).
update public.police_official_release_gate set enabled=true where id=true;
set role anon;
do $$declare j jsonb;declare item jsonb;begin
 j:=public.police_official_public_cumulative('precursor');
 if (j->>'publication_enabled')::boolean is distinct from true then raise exception 'Precursor public gate missing';end if;
 if jsonb_array_length(j->'releases')<>1 then raise exception 'Missing unique cumulative snapshot';end if;
 item:=j->'releases'->0->'records'->0;
 if (item->>'recognized_count_cumulative')::bigint<>2 then raise exception 'Cumulative count lost';end if;
 if item ? 'private_victim_attribute' then raise exception 'Sensitive precursor field leaked';end if;
 if item->>'record_count_basis'<>'official_csv_rows_cumulative_not_unique_incidents' then raise exception 'CSV row count distinction lost';end if;
 if item->>'latitude' is not null then raise exception 'Approximate crime point exposed';end if;
end;$$;
reset role;
update public.police_official_release_gate set enabled=false where id=true;
select 'EPHEMERAL_DB_SQL_CHECK_PASS' as result;
