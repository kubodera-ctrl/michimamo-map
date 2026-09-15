-- Executed once after dev14 publication; do not rerun without reconciling the baseline.
begin;
create temporary table dev14_outliers(source_key text primary key) on commit drop;
insert into dev14_outliers values ('bodik-reviewed:55cfbf991de1cbb5:5ee96176382f91d797d9842d'),('bodik-reviewed:55cfbf991de1cbb5:2658c78e2300431325fef61a'),('bodik-reviewed:c0a924db7ad91ac3:362e6489c49ac9132dd25556'),('bodik-reviewed:c0a924db7ad91ac3:451b538e5bea7562d0ccf98c'),('bodik-reviewed:c0a924db7ad91ac3:3f82e590d573e87c68fdaa1d'),('bodik-reviewed:c0a924db7ad91ac3:6911c9b44b92ab3ee008ab1c'),('bodik-reviewed:28f6a7a09182e72f:d4a17772413a4d6209801bf7'),('bodik-reviewed:d6127a67ec81f505:021246934d21bc3ad42d1d56'),('bodik-reviewed:ee468590171fe650:3f8ece45f5ddb5d46fee5766');
do $guard$ begin
 if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 45390 then raise exception 'Public baseline changed'; end if;
 if (select count(*) from public.safety_spots p join dev14_outliers o using(source_key) where p.active) <> 9 then raise exception 'Outlier target mismatch'; end if;
end $guard$;
update public.safety_spots p set active=false,quality_status='rough',updated_at=now() from dev14_outliers o where p.source_key=o.source_key;
update public.safety_spots_nationwide_stage s set active=false,quality_status='rough',review_decision='hold',review_reason='自治体公式原票の座標が自治体内の主分布から大幅に外れるため公開保留',review_next_action='公式施設座標の訂正確認後に再審査',reviewed_at=now() from dev14_outliers o where s.source_key=o.source_key;
do $guard$ begin
 if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 45381 then raise exception 'Post-quarantine mismatch'; end if;
end $guard$;
commit;
