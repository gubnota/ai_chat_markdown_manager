// SPDX-License-Identifier: MIT OR Apache-2.0
import { Marked } from "marked";
import { conversationDocument } from "../markdown/legacy";
import { pathFilename } from "../markdown/filenames";
import type { Conversation, ExportOptions } from "../types";
import {
  archiveNavigation,
  archiveNavigationStyles,
} from "./archive-navigation";
import { assetFilename, captionResources } from "./resources";

const markdown = new Marked({ gfm: true, breaks: false, async: false });
const tags = new Set(
  "p h1 h2 h3 h4 h5 h6 blockquote pre code strong em del s ul ol li hr br table thead tbody tr th td a img input".split(
    " ",
  ),
);
const raster =
  /^data:image\/(?:png|jpeg|gif|webp|avif|bmp);base64,[a-z0-9+/=]+$/i;
const playable = /^data:(audio|video)\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+$/i;
const file = /^data:application\/octet-stream;base64,[a-z0-9+/=]+$/i;
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const exportMime = (format: ExportOptions["format"]) =>
  `text/${format === "html" ? "html" : "markdown"};charset=utf-8`;

/** Rebuild an allowlisted tree. No page HTML, event handlers or styles are retained. */
export function offlineHtml(
  source: string,
  title: string,
  embedMedia = true,
  assets: ReadonlyMap<string, string> = new Map(),
): string {
  const template = document.createElement("template");
  template.innerHTML = markdown.parse(source, { async: false }) as string;
  const output = document.createElement("main");
  function append(node: Node, parent: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(document.createTextNode(node.textContent || ""));
      return;
    }
    if (!(node instanceof Element)) return;
    const tag = node.tagName.toLowerCase();
    if (!tags.has(tag)) return;
    const el = document.createElement(tag);
    if (tag === "img") {
      const src = node.getAttribute("src") || "";
      if (
        !raster.test(src) &&
        !assets.get(src)?.startsWith("image/") &&
        (embedMedia || !/^https?:\/\//i.test(src))
      )
        throw new Error(
          "Offline HTML still contains an unavailable image. Keep the original chat.",
        );
      el.setAttribute("src", src);
      el.setAttribute("alt", node.getAttribute("alt") || "");
    } else if (tag === "a") {
      const href = node.getAttribute("href") || "";
      const assetMime = assets.get(href);
      if (playable.test(href) || /^(audio|video)\//.test(assetMime || "")) {
        const player = document.createElement(
          href.startsWith("data:audio/") || assetMime?.startsWith("audio/")
            ? "audio"
            : "video",
        );
        player.controls = true;
        player.preload = "metadata";
        player.src = href;
        parent.appendChild(player);
      }
      if (
        assetMime ||
        file.test(href) ||
        playable.test(href) ||
        raster.test(href)
      ) {
        el.setAttribute("href", href);
        el.setAttribute(
          "download",
          assetMime
            ? pathFilename(href)
            : assetFilename(
                node.textContent || "attachment",
                href.slice(5, href.indexOf(";")),
              ),
        );
      } else if (/^(https?:|mailto:|tel:|#)/i.test(href)) {
        el.setAttribute("href", href);
        el.setAttribute("rel", "noreferrer noopener");
      }
    } else if (tag === "input") {
      el.setAttribute("type", "checkbox");
      el.setAttribute("disabled", "");
      if (node.hasAttribute("checked")) el.setAttribute("checked", "");
    } else if (tag === "ol" && /^\d+$/.test(node.getAttribute("start") || ""))
      el.setAttribute("start", node.getAttribute("start")!);
    for (const child of node.childNodes) append(child, el);
    parent.appendChild(el);
  }
  for (const child of template.content.childNodes) append(child, output);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:${assets.size ? " file: 'self'" : ""}${embedMedia ? "" : " https: http:"}; media-src data:${assets.size ? " file: 'self'" : ""}; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escape(title)}</title><style>
:root{color-scheme:light dark;font:17px/1.65 system-ui,sans-serif}body{max-width:72rem;margin:auto;padding:32px 22px;overflow-wrap:anywhere}h1,h2,h3{line-height:1.25}h2{margin-top:2em;border-top:1px solid #8886;padding-top:1em}pre{padding:16px;background:#8882;overflow:auto;white-space:pre-wrap}code{font-family:ui-monospace,monospace}blockquote{margin-left:0;padding-left:18px;border-left:3px solid #8888}img,video{max-width:100%;height:auto}audio{display:block;max-width:100%}table{border-collapse:collapse;display:block;overflow:auto}td,th{border:1px solid #8886;padding:6px 12px}a{color:#4c8bdc}header{font-size:.85em;color:gray} @media print{body{max-width:none;padding:0}pre{white-space:pre-wrap}}
${archiveNavigationStyles}
</style></head><body><header>${embedMedia ? "Offline conversation archive · external source links require internet" : "Linked conversation export · media and file links require internet and may expire"}</header>${archiveNavigation(output).outerHTML}</body></html>`;
}
export function exportDocument(
  body: string,
  c: Conversation,
  options: ExportOptions,
  assets: ReadonlyMap<string, string> = new Map(),
): string {
  let source = conversationDocument(captionResources(body, assets), c, options);
  if (options.format !== "html") return source;
  // Render YAML as readable metadata rather than interpreting it as headings.
  source = source.replace(
    /^---\n([\s\S]*?)\n---\n/,
    (_, metadata: string) => `\`\`\`yaml\n${metadata}\n\`\`\`\n`,
  );
  return offlineHtml(
    source,
    c.title,
    options.embedMedia || options.mediaFiles,
    assets,
  );
}
