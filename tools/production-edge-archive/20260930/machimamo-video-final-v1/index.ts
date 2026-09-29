
const TARGET = "https://media.descriptusercontent.com/proxy/remux?url=https%3A%2F%2Fapi.descript.com%2Fv2%2Fpublished_projects%2F07e19391-b256-4458-bbe7-a31a0c57f209%2Fhls%3Fexpiration%3D1790313971221%26signature%3Df828d04a48c4b6f1eac13ef3d87c4db7661575c9951c91a127f815ed847d84d1&filename=machimamo-short-v1-final.mp4&mediaCacheBucketName=production-273614-media-cache&expiration=1790310371&signature=90dfb1b5818fca54845ce6f4f93b765dcef6a1ea91c7826ac87c1bfe59c5727d";
Deno.serve(async (req) => {
  const h = new Headers();
  const range = req.headers.get("range");
  if (range) h.set("Range", range);
  const upstream = await fetch(TARGET, { method: req.method === "HEAD" ? "HEAD" : "GET", headers: h });
  const headers = new Headers(upstream.headers);
  headers.set("Access-Control-Allow-Origin","*");
  headers.set("Accept-Ranges","bytes");
  headers.set("Cache-Control","public, max-age=300");
  headers.set("Content-Type","video/mp4");
  headers.set("Content-Disposition",'inline; filename="machimamo-short-v1-final.mp4"');
  return new Response(req.method === "HEAD" ? null : upstream.body, {status:upstream.status, headers});
});
