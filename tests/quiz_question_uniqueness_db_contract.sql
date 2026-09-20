begin;

do $$
declare
  v_total int;
  v_ids int;
  v_questions int;
  v_car int;
  v_bike int;
  v_visual int;
  v_generic int;
  v_invalid int;
begin
  select count(*), count(distinct id), count(distinct body->>'q'),
         count(*) filter(where mode='car'), count(*) filter(where mode='bike'),
         count(*) filter(where nullif(body->>'sign','') is not null),
         count(*) filter(where body->>'q'='画像の標識・表示について、正しい説明はどれ？'),
         count(*) filter(
           where jsonb_typeof(body->'o') <> 'array'
              or jsonb_array_length(body->'o') <> 3
              or coalesce((body->>'a')::int,-1) not between 0 and 2
              or nullif(btrim(body->>'e'),'') is null
              or nullif(btrim(body->>'q'),'') is null
         )
  into v_total,v_ids,v_questions,v_car,v_bike,v_visual,v_generic,v_invalid
  from app_private.quiz_questions;

  if v_total <> 430 or v_ids <> 430 then raise exception 'quiz id contract failed total=% ids=%',v_total,v_ids; end if;
  if v_questions <> 430 then raise exception 'duplicate question text found: unique=%',v_questions; end if;
  if v_car <> 215 or v_bike <> 215 then raise exception 'quiz mode contract failed car=% bike=%',v_car,v_bike; end if;
  if v_visual <> 110 or v_generic <> 0 then raise exception 'visual prompt contract failed visual=% generic=%',v_visual,v_generic; end if;
  if v_invalid <> 0 then raise exception 'malformed quiz body count=%',v_invalid; end if;
end $$;

rollback;
