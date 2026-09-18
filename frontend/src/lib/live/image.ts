/* ------------------------------------------------------------------
   image — take a photo straight off an organiser's phone and make it
   small enough to hold in the live store and fast enough to load on
   a crowded 4G cell at Diggers Rest.

   Everything happens in the browser. Nothing is uploaded.
   ------------------------------------------------------------------ */

export const MAX_SOURCE_BYTES = 25_000_000;
export const DEFAULT_MAX_WIDTH = 1280;
export const DEFAULT_QUALITY = 0.72;

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* Safari < 17 and some Android builds — fall through to <img>. */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
  } finally {
    // Revoked on the next frame so the decoded bitmap is safely in memory.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * Resize to `maxWidth` and re-encode as JPEG. Returns a data URL that
 * can be written straight into the live store.
 */
export async function fileToDataUrl(
  file: File,
  maxWidth = DEFAULT_MAX_WIDTH,
  quality = DEFAULT_QUALITY
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file is not an image. Use a JPEG, PNG or WebP.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("That photo is very large. Send it through Photos at a smaller size first.");
  }

  let source: CanvasImageSource & { width: number; height: number };
  try {
    source = await decode(file);
  } catch {
    throw new Error("The browser could not read that image. HEIC photos need converting to JPEG first.");
  }

  const scale = Math.min(1, maxWidth / source.width);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The browser could not process that image.");
  ctx.drawImage(source, 0, 0, width, height);
  if ("close" in source && typeof source.close === "function") source.close();

  return canvas.toDataURL("image/jpeg", quality);
}

export function approxBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const body = comma >= 0 ? dataUrl.length - comma - 1 : dataUrl.length;
  return Math.round(body * 0.75);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
