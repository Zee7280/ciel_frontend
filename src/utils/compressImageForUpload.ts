/** Phone photos are 3-12 MB each; on a mobile uplink that dominates report submit time. Downscale
 * big photos in the browser before the S3 PUT. Never throws: any failure (HEIC the browser can't
 * decode, no canvas, memory) returns the original file untouched, so an upload is never blocked by
 * compression. Small images, non-images, GIF/SVG and already-small results are left as they are. */

const MIN_BYTES_TO_COMPRESS = 1.2 * 1024 * 1024;
const MAX_EDGE_PX = 2400;
const JPEG_QUALITY = 0.82;
const COMPRESSIBLE_TYPES = /^image\/(jpeg|jpg|png|webp|heic|heif)$/i;
const COMPRESSIBLE_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;

export async function compressImageForUpload(file: File): Promise<File> {
    try {
        if (typeof document === "undefined" || typeof createImageBitmap !== "function") return file;
        if (file.size < MIN_BYTES_TO_COMPRESS) return file;
        if (!COMPRESSIBLE_TYPES.test(file.type) && !(file.type === "" && COMPRESSIBLE_EXT.test(file.name))) {
            return file;
        }

        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            bitmap.close?.();
            return file;
        }
        // White backdrop so transparent PNGs don't turn black as JPEG.
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close?.();

        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
        if (!blob || blob.size >= file.size * 0.9) return file;

        const base = file.name.replace(/\.[^./\\]+$/, "") || "photo";
        return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
    } catch {
        return file;
    }
}

/** Runs `fn` over `items` with at most `limit` in flight; results keep input order; rejects with the first error. */
export async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    const worker = async () => {
        while (true) {
            const i = next++;
            if (i >= items.length) return;
            results[i] = await fn(items[i], i);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}
