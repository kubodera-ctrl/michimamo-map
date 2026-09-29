
import { createClient } from "npm:@supabase/supabase-js@2";

const TARGET = "https://media.descriptusercontent.com/proxy/remux?url=https%3A%2F%2Fapi.descript.com%2Fv2%2Fpublished_projects%2F07e19391-b256-4458-bbe7-a31a0c57f209%2Fhls%3Fexpiration%3D1790313971221%26signature%3Df828d04a48c4b6f1eac13ef3d87c4db7661575c9951c91a127f815ed847d84d1&filename=machimamo-short-v1-final.mp4&mediaCacheBucketName=production-273614-media-cache&expiration=1790310371&signature=90dfb1b5818fca54845ce6f4f93b765dcef6a1ea91c7826ac87c1bfe59c5727d";
const BUCKET = "machimamo-video-exports";
const PATH = "machimamo-short-v1-final-720x1280.mp4";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: buckets, error: lbErr } = await supabase.storage.listBuckets();
    if (lbErr) throw lbErr;
    if (!buckets?.some((b) => b.name === BUCKET)) {
      const { error: cbErr } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 100 * 1024 * 1024,
        allowedMimeTypes: ["video/mp4"],
      });
      if (cbErr) throw cbErr;
    }

    const upstream = await fetch(TARGET);
    if (!upstream.ok) throw new Error("Upstream fetch failed: " + upstream.status);
    const bytes = new Uint8Array(await upstream.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(PATH, bytes, { contentType: "video/mp4", upsert: true });
    if (upErr) throw upErr;

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(PATH);

    const range = req.headers.get("range");
    const common = {
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=300",
      "Content-Type": "video/mp4",
      "X-Machimamo-Stored-Url": publicData.publicUrl,
    };
    if (req.method === "HEAD") {
      return new Response(null, { status: 200, headers: { ...common, "Content-Length": String(bytes.length) }});
    }
    if (range) {
      const m = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (m) {
        const start = Math.min(Number(m[1]), bytes.length - 1);
        const end = m[2] ? Math.min(Number(m[2]), bytes.length - 1) : bytes.length - 1;
        const body = bytes.slice(start, end + 1);
        return new Response(body, { status: 206, headers: {
          ...common,
          "Content-Length": String(body.length),
          "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
        }});
      }
    }
    return new Response(bytes, { status: 200, headers: { ...common, "Content-Length": String(bytes.length) }});
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: {"Content-Type":"application/json"}
    });
  }
});
