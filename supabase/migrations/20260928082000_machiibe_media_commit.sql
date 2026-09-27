-- Atomic media-manifest commit for Machiibe Production.
-- The application calls this only after every private media object has been
-- server-hashed and successfully written through the media storage adapter.

begin;

create or replace function public.admin_commit_machiibe_media(
  p_post_set_id uuid,
  p_revision_id uuid,
  p_media_manifest jsonb,
  p_media_hash text,
  p_actor text default 'admin'
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_set public.publishing_post_sets%rowtype;
  v_revision public.publishing_revisions%rowtype;
  v_expected_page_count integer;
  v_item_count integer;
begin
  if p_media_hash is null or p_media_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid media hash';
  end if;
  if jsonb_typeof(p_media_manifest) <> 'object'
    or p_media_manifest->>'version' <> 'machiibe-media-manifest-v1'
    or p_media_manifest->>'productionType' <> 'CAROUSEL'
    or jsonb_typeof(p_media_manifest->'items') <> 'array' then
    raise exception 'invalid media manifest';
  end if;

  select * into v_set
  from public.publishing_post_sets
  where id=p_post_set_id and service='machiibe'
  for update;
  if not found then raise exception 'post set not found'; end if;
  if v_set.production_type <> 'CAROUSEL' then raise exception 'production type mismatch'; end if;

  select * into v_revision
  from public.publishing_revisions
  where id=p_revision_id and post_set_id=p_post_set_id
  for update;
  if not found then raise exception 'revision not found'; end if;
  if v_revision.production_type <> 'CAROUSEL' then raise exception 'revision production type mismatch'; end if;
  if v_revision.status not in ('draft','collecting','validating','generated','edited') then
    raise exception 'revision state does not allow media replacement';
  end if;
  if v_revision.publish_eligible or v_revision.approval_status='approved' then
    raise exception 'approved revision media is immutable';
  end if;

  v_expected_page_count:=nullif(v_revision.page_plan->>'pageCount','')::integer;
  v_item_count:=jsonb_array_length(p_media_manifest->'items');
  if v_expected_page_count is null or v_expected_page_count not between 5 and 8 or v_item_count<>v_expected_page_count then
    raise exception 'media page count mismatch';
  end if;

  update public.publishing_revisions
  set media_manifest=p_media_manifest,
      media_hash=p_media_hash,
      status='generated',
      visual_qc='pending',
      golden_qc='pending',
      approval_status='pending',
      publish_eligible=false,
      approved_by_user_id=null,
      approved_by=null,
      approved_at=null,
      updated_at=now()
  where id=p_revision_id and post_set_id=p_post_set_id;

  update public.publishing_post_sets
  set status='generated',updated_at=now()
  where id=p_post_set_id;

  insert into public.publishing_audit_log(
    service,entity_type,entity_id,action,actor,before_snapshot,after_snapshot
  ) values (
    'machiibe','revision',p_revision_id::text,'media_committed',coalesce(nullif(p_actor,''),'admin'),
    jsonb_build_object(
      'status',v_revision.status,
      'media_hash',v_revision.media_hash,
      'approval_status',v_revision.approval_status,
      'publish_eligible',v_revision.publish_eligible
    ),
    jsonb_build_object(
      'status','generated',
      'media_hash',p_media_hash,
      'media_count',v_item_count,
      'approval_status','pending',
      'publish_eligible',false
    )
  );

  return jsonb_build_object(
    'post_set_id',p_post_set_id,
    'revision_id',p_revision_id,
    'media_hash',p_media_hash,
    'media_count',v_item_count,
    'status','generated'
  );
end;
$$;

revoke all on function public.admin_commit_machiibe_media(uuid,uuid,jsonb,text,text)
  from public,anon,authenticated;
grant execute on function public.admin_commit_machiibe_media(uuid,uuid,jsonb,text,text)
  to service_role;

comment on function public.admin_commit_machiibe_media(uuid,uuid,jsonb,text,text)
  is 'Commits a server-verified private Machiibe media manifest atomically after storage writes succeed; invalidates visual/golden approval on replacement.';

commit;
