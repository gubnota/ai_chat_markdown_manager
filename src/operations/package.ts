// SPDX-License-Identifier: MIT OR Apache-2.0
import { Lexer, type Token } from "marked";
import type { CaptureMedia, Conversation, ExportOptions } from "../types";
import { exportDocument } from "./document";
import { decodeMedia, embedMarkdownMedia } from "../markdown/media";
import { safeFilename } from "./export";

const extensions: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function assetPath(name: string, label: string, mime: string, index: number) {
  let base = safeFilename(label || "attachment");
  if (mime !== "application/octet-stream") {
    const extension =
      extensions[mime] || mime.split("/")[1].replace(/[^a-z0-9]/g, "");
    base = base.replace(/\.[a-z0-9]{1,8}$/i, "") + "." + extension;
  }
  const path = `assets/${safeFilename(name.replace(/\.(md|html)$/i, ""))}/${index}-${base}`;
  // URL-encode names while keeping ZIP paths readable and platform portable.
  const url = path
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment).replaceAll("(", "%28").replaceAll(")", "%29"),
    )
    .join("/");
  return { path, url };
}

function rewriteResources(
  body: string,
  resource: (href: string, label: string) => string,
  missingImages?: ReadonlyMap<string, string>,
): string {
  function rewrite(source: string, tokens: Token[]): string {
    let cursor = 0,
      output = "";
    for (const token of tokens) {
      const start = source.indexOf(token.raw, cursor);
      if (start < cursor) continue;
      output += source.slice(cursor, start);
      let raw = token.raw;
      if (
        (token.type === "image" || token.type === "link") &&
        "href" in token
      ) {
        const href = token.href as string;
        if (token.type === "image" && missingImages?.has(href)) {
          raw = "*Image unavailable offline.*";
        } else {
          const replacement = resource(
            href,
            "text" in token ? String(token.text) : "attachment",
          );
          if (
            token.type === "link" &&
            "tokens" in token &&
            Array.isArray(token.tokens)
          )
            raw = rewrite(raw, token.tokens);
          const destination = raw.lastIndexOf(href);
          if (replacement !== href && destination >= 0)
            raw =
              raw.slice(0, destination) +
              replacement +
              raw.slice(destination + href.length);
        }
      } else if (
        token.type !== "code" &&
        token.type !== "codespan" &&
        token.type !== "html"
      ) {
        if ("tokens" in token && Array.isArray(token.tokens))
          raw = rewrite(raw, token.tokens);
        else if (token.type === "list") raw = rewrite(raw, token.items);
        else if (token.type === "table")
          raw = rewrite(
            raw,
            [...token.header, ...token.rows.flat()].flatMap(
              (cell) => cell.tokens,
            ),
          );
      }
      output += raw;
      cursor = start + token.raw.length;
    }
    return output + source.slice(cursor);
  }
  return rewrite(body, Lexer.lex(body));
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
    missingImages,
  ) => {
    await embedMarkdownMedia(body, roots, options, signal, missingImages, {
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
      missingImages,
    );
  };
  return { capture, assets };
}

export function prepareDocument(
  body: string,
  conversation: Conversation,
  options: ExportOptions,
  name: string,
  missingImages?: ReadonlyMap<string, string>,
  assets?: ReadonlyMap<string, string>,
): { text: string; name: string } {
  const warning = missingImages?.size
    ? "> Incomplete offline export: one or more images could not be saved. Keep the original chat.\n\n"
    : "";
  return {
    name,
    text: exportDocument(warning + body, conversation, options, assets),
  };
}
