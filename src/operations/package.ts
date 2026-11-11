// SPDX-License-Identifier: MIT OR Apache-2.0
import { Lexer, type Token } from "marked";
import type { Conversation, ExportOptions } from "../types";
import { exportDocument } from "./document";
import { safeFilename } from "./export";

export type ExportFiles = Map<string, string | Uint8Array>;
export interface PreparedDocument {
  text: string;
  name: string;
  files: ExportFiles;
}
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

/** Rewrite actual Markdown resource tokens, leaving code/HTML examples untouched. */
export function prepareDocument(
  body: string,
  conversation: Conversation,
  options: ExportOptions,
  name: string,
): PreparedDocument {
  const files: ExportFiles = new Map();
  const assets = new Map<string, string>();
  const captured = new Map<string, string>();
  let total = 0;
  function resource(href: string, label: string): string {
    const existing = captured.get(href);
    if (existing) return existing;
    const match =
      /^data:((?:image\/(?:png|jpeg|gif|webp|avif|bmp)|(?:audio|video)\/[a-z0-9.+-]+|application\/octet-stream));base64,([a-z0-9+/=\r\n]+)$/i.exec(
        href,
      );
    if (!match) return href;
    const mime = match[1].toLowerCase();
    if (match[2].length > 28 * 1024 * 1024 || captured.size >= 100)
      throw new Error(
        "Offline bundle exceeds resource limits. Keep the original chat.",
      );
    const binary = atob(match[2]);
    total += binary.length;
    if (binary.length > 20 * 1024 * 1024 || total > 64 * 1024 * 1024)
      throw new Error(
        "Offline bundle exceeds size limits. Keep the original chat.",
      );
    let base = safeFilename(label || "attachment");
    if (mime !== "application/octet-stream") {
      const extension =
        extensions[mime] || mime.split("/")[1].replace(/[^a-z0-9]/g, "");
      base = base.replace(/\.[a-z0-9]{1,8}$/i, "") + "." + extension;
    }
    const path = `assets/${safeFilename(name.replace(/\.(md|html)$/i, ""))}/${captured.size + 1}-${base}`;
    // URL-encode names while keeping ZIP paths readable and platform portable.
    const url = path.split("/").map(encodeURIComponent).join("/");
    files.set(
      path,
      Uint8Array.from(binary, (c) => c.charCodeAt(0)),
    );
    assets.set(url, mime);
    captured.set(href, url);
    return url;
  }
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
        const replacement = resource(
          href,
          "text" in token ? String(token.text) : "attachment",
        );
        if (replacement !== href) raw = raw.replace(href, replacement);
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
  const rewritten = options.mediaFiles ? rewrite(body, Lexer.lex(body)) : body;
  const text = exportDocument(rewritten, conversation, options, assets);
  files.set(name, text);
  return { text, name, files };
}

export function renamedDocument(
  document: PreparedDocument,
  name: string,
): ExportFiles {
  const files = new Map(document.files);
  files.delete(document.name);
  files.set(name, document.text);
  return files;
}
