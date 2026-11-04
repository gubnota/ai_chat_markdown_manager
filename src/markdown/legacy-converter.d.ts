import type { ExportOptions } from "../types";

/** Typed boundary for the minimally changed, inherited JavaScript converter. */
export function createConverter(options?: Partial<ExportOptions>): {
  extract(options?: { selection?: boolean }): string;
  toMarkdown(node: Node): string;
  cleanup(markdown: string): string;
};
