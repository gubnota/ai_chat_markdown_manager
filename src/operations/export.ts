import { strToU8, zipSync } from "fflate";
import type { Conversation, ExportOptions } from "../types";
const maxStemLength = 110;

// Filenames must remove Windows-invalid control characters too.
export function safeFilename(value: string): string {
  const clean =
    value
      .normalize("NFKC")
      // eslint-disable-next-line no-control-regex -- Remove filesystem-invalid controls.
      .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "_")
      .replace(/\s+/g, " ")
      .replace(/^[. ]+|[. ]+$/g, "")
      .slice(0, maxStemLength)
      .replace(/[. ]+$/, "") || "conversation";
  return /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(clean)
    ? `_${clean.slice(0, maxStemLength - 1).replace(/[. ]+$/, "")}`
    : clean;
}
export function filename(
  c: Conversation,
  pattern = "{platform}-{date}-{slug}",
  format: ExportOptions["format"] = "markdown",
): string {
  return (
    safeFilename(
      pattern
        .replaceAll("{platform}", c.platform)
        .replaceAll("{date}", c.updatedAt?.slice(0, 10) || "undated")
        .replaceAll("{slug}", c.title)
        .replaceAll("{id}", c.id),
    ) + (format === "html" ? ".html" : ".md")
  );
}
export function uniqueFilename(name: string, used: Set<string>): string {
  const extension = name.match(/\.(?:md|html)$/i)?.[0] || ".md";
  const stem = name.slice(0, name.length - extension.length);
  let candidate = name,
    index = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = `-${index++}`;
    candidate = `${stem.slice(0, maxStemLength - suffix.length)}${suffix}${extension}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}
export function makeZip(
  files: Map<string, string | Uint8Array>,
  manifest: unknown | undefined,
): Uint8Array {
  const entries: Record<string, Uint8Array> = Object.create(null) as Record<
    string,
    Uint8Array
  >;
  for (const [name, body] of files)
    entries[name] = typeof body === "string" ? strToU8(body) : body;
  if (manifest !== undefined)
    entries["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
  return zipSync(entries, { level: 6 });
}
export function download(
  data: string | Uint8Array,
  name: string,
  mime = "text/markdown;charset=utf-8",
): void {
  const blob = new Blob(
    [typeof data === "string" ? data : new Uint8Array(data)],
    { type: mime },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.dataset.mdExportIgnore = "";
  a.style.display = "none";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function copyMarkdown(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {}
  const area = document.createElement("textarea");
  area.value = text;
  area.readOnly = true;
  area.style.cssText = "position:fixed;left:-9999px;opacity:0";
  document.body.append(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok)
    throw new Error(
      "Clipboard permission unavailable. Save a Markdown file instead.",
    );
}
