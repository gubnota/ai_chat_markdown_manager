// SPDX-License-Identifier: MIT OR Apache-2.0
import type {
  CaptureMedia,
  Conversation,
  ExportOptions,
  MissingMedia,
} from "../types";
import { exportDocument } from "./document";
import { decodeMedia, embedMarkdownMedia } from "../markdown/media";
import { safeFilename } from "./export";
import { assetFilename, rewriteResources } from "./resources";

function assetPath(name: string, label: string, mime: string, index: number) {
  const path = `assets/${safeFilename(name.replace(/\.(md|html)$/i, ""))}/${index}-${assetFilename(label, mime)}`;
  // URL-encode names while keeping ZIP paths readable and platform portable.
  const url = path
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment).replaceAll("(", "%28").replaceAll(")", "%29"),
    )
    .join("/");
  return { path, url };
}

/** Localize each live window before it leaves the DOM. Keep only paths and MIME types. */
export function separateMedia(
  name: string,
  add: (path: string, bytes: Uint8Array) => Promise<void>,
): { capture: CaptureMedia; assets: ReadonlyMap<string, string> } {
  const paths = new Map<string, string>();
  const assets = new Map<string, string>();
  const writeAsset = async (label: string, mime: string, bytes: Uint8Array) => {
    const { path, url } = assetPath(name, label, mime, assets.size + 1);
    await add(path, bytes);
    assets.set(url, mime);
    return url;
  };
  const capture: CaptureMedia = async (
    body,
    roots,
    options,
    signal,
    missingMedia,
  ) => {
    await embedMarkdownMedia(body, roots, options, signal, missingMedia, {
      has: (href) => paths.has(href),
      async write(href, label, mime, bytes) {
        paths.set(href, await writeAsset(label, mime, bytes));
      },
    });

    // Canvas-only previews and inline raster images have no fetchable DOM URL.
    // Walk real tokens first, then decode one asset at a time.
    const inline = new Map<string, string>();
    if (body.includes("data:"))
      rewriteResources(body, (href, label) => {
        if (href.startsWith("data:") && !inline.has(href))
          inline.set(href, label);
        return href;
      });
    for (const [href, label] of inline) {
      signal?.throwIfAborted();
      const asset = decodeMedia(href);
      if (asset)
        inline.set(href, await writeAsset(label, asset.mime, asset.bytes));
      else inline.delete(href);
    }
    return rewriteResources(
      body,
      (href) => paths.get(href) ?? inline.get(href) ?? href,
      missingMedia,
    );
  };
  return { capture, assets };
}

export function prepareDocument(
  body: string,
  conversation: Conversation,
  options: ExportOptions,
  name: string,
  missingMedia?: MissingMedia,
  assets?: ReadonlyMap<string, string>,
  historyWarning?: string,
): { text: string; name: string } {
  const unavailable = new Set(
    missingMedia ? [...missingMedia.values()].map(({ kind }) => kind) : [],
  );
  const issues = [
    historyWarning,
    unavailable.has("image")
      ? "One or more images could not be saved."
      : undefined,
    unavailable.has("file")
      ? "One or more linked files or media could not be saved."
      : undefined,
  ].filter(Boolean);
  const warning = issues.length
    ? `> Incomplete offline export: ${issues.join(" ")} Keep the original chat.\n\n`
    : "";
  return {
    name,
    text: exportDocument(warning + body, conversation, options, assets),
  };
}
