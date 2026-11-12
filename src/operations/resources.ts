// SPDX-License-Identifier: MIT OR Apache-2.0
import { Lexer, type Token } from "marked";
import { linkedFilename, pathFilename } from "../markdown/filenames";
import type { MissingMedia } from "../types";
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

export function assetFilename(label: string, mime: string): string {
  const base = safeFilename(label || "attachment");
  if (mime === "application/octet-stream") return base;
  const extension =
    extensions[mime] || mime.split("/")[1].replace(/[^a-z0-9]/g, "");
  return base.replace(/\.[a-z0-9]{1,8}$/i, "") + "." + extension;
}

export function rewriteResources(
  body: string,
  resource: (href: string, label: string) => string,
  missingMedia?: MissingMedia,
  caption?: (href: string, label: string, image: boolean) => string,
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
        const label = "text" in token ? String(token.text) : "attachment";
        const image = token.type === "image";
        if (image && missingMedia?.get(href)?.kind === "image") {
          raw = "*Image unavailable offline.*";
        } else {
          const replacement = resource(href, label);
          if (!image && "tokens" in token && Array.isArray(token.tokens))
            raw = rewrite(raw, token.tokens);
          const destination = raw.lastIndexOf(href);
          if (replacement !== href && destination >= 0)
            raw =
              raw.slice(0, destination) +
              replacement +
              raw.slice(destination + href.length);
          raw += caption?.(replacement, label, image) ?? "";
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

const unescapeLabel = (value: string) =>
  value.replace(/\\([\\`*_{}[\]<>])/g, "$1");
const inlineType =
  /^data:((?:image|audio|video)\/[a-z0-9.+-]+|application\/octet-stream);base64,/i;

/** Keep captions visible in both Markdown source and rendered HTML. */
export function captionResources(
  body: string,
  assets: ReadonlyMap<string, string>,
): string {
  if (!body.includes("]")) return body;
  const generatedImages = new Map<string, string>();
  return rewriteResources(
    body,
    (href) => href,
    undefined,
    (href, rawLabel, image) => {
      const label = unescapeLabel(rawLabel);
      const mime = inlineType.exec(href)?.[1].toLowerCase();
      let name = assets.has(href) ? pathFilename(href) : linkedFilename(href);
      if (!name && image) {
        name =
          generatedImages.get(href) ||
          `${generatedImages.size + 1}-${mime ? assetFilename(label || "Image", mime) : safeFilename(label || "Image")}`;
        generatedImages.set(href, name);
      }
      if (!name && mime && mime !== "application/octet-stream")
        name = assetFilename(label, mime);
      if (!name || (!image && name === label)) return "";
      const ticks = "`".repeat(
        Math.max(1, ...(name.match(/`+/g) || []).map((run) => run.length + 1)),
      );
      return ` ${ticks} ${name.replace(/\|/g, "\\|")} ${ticks}`;
    },
  );
}
