-- Avoid duplicating the existing "school, kindergarten or nursery nearby"
-- item and replace the non-official "children jumping out" title with a
-- different real warning sign from the MLIT list.
update app_private.quiz_questions
set body = jsonb_set(
  jsonb_set(
    jsonb_set(
      body,
      '{sign}',
      to_jsonb('右方背向屈折あり'::text),
      true
    ),
    '{o}',
    '["前方に右から始まる屈折が連続している","右折しなければならない","右側だけ通行できる"]'::jsonb,
    true
  ),
  '{e}',
  to_jsonb('画像は「右方背向屈折あり」です。前方に右から始まる屈折が連続していることを警告します。'::text),
  true
)
where id = 'CAR-204';

do $$
begin
  if (select body->>'sign' from app_private.quiz_questions where id='CAR-204') <> '右方背向屈折あり' then
    raise exception 'CAR-204 sign correction failed';
  end if;
end
$$;
