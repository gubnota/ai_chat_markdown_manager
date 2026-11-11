// SPDX-License-Identifier: MIT OR Apache-2.0
import type { ExportOptions } from "../types";
import { embeddedImageSource } from "./attachments";

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

/** Only resources referenced by the converted, loaded content are requested. */
export async function embedMarkdownMedia(
  body: string,
  roots: Element[],
  options: ExportOptions,
  signal?: AbortSignal,
): Promise<string> {
  if (!needsEmbeddedMedia(options)) return body;
  signal?.throwIfAborted();
  const missing = body.match(
    /(?:Image|Attachment): [^\n]*— direct link unavailable\./,
  );
  if (missing)
    throw new Error(
      `Offline export incomplete: ${missing[0]} Keep this chat until its original file is available.`,
    );
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
    const candidates = image
      ? [
          image.getAttribute("data-src"),
          image.getAttribute("data-original"),
          image.currentSrc,
          image.getAttribute("src"),
          image.getAttribute("srcset")?.split(",")[0]?.trim().split(/\s+/)[0],
        ]
      : player
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
    const urls = candidates
      .filter((value): value is string => !!value)
      .map((value) => {
        try {
          return new URL(value, document.baseURI).href;
        } catch {
          return "";
        }
      });
    const url = urls.find((value) => body.includes(`](${mdUrl(value)})`));
    if (!url) {
      if (player && !urls.length)
        throw new Error(
          "Offline export incomplete: audio/video has no accessible source.",
        );
      continue;
    }
    // Ordinary conversation/source links remain links; capture only media and input/download files.
    if (
      !image &&
      !player &&
      !node.closest(
        'file-preview, user-query-file, user-query-file-preview, .file-preview, .file-preview-container, .attachment-card, [data-file-name], [data-filename], [data-testid="file-attachment"], [data-testid="attachment"]',
      ) &&
      !node.matches("[download], [data-file-url], [data-download-url]") &&
      !/\.(pdf|txt|csv|tsv|md|json|xml|docx?|xlsx?|pptx?|zip|html|svg|heic|png|jpe?g|webp|gif|mp[34]|wav|py|js|ts|css|rtf|odt)(?:[?#]|$)/i.test(
        url,
      )
    )
      continue;
    if (captured.has(url)) continue;
    if (captured.size >= maxCount)
      throw new Error("Offline export exceeds 100 resources per chat.");
    let result = "";
    if (url.startsWith("data:")) {
      if (
        !/^data:(?:image\/(?:png|jpeg|gif|webp|avif|bmp)|audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+|application\/octet-stream);base64,[a-z0-9+/=\r\n]+$/i.test(
          url,
        )
      )
        throw new Error("Offline export: unsafe embedded media type.");
      if (url.length > (maxFile * 4) / 3)
        throw new Error("Offline export: resource exceeds 20 MiB.");
      result = url;
    } else if (image && url.startsWith("blob:")) {
      result = embeddedImageSource(image);
      if (!result)
        throw new Error(
          `Offline export: cannot capture ${image.alt || "temporary image"}.`,
        );
    } else {
      const parsed = new URL(url);
      if (
        !/^https?:$/.test(parsed.protocol) &&
        !(parsed.protocol === "blob:" && parsed.origin === location.origin)
      )
        throw new Error("Offline export: unsupported media URL.");
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
      try {
        let response: Response;
        try {
          response = await fetch(url, {
            credentials: "include",
            signal: controller.signal,
          });
        } catch (error) {
          // Public image CDNs commonly allow anonymous CORS but reject credentials.
          // Keep authenticated attachment requests and cancellation unchanged.
          if (
            !image ||
            parsed.origin === location.origin ||
            controller.signal.aborted
          )
            throw error;
          response = await fetch(url, {
            credentials: "omit",
            signal: controller.signal,
          });
        }
        if (!response.ok || response.type === "opaque")
          throw new Error(`HTTP ${response.status}`);
        const mime =
          response.headers
            .get("content-type")
            ?.split(";")[0]
            .trim()
            .toLowerCase() || "application/octet-stream";
        if (image && !raster.test(mime))
          throw new Error("Response is not a supported raster image");
        if (player && !media.test(mime))
          throw new Error("Response is not playable audio/video");
        if (
          !image &&
          !player &&
          /^(text\/html|application\/xhtml\+xml)$/.test(mime)
        )
          throw new Error(
            "File URL returned an HTML page, possibly a login screen",
          );
        if (Number(response.headers.get("content-length")) > maxFile)
          throw new Error("Resource exceeds 20 MiB");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Resource response has no body");
        const chunks: Uint8Array[] = [];
        let length = 0;
        try {
          while (true) {
            controller.signal.throwIfAborted();
            const { value, done } = await reader.read();
            if (done) break;
            length += value.length;
            if (length > maxFile || total + length > maxTotal)
              throw new Error(
                "Offline media exceeds 20 MiB per file or 64 MiB per chat",
              );
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
        result = dataUrl(
          bytes,
          image || player ? mime : "application/octet-stream",
        );
      } catch (error) {
        signal?.throwIfAborted();
        // Cross-origin previews may still have readable, already decoded pixels.
        if (image && !controller.signal.aborted)
          result = embeddedImageSource(image, true);
        if (!result)
          throw new Error(
            `Offline export: ${image?.alt || node.textContent?.trim().slice(0, 80) || node.tagName} could not be embedded (${error instanceof Error ? error.message : String(error)}). No cleanup is safe for this chat.`,
          );
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
      }
    }
    total += (result.length * 3) / 4;
    if (total > maxTotal)
      throw new Error("Offline export exceeds 64 MiB of media per chat.");
    captured.set(url, result);
  }
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
