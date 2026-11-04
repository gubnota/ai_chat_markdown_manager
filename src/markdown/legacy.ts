// SPDX-License-Identifier: MIT OR Apache-2.0
// The inherited converter retains its original MIT notice in legacy-converter.js.
import { createConverter } from "./legacy-converter.js";
import type { ExportOptions, Conversation } from "../types";
export function extractMarkdown(options: Partial<ExportOptions> = {}): string {
  return createConverter(options).extract({ selection: options.selection });
}
export function elementMarkdown(
  node: Node,
  options: Partial<ExportOptions> = {},
): string {
  const converter = createConverter(options);
  return converter.cleanup(converter.toMarkdown(node)) + "\n";
}
export function conversationDocument(
  body: string,
  c: Conversation,
  options: ExportOptions,
): string {
  const header: string[] = [];
  if (options.metadata) {
    header.push(
      "---",
      `title: ${JSON.stringify(c.title)}`,
      `platform: ${JSON.stringify(c.platform)}`,
      `completeness: ${c.completeness}`,
    );
    if (options.source) header.push(`source: ${JSON.stringify(c.url)}`);
    if (options.timestamps && c.updatedAt)
      header.push(`updated: ${JSON.stringify(c.updatedAt)}`);
    header.push("---", "");
  }
  if (options.title) header.push(`# ${c.title.replace(/[\r\n]/g, " ")}`, "");
  if (options.source && !options.metadata) header.push(`Source: ${c.url}`, "");
  if (c.completeness === "partial")
    header.push(
      "> Partial export: only content currently loaded by the platform is available.",
      "",
    );
  return header.join("\n") + "\n" + body;
}
