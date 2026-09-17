update app_private.quiz_questions
set body = jsonb_set(
  body,
  '{q}',
  to_jsonb('画像の標識・表示について、正しい説明はどれ？'::text),
  true
)
where nullif(body->>'sign', '') is not null;

-- "Children jumping out" is not the title of an official Japanese road sign.
-- Use the official warning sign name and explanation from MLIT's sign list.
update app_private.quiz_questions
set body = jsonb_set(
  jsonb_set(
    jsonb_set(
      body,
      '{sign}',
      to_jsonb('学校、幼稚園、保育所等あり'::text),
      true
    ),
    '{o}',
    '["学校・幼稚園・保育所などがあるため子供の通行に注意する","子供だけ通行できる","横断歩道を示す"]'::jsonb,
    true
  ),
  '{e}',
  to_jsonb('画像は「学校、幼稚園、保育所等あり」です。学校・幼稚園・保育所などがあるため、子供の通行に注意する必要があります。'::text),
  true
)
where id = 'CAR-204';

do $$
declare
  visual_count integer;
  bad_prompt_count integer;
begin
  select count(*) into visual_count
  from app_private.quiz_questions
  where nullif(body->>'sign', '') is not null;

  select count(*) into bad_prompt_count
  from app_private.quiz_questions
  where nullif(body->>'sign', '') is not null
    and body->>'q' <> '画像の標識・表示について、正しい説明はどれ？';

  if visual_count <> 110 then
    raise exception 'expected 110 visual questions, got %', visual_count;
  end if;
  if bad_prompt_count <> 0 then
    raise exception 'visual prompt update incomplete: %', bad_prompt_count;
  end if;
end
$$;
