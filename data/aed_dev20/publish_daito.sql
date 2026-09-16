begin;
create temp table dev20_daito_aed on commit drop as select * from jsonb_to_recordset('[]'::jsonb) as x(
 source_key text,source_external_id text,name text,prefecture text,municipality text,address text,
 latitude double precision,longitude double precision,source_name text,source_url text,source_license text,
 source_updated_at timestamptz,prefecture_code text,installation_location text,geocode_source text,geocoded_title text);
do $$ begin
 if (select count(*) from dev20_daito_aed)<>0 then raise exception 'candidate count changed'; end if;
 if exists(select 1 from dev20_daito_aed where name='' or address='' or source_license<>'CC BY 2.1 JP'
   or latitude not between 34.65 and 34.8 or longitude not between 135.55 and 135.7)
 then raise exception 'required-field, license, or boundary validation failed'; end if;
 if exists(select 1 from dev20_daito_aed c join public.safety_spots p on p.facility_type='aed' and p.active
   and p.prefecture='大阪府' and p.municipality='大東市'
   and regexp_replace(lower(p.name),'[^0-9a-z一-龠ぁ-んァ-ヶ]','','g')=regexp_replace(lower(c.name),'[^0-9a-z一-龠ぁ-んァ-ヶ]','','g')
   and regexp_replace(lower(p.address),'[[:space:]　\-－ー丁目番地号]','','g')=regexp_replace(lower(c.address),'[[:space:]　\-－ー丁目番地号]','','g')
   and regexp_replace(lower(coalesce(p.installation_location,'')),'[[:space:]　]','','g')=regexp_replace(lower(coalesce(c.installation_location,'')),'[[:space:]　]','','g'))
 then raise exception 'production duplicate detected'; end if;
end $$;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,latitude,longitude,
 source_name,source_url,source_date,source_license,source_updated_at,prefecture_code,source_external_id,
 installation_location,geocode_source,geocoded_title,quality_status,active,duplicate_candidate)
select source_key,'aed',name,prefecture,municipality,address,latitude,longitude,source_name,source_url,
 date '2023-11-30',source_license,source_updated_at,prefecture_code,source_external_id,installation_location,
 geocode_source,geocoded_title,'verified',true,false from dev20_daito_aed
on conflict(source_key) do update set name=excluded.name,address=excluded.address,latitude=excluded.latitude,
 longitude=excluded.longitude,source_name=excluded.source_name,source_url=excluded.source_url,
 source_date=excluded.source_date,source_license=excluded.source_license,source_updated_at=excluded.source_updated_at,
 installation_location=excluded.installation_location,geocode_source=excluded.geocode_source,
 geocoded_title=excluded.geocoded_title,quality_status='verified',active=true,duplicate_candidate=false,updated_at=now();
do $$ begin if (select count(*) from public.safety_spots p join dev20_daito_aed c using(source_key)
 where p.active and p.facility_type='aed')<>0 then raise exception 'post-insert validation failed'; end if; end $$;
commit;
