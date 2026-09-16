-- An admin can review a needs_changes item directly. Close its pending request
-- atomically so it cannot remain 'pending' forever after the real decision.
create function app_private.aed_close_answered_requests() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('approved_new','approved_existing','rejected','needs_changes')
  and new.reviewed_at is not null
  and (new.status is distinct from old.status or new.reviewed_at is distinct from old.reviewed_at) then
  update public.moderation_appeals set status='resolved',
   outcome=case when new.status in ('approved_new','approved_existing') then 'reconsider' else 'maintain' end,
   response=coalesce(new.review_notes,'審査結果を更新しました。AED投稿・審査結果を確認してください。'),
   reviewed_at=new.reviewed_at,reviewed_by=new.reviewed_by
   where target_type='aed_submission' and target_id=new.id::text and status='pending';
 end if;
 return new;
end$$;
revoke all on function app_private.aed_close_answered_requests() from public,anon,authenticated;
create trigger aed_close_answered_requests after update on public.aed_submissions
 for each row execute function app_private.aed_close_answered_requests();
