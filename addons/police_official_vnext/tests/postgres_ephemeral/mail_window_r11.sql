-- Disposable postgres:17-alpine runner only; no actual event records.
\set ON_ERROR_STOP on
do $$begin
 if has_schema_privilege('anon','police_private','USAGE')
   or has_schema_privilege('authenticated','police_private','USAGE') then
    raise exception 'Private police schema exposed to browser roles';
 end if;
 if has_table_privilege('anon','police_private.mail_delivery_window_reviews','select')
   or has_table_privilege('authenticated','police_private.mail_delivery_window_reviews','select')
   or has_table_privilege('authenticated','police_private.mail_delivery_window_reviews','insert') then
    raise exception 'Private mail snapshot data exposed to browser roles';
 end if;
 if exists(select 1 from pg_policies where schemaname='police_private' and tablename='mail_delivery_window_reviews') then
    raise exception 'Unexpected non-private RLS policy';
 end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname like '%mail_window%') then
    raise exception 'Public API for nonpublic snapshot is forbidden';
 end if;
end;$$;
insert into police_private.mail_delivery_window_reviews
 (window_start,window_end_exclusive,version,source_export_sha256,guarded_form_receipt_sha256,row_count,repeated_text_occurrences)
 values ('2026-10-20','2026-10-21',1,repeat('a',64),repeat('b',64),47,0);
do $$declare rejected boolean;begin
 rejected:=false;
 begin
  insert into police_private.mail_delivery_window_reviews
   (window_start,window_end_exclusive,version,source_export_sha256,guarded_form_receipt_sha256,row_count,publication_enabled)
    values ('2026-10-21','2026-10-22',1,repeat('a',64),repeat('b',64),1,true);
 exception when check_violation then rejected:=true; end;
 if not rejected then raise exception 'Publication must be permanently disabled';end if;
 rejected:=false;
 begin
  update police_private.mail_delivery_window_reviews set is_official_event_identity=true;
 exception when check_violation then rejected:=true;end;
 if not rejected then raise exception 'Invented police event ID state accepted';end if;
 rejected:=false;
 begin
  insert into police_private.mail_delivery_window_reviews
   (window_start,window_end_exclusive,version,source_export_sha256,guarded_form_receipt_sha256,row_count)
    values ('2026-10-20','2026-10-22',2,repeat('c',64),repeat('d',64),1);
 exception when check_violation then rejected:=true;end;
 if not rejected then raise exception 'Multi-day claim accepted';end if;
 rejected:=false;
 begin
  insert into police_private.mail_delivery_window_reviews
   (window_start,window_end_exclusive,version,source_export_sha256,guarded_form_receipt_sha256,row_count)
    values ('2026-10-20','2026-10-21',2,repeat('c',64),repeat('d',64),1);
 exception when unique_violation then rejected:=true;end;
 if not rejected then raise exception 'Two current snapshots for same day accepted';end if;
end;$$;
update police_private.mail_delivery_window_reviews
  set review_state='superseded_review_history' where window_start='2026-10-20' and version=1;
insert into police_private.mail_delivery_window_reviews
 (window_start,window_end_exclusive,version,source_export_sha256,guarded_form_receipt_sha256,row_count)
 values ('2026-10-20','2026-10-21',2,repeat('c',64),repeat('d',64),48);
do $$begin
 if (select count(*) from police_private.mail_delivery_window_reviews
     where window_start='2026-10-20' and review_state='pending_manual_review')<>1 then
    raise exception 'Superseding an old snapshot did not leave exactly one pending candidate';
 end if;
 if (select bool_or(publication_enabled or automatic_correction or automatic_withdrawal or points_awarded)
     from police_private.mail_delivery_window_reviews) then
    raise exception 'Private metadata became publishable';
 end if;
 if exists(select 1 from information_schema.columns where table_schema='police_private'
      and table_name='mail_delivery_window_reviews' and column_name in
      ('message','send_at','send_by','send_to','subject','raw_payload')) then
    raise exception 'Original message content should not be in metadata table';
 end if;
end;$$;
select 'R11_PRIVATE_WINDOW_SQL_PASS' as result;
