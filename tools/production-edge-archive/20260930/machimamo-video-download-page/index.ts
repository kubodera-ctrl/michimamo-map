
Deno.serve(() => new Response(
  `<!doctype html><html><body><h1>Machimamo video export</h1>
  <a href="https://ckftozjhdszlwqnylmxv.supabase.co/functions/v1/machimamo-video-final-v1?v=2">Download final MP4</a>
  </body></html>`,
  {headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}}
));
