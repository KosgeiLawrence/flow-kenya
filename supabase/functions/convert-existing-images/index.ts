// Convert all existing JPEG/PNG images in the marketplace-images, cleanup-photos
// and org-logos buckets to WebP, then rewrite the URLs stored in the database.
//
// Idempotent: skips files that are already webp/avif and rows that already
// reference the converted URL. Tracks completion in `image_migration_runs`
// so it only runs once.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Image, decode as decodeImage } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const JOB_NAME = "convert_existing_to_webp_v1";
const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(PROJECT_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

interface BucketTarget {
  bucket: string;
  /** Read rows that may reference images, return [{ id, urls: string[] }]. */
  fetchRows: () => Promise<Array<{ id: string; urls: string[] }>>;
  /** Persist the rewritten URLs back to the row. */
  saveRow: (id: string, mapping: Record<string, string>) => Promise<void>;
}

function publicUrlToObjectPath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

async function reencodeToWebp(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const img = await decodeImage(bytes);
    if (!img || typeof (img as any).bitmap === "undefined") return null;
    const { width, height } = img as { width: number; height: number };
    // Downscale very large images; longest edge capped at 1920px.
    const longest = Math.max(width, height);
    let w = width;
    let h = height;
    if (longest > 1920) {
      const scale = 1920 / longest;
      w = Math.round(width * scale);
      h = Math.round(height * scale);
      (img as any).resize(w, h);
    }
    // imagescript bitmaps are RGBA Uint8Array.
    const rgba = (img as any).bitmap as Uint8Array;
    const webp = await encodeWebp(rgba, w, h, 78);
    return webp;
  } catch (e) {
    console.error("re-encode failed", e);
    return null;
  }
}

async function convertBucket(target: BucketTarget) {
  const summary = {
    bucket: target.bucket,
    rowsScanned: 0,
    filesConverted: 0,
    filesSkipped: 0,
    bytesSaved: 0,
    errors: [] as string[],
  };

  const rows = await target.fetchRows();
  for (const row of rows) {
    summary.rowsScanned++;
    const mapping: Record<string, string> = {};

    for (const url of row.urls) {
      if (!url) continue;
      const path = publicUrlToObjectPath(url, target.bucket);
      if (!path) {
        summary.filesSkipped++;
        continue;
      }
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      if (!["jpg", "jpeg", "png"].includes(ext)) {
        summary.filesSkipped++;
        continue;
      }

      const { data: blob, error: dlErr } = await admin.storage
        .from(target.bucket)
        .download(path);
      if (dlErr || !blob) {
        summary.errors.push(`download ${path}: ${dlErr?.message ?? "no body"}`);
        continue;
      }
      const original = new Uint8Array(await blob.arrayBuffer());
      const webp = await reencodeToWebp(original);
      if (!webp || webp.byteLength >= original.byteLength) {
        summary.filesSkipped++;
        continue;
      }

      const newPath = path.replace(/\.(jpg|jpeg|png)$/i, ".webp");
      const { error: upErr } = await admin.storage
        .from(target.bucket)
        .upload(newPath, webp, {
          contentType: "image/webp",
          upsert: true,
        });
      if (upErr) {
        summary.errors.push(`upload ${newPath}: ${upErr.message}`);
        continue;
      }

      // Best-effort delete of the original.
      await admin.storage.from(target.bucket).remove([path]);

      const { data: pub } = admin.storage
        .from(target.bucket)
        .getPublicUrl(newPath);
      mapping[url] = pub.publicUrl;
      summary.filesConverted++;
      summary.bytesSaved += original.byteLength - webp.byteLength;
    }

    if (Object.keys(mapping).length > 0) {
      try {
        await target.saveRow(row.id, mapping);
      } catch (e: any) {
        summary.errors.push(`saveRow ${row.id}: ${e?.message ?? e}`);
      }
    }
  }

  return summary;
}

const targets: BucketTarget[] = [
  {
    bucket: "marketplace-images",
    fetchRows: async () => {
      const { data } = await admin
        .from("marketplace_listings")
        .select("id, images")
        .not("images", "is", null);
      return (data ?? [])
        .filter((r: any) => Array.isArray(r.images) && r.images.length > 0)
        .map((r: any) => ({ id: r.id, urls: r.images as string[] }));
    },
    saveRow: async (id, mapping) => {
      const { data: row } = await admin
        .from("marketplace_listings")
        .select("images")
        .eq("id", id)
        .maybeSingle();
      const next = (row?.images ?? []).map((u: string) => mapping[u] ?? u);
      await admin.from("marketplace_listings").update({ images: next }).eq("id", id);
    },
  },
  {
    bucket: "cleanup-photos",
    fetchRows: async () => {
      const { data } = await admin
        .from("cleanup_exercises")
        .select("id, before_photos, during_photos, after_photos");
      return (data ?? []).map((r: any) => ({
        id: r.id,
        urls: [
          ...(r.before_photos ?? []),
          ...(r.during_photos ?? []),
          ...(r.after_photos ?? []),
        ],
      }));
    },
    saveRow: async (id, mapping) => {
      const { data: row } = await admin
        .from("cleanup_exercises")
        .select("before_photos, during_photos, after_photos")
        .eq("id", id)
        .maybeSingle();
      if (!row) return;
      const map = (arr: string[] | null) =>
        (arr ?? []).map((u) => mapping[u] ?? u);
      await admin
        .from("cleanup_exercises")
        .update({
          before_photos: map(row.before_photos),
          during_photos: map(row.during_photos),
          after_photos: map(row.after_photos),
        })
        .eq("id", id);
    },
  },
  {
    bucket: "org-logos",
    fetchRows: async () => {
      const { data } = await admin
        .from("organizations")
        .select("id, logo_url")
        .not("logo_url", "is", null);
      return (data ?? []).map((r: any) => ({
        id: r.id,
        urls: [r.logo_url as string],
      }));
    },
    saveRow: async (id, mapping) => {
      const { data: row } = await admin
        .from("organizations")
        .select("logo_url")
        .eq("id", id)
        .maybeSingle();
      const next = row?.logo_url ? mapping[row.logo_url] ?? row.logo_url : null;
      if (next) await admin.from("organizations").update({ logo_url: next }).eq("id", id);
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Idempotency guard: only run once.
  const { data: existing } = await admin
    .from("image_migration_runs")
    .select("id, status, completed_at, details")
    .eq("job_name", JOB_NAME)
    .maybeSingle();

  if (existing && existing.status === "completed") {
    return new Response(
      JSON.stringify({ skipped: true, reason: "already completed", run: existing }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let runId = existing?.id as string | undefined;
  if (!runId) {
    const { data, error } = await admin
      .from("image_migration_runs")
      .insert({ job_name: JOB_NAME, status: "running" })
      .select("id")
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    runId = data.id;
  }

  const results: any[] = [];
  for (const t of targets) {
    try {
      results.push(await convertBucket(t));
    } catch (e: any) {
      results.push({ bucket: t.bucket, error: e?.message ?? String(e) });
    }
  }

  await admin
    .from("image_migration_runs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      details: { results },
    })
    .eq("id", runId);

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
