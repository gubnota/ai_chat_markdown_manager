// SPDX-License-Identifier: MIT OR Apache-2.0
import type { ExportOptions } from "../types";

import { inMessage } from "./messages";
export { inMessage } from "./messages";
const cards =
  'file-preview, user-query-file, user-query-file-preview, .file-preview, .file-preview-container, .attachment-card, [data-file-name], [data-filename], [data-testid="file-attachment"], [data-testid="attachment"]';
const filenames =
  '[data-file-name], [data-filename], .file-name, .filename, .file-preview-title, [class*="file-name"], [class*="filename"]';
const extension =
  /\.(?:pdf|txt|csv|tsv|md|json|xml|html|docx?|xlsx?|pptx?|zip|png|jpe?g|webp|gif|svg|heic|mp[34]|wav|py|js|ts|css|rtf|odt)\b/i;

const maxImagePixels = 16_777_216;
const maxImageUrlLength = 12 * 1024 * 1024;
const rasterData =
  /^data:image\/(?:png|jpeg|gif|webp|avif|bmp);base64,[a-z0-9+/=\r\n]+$/i;

/** Preserve decoded temporary previews locally; never fetch a private blob URL. */
export function embeddedImageSource(
  image: HTMLImageElement,
  allowHttp = false,
): string {
  if (!inMessage(image)) return "";
  const source = image.currentSrc || image.getAttribute("src") || "";
  if (source.length > maxImageUrlLength) return "";
  if (rasterData.test(source)) return source;
  if (
    !(source.startsWith("blob:") || (allowHttp && /^https?:/.test(source))) ||
    !image.complete ||
    !image.naturalWidth ||
    !image.naturalHeight ||
    image.naturalWidth * image.naturalHeight > maxImagePixels
  )
    return "";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return "";
    context.drawImage(image, 0, 0);
    const result = canvas.toDataURL("image/png");
    return result.length <= maxImageUrlLength && rasterData.test(result)
      ? result
      : "";
  } catch {
    // Cross-origin taint and browser canvas restrictions keep the unavailable note.
    return "";
  }
}

function visibleWithin(element: Element, root: Element): boolean {
  for (let node: Element | null = element; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (
      node.matches(
        '[hidden], [inert], [aria-hidden="true"], [data-md-export-ignore], [role="toolbar"], [role="menu"]',
      ) ||
      style.display === "none" ||
      style.visibility === "hidden"
    )
      return false;
    if (node === root) return true;
  }
  return false;
}

function label(element: Element): string {
  const named = element.matches(filenames)
    ? element
    : [...element.querySelectorAll(filenames)].find((node) =>
        visibleWithin(node, element),
      ) ||
      [...element.querySelectorAll('button, [role="button"]')].find(
        (node) =>
          visibleWithin(node, element) &&
          extension.test(
            node.textContent || node.getAttribute("aria-label") || "",
          ),
      );
  const copy = (named || element).cloneNode(true) as Element;
  copy
    .querySelectorAll('mat-icon, .mat-icon, svg, [aria-hidden="true"], button')
    .forEach((node) => node.remove());
  const value =
    named?.getAttribute("data-file-name") ||
    named?.getAttribute("data-filename") ||
    copy.textContent?.trim() ||
    named?.getAttribute("aria-label") ||
    named?.getAttribute("title") ||
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    "";
  return value.replace(/\s+/g, " ").slice(0, 240).trim();
}

function httpUrl(raw: string | null): string | undefined {
  if (!raw?.trim() || raw.trim().startsWith("#")) return;
  try {
    const url = new URL(raw, document.baseURI);
    if (/^https?:$/.test(url.protocol)) return url.href;
  } catch {
    /* No usable DOM URL. */
  }
}
const escapeLabel = (value: string) =>
  value.replace(/([\\`*_{}[\]<>])/g, "\\$1");
const escapeUrl = (value: string) =>
  value
    .replace(/\\/g, "%5C")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\s/g, "%20");

/** Return undefined for ordinary DOM; never invoke a native attachment action. */
export function attachmentMarkdown(
  element: Element,
  options: Pick<ExportOptions, "images" | "links">,
  renderImage: (image: HTMLImageElement) => string,
): string | undefined {
  if (!inMessage(element)) return;
  if (element.tagName === "IMG") return;
  const button =
    element.tagName === "BUTTON" || element.getAttribute("role") === "button";
  const card = element.matches(cards);
  if (!button && !card) return;
  // Gemini reuses card classes for carousels: let each nested attachment own its label.
  if (!button && card && element.querySelector(cards)) return;
  const images = [...element.querySelectorAll<HTMLImageElement>("img")].filter(
    (image) => visibleWithin(image, element),
  );
  const filename = label(element);
  // Only named file cards/buttons qualify; action buttons and their text stay omitted.
  const file =
    !!filename &&
    (card ||
      (extension.test(filename) &&
        (!images.length || !!element.querySelector(filenames))));
  if (!file && !images.length) return;
  const output: string[] = [];
  if (file) {
    const candidates = [
      element,
      ...element.querySelectorAll(
        "a[href], [data-download-url], [data-file-url]",
      ),
    ].filter((node) => visibleWithin(node, element));
    const url = candidates
      .flatMap((node) => [
        node.getAttribute("href"),
        node.getAttribute("data-download-url"),
        node.getAttribute("data-file-url"),
      ])
      .map(httpUrl)
      .find(Boolean);
    const name = escapeLabel(filename);
    output.push(
      options.links
        ? url
          ? `[${name}](${escapeUrl(url)})`
          : `Attachment: ${name} — direct link unavailable.`
        : `Attachment: ${name}`,
    );
  }
  if (options.images) output.push(...images.map(renderImage).filter(Boolean));
  return output.length ? `\n\n${output.join("\n\n")}\n\n` : "";
}
