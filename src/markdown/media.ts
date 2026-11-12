// SPDX-License-Identifier: MIT OR Apache-2.0
import type { ExportOptions, MediaSink, MissingMedia } from "../types";
import { embeddedImageSource, imageUrls, rasterizeImage } from "./attachments";
import { unavailableMapPreview } from "./maps";
import { linkedFilename } from "./filenames";

const maxFile = 20 * 1024 * 1024;
const maxTotal = 64 * 1024 * 1024;
const maxCount = 100;
const raster = /^image\/(png|jpeg|gif|webp|avif|bmp)$/i;
const media = /^(audio|video)\/[a-z0-9.+-]+$/i;
const mdUrl = (url: string) =>
  url
    .replace(/\\/g, "%5C")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\s/g, "%20");
export const needsEmbeddedMedia = (options: ExportOptions) =>
  options.embedMedia || options.mediaFiles;

function visible(element: Element): boolean {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (
      node.matches(
        '[hidden], [inert], [aria-hidden="true"], [data-md-export-ignore], [role="toolbar"], [role="menu"], #__safari_md_export_root__',
      )
    )
      return false;
    const style = getComputedStyle(node);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse"
    )
      return false;
  }
  return true;
}
function dataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${mime};base64,${btoa(binary)}`;
}

/** The page can allow this URL in img-src even when connect-src blocks fetch. */
function loadImagePixels(
  url: string,
  original: HTMLImageElement,
  signal: AbortSignal,
): Promise<string> {
  if (signal.aborted) return Promise.resolve("");
  return new Promise((resolve) => {
    const image = new Image();
    const finish = (result: string) => {
      image.onload = image.onerror = null;
      signal.removeEventListener("abort", abort);
      image.removeAttribute("src");
      resolve(result);
    };
    const abort = () => finish("");
    image.crossOrigin = "anonymous";
    image.referrerPolicy = original.referrerPolicy;
    image.onload = () => finish(rasterizeImage(image));
    image.onerror = abort;
    signal.addEventListener("abort", abort, { once: true });
    image.src = url;
  });
}

type BinaryMedia = { bytes: Uint8Array; mime: string };
const supportedData =
  /^data:((?:image\/(?:png|jpeg|gif|webp|avif|bmp)|(?:audio|video)\/[a-z0-9.+-]+|application\/octet-stream));base64,([a-z0-9+/=\r\n]+)$/i;

export function decodeMedia(url: string): BinaryMedia | undefined {
  const match = supportedData.exec(url);
  if (!match) return;
  if (match[2].length > Math.ceil(maxFile / 3) * 4)
    throw new Error("Offline export: resource exceeds 20 MiB.");
  const binary = atob(match[2]);
  if (binary.length > maxFile)
    throw new Error("Offline export: resource exceeds 20 MiB.");
  return {
    bytes: Uint8Array.from(binary, (char) => char.charCodeAt(0)),
    mime: match[1].toLowerCase(),
  };
}

async function fetchMedia(
  url: string,
  kind: "image" | "player" | "file",
  remaining: number,
  signal: AbortSignal,
  networkFailures: string[],
): Promise<BinaryMedia> {
  const parsed = new URL(url);
  const localBlob =
    parsed.protocol === "blob:" && parsed.origin === location.origin;
  if (!/^https?:$/.test(parsed.protocol) && !localBlob)
    throw new Error("Offline export: unsupported media URL.");
  let response: Response;
  try {
    response = await fetch(url, { credentials: "include", signal }).catch(
      (error: unknown) => {
        if (kind !== "image" || localBlob || signal.aborted) throw error;
        // Keep same-origin session cookies while omitting them on a CDN redirect.
        return fetch(url, {
          credentials:
            parsed.origin === location.origin ? "same-origin" : "omit",
          signal,
        });
      },
    );
  } catch (error) {
    if (kind === "image" && !localBlob) networkFailures.push(url);
    throw error;
  }
  if (!response.ok || response.type === "opaque")
    throw new Error(`HTTP ${response.status}`);
  const mime =
    response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ||
    "application/octet-stream";
  if (kind === "image" && !raster.test(mime))
    throw new Error("Response is not a supported raster image");
  if (kind === "player" && !media.test(mime))
    throw new Error("Response is not playable audio/video");
  if (kind === "file" && /^(text\/html|application\/xhtml\+xml)$/.test(mime))
    throw new Error("File URL returned an HTML page, possibly a login screen");
  if (Number(response.headers.get("content-length")) > maxFile)
    throw new Error("Resource exceeds 20 MiB");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Resource response has no body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maxFile) throw new Error("Resource exceeds 20 MiB");
      if (length > remaining)
        throw new Error("Offline media exceeds 64 MiB per chat");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  if (!length) throw new Error("Empty media response");
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return { bytes, mime: kind === "file" ? "application/octet-stream" : mime };
}

/** Only resources referenced by the converted, loaded content are requested. */
export async function embedMarkdownMedia(
  body: string,
  roots: Element[],
  options: ExportOptions,
  signal?: AbortSignal,
  missingMedia?: MissingMedia,
  sink?: MediaSink,
): Promise<string> {
  if (!needsEmbeddedMedia(options)) return body;
  signal?.throwIfAborted();
  const missing = body.match(/Attachment: [^\n]*— direct link unavailable\./);
  const missingImage = body.match(/Image: [^\n]*— direct link unavailable\./);
  const missingMap = options.images && body.includes(`*${unavailableMapPreview}*`);
  const required = missing?.[0] ?? missingImage?.[0] ??
    (missingMap ? unavailableMapPreview : "");
  if (required && !missingMedia)
    throw new Error(
      `Offline export incomplete: ${required} Keep this chat until its original file is available.`,
    );
  if (missing)
    missingMedia?.set("attachment:", { kind: "file", reason: missing[0] });
  if (missingImage)
    missingMedia?.set("", { kind: "image", reason: missingImage[0] });
  if (missingMap)
    missingMedia?.set("map:", { kind: "image", reason: unavailableMapPreview });
  const nodes = roots
    .flatMap((root) => [
      root,
      ...root.querySelectorAll(
        "img, video, audio, a[href], [data-file-url], [data-download-url]",
      ),
    ])
    .filter(visible);
  let total = 0;
  const captured = new Map<string, string>();
  for (const node of nodes) {
    signal?.throwIfAborted();
    const image = node instanceof HTMLImageElement ? node : undefined;
    const player = node instanceof HTMLMediaElement ? node : undefined;
    if (image && !options.images) continue;
    if (!image && !options.links) continue;
    const candidates = player
      ? [
          player.currentSrc,
          player.getAttribute("src"),
          player.querySelector("source")?.getAttribute("src"),
        ]
      : [
          node.getAttribute("data-file-url"),
          node.getAttribute("data-download-url"),
          node.getAttribute("href"),
        ];
    const urls = image
      ? imageUrls(image)
      : candidates.flatMap((value) => {
          if (!value) return [];
          try {
            return [new URL(value, document.baseURI).href];
          } catch {
            return [];
          }
        });
    const url = urls.find((value) => body.includes(`](${mdUrl(value)})`));
    if (!url) {
      if (player && !urls.length) {
        const reason = "Audio/video has no accessible source.";
        if (!missingMedia)
          throw new Error(`Offline export incomplete: ${reason}`);
        missingMedia.set("player:", { kind: "file", reason });
      }
      continue;
    }
    // Ordinary source links (including .html pages) stay as links.
    // Explicit file cards/downloads can be considered regardless of URL suffix.
    if (
      !image &&
      !player &&
      !node.closest(
        'file-preview, user-query-file, user-query-file-preview, .file-preview, .file-preview-container, .attachment-card, [data-file-name], [data-filename], [data-testid="file-attachment"], [data-testid="attachment"]',
      ) &&
      !node.matches("[download], [data-file-url], [data-download-url]") &&
      !linkedFilename(url)
    )
      continue;
    const href = mdUrl(url);
    const kind = image ? "image" : "file";
    if (
      captured.has(url) ||
      sink?.has(href) ||
      missingMedia?.get(href)?.kind === kind
    )
      continue;
    if (!sink && captured.size + (missingMedia?.size ?? 0) >= maxCount)
      throw new Error("Offline export exceeds 100 resources per chat.");
    let result: string | BinaryMedia = "";
    if (url.startsWith("data:")) {
      if (!supportedData.test(url))
        throw new Error("Offline export: unsafe embedded media type.");
      if (url.length > (maxFile * 4) / 3)
        throw new Error("Offline export: resource exceeds 20 MiB.");
      result = url;
    } else {
      const controller = new AbortController();
      const abort = () => controller.abort(signal?.reason);
      signal?.addEventListener("abort", abort, { once: true });
      const timeout = setTimeout(
        () =>
          controller.abort(
            new Error("Media request timed out after 20 seconds."),
          ),
        20_000,
      );
      let error: unknown;
      try {
        const fetchKind = image ? "image" : player ? "player" : "file";
        const networkFailures: string[] = [];
        const sources = image
          ? [url, ...urls.filter((value) => value !== url)]
          : [url];
        for (const source of sources) {
          if (controller.signal.aborted) break;
          try {
            result = await fetchMedia(
              source,
              fetchKind,
              sink ? Infinity : maxTotal - total,
              controller.signal,
              networkFailures,
            );
          } catch (failure) {
            error ??= failure;
            // A revoked blob can still have readable pixels in its original element.
            if (image && source === url && !controller.signal.aborted)
              result = embeddedImageSource(image, true);
          }
          if (result) break;
        }
        if (image && !result) {
          for (const source of networkFailures) {
            if (controller.signal.aborted) break;
            result = await loadImagePixels(source, image, controller.signal);
            if (result) break;
          }
        }
        signal?.throwIfAborted();
        if (!result) {
          const name = image
            ? image.alt || image.getAttribute("aria-label") || "Image"
            : node.textContent?.trim().slice(0, 80) || node.tagName;
          const reason = controller.signal.aborted
            ? controller.signal.reason
            : error;
          const message = `${name} could not be embedded (${reason instanceof Error ? reason.message : String(reason)}).`;
          if (!missingMedia)
            throw new Error(
              `Offline export: ${message} No cleanup is safe for this chat.`,
            );
          missingMedia.set(href, { kind, reason: message });
          continue;
        }
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
      }
    }
    if (sink) {
      const asset = typeof result === "string" ? decodeMedia(result) : result;
      if (!asset)
        throw new Error("Offline export: unsafe embedded media type.");
      const text = node.textContent?.trim() || "";
      const label = image
        ? image.alt || image.getAttribute("aria-label") || "attachment"
        : player
          ? player.tagName
          : node.getAttribute("download")?.trim() ||
            (/\.[\w-]{1,12}$/.test(text)
              ? text
              : linkedFilename(url) || text) ||
            "attachment";
      await sink.write(href, label, asset.mime, asset.bytes);
      continue;
    }
    if (typeof result !== "string") result = dataUrl(result.bytes, result.mime);
    total += (result.length * 3) / 4;
    if (total > maxTotal)
      throw new Error("Offline export exceeds 64 MiB of media per chat.");
    captured.set(url, result);
  }
  if (sink) return body;
  for (const [url, value] of captured)
    body = body.split(`](${mdUrl(url)})`).join(`](${value})`);
  const embedded = new Set(
    body.match(
      /data:(?:image|audio|video|application)\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi,
    ) || [],
  );
  if (
    embedded.size > maxCount ||
    [...embedded].reduce((size, value) => size + (value.length * 3) / 4, 0) >
      maxTotal
  )
    throw new Error("Offline export exceeds 100 resources or 64 MiB per chat.");
  signal?.throwIfAborted();
  return body;
}
