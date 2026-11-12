import { expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { prepareDocument, separateMedia } from "../../src/operations/package";
import { filename, makeZip, uniqueFilename } from "../../src/operations/export";
import { offlineHtml } from "../../src/operations/document";
import { defaults } from "../../src/storage";
import type { Conversation, ExportOptions } from "../../src/types";
const chat: Conversation = {
  platform: "chatgpt",
  id: "one",
  title: "Offline bundle",
  url: "https://chatgpt.com/c/one",
  current: true,
  completeness: "partial",
  status: "unknown",
};
const image = "data:image/png;base64,AAEC/w==";
const input = "data:application/octet-stream;base64,aW5wdXQ=";
async function pack(body: string, options: ExportOptions, name: string) {
  const files = new Map<string, string | Uint8Array>();
  const media = separateMedia(name, async (path, bytes) => {
    files.set(path, bytes);
  });
  const localized = await media.capture(body, [], options);
  const document = prepareDocument(
    localized,
    chat,
    options,
    name,
    undefined,
    media.assets,
  );
  files.set(name, document.text);
  return { ...document, files };
}
it("keeps assets separate for chats with the same long filename", async () => {
  const options = { ...defaults.export, mediaFiles: true };
  const used = new Set<string>();
  const files = new Map<string, string | Uint8Array>();
  for (const data of [image, "data:image/png;base64,AA=="]) {
    const name = uniqueFilename(filename(chat, "a".repeat(150)), used);
    const result = await pack(`![Photo](${data})`, options, name);
    for (const [path, bytes] of result.files) files.set(path, bytes);
    expect(result.text).toContain(`assets/${name.slice(0, -3)}/1-Photo.png`);
  }
  const zipped = unzipSync(makeZip(files, undefined));
  expect(zipped[`assets/${"a".repeat(110)}/1-Photo.png`]).toEqual(
    new Uint8Array([0, 1, 2, 255]),
  );
  expect(zipped[`assets/${"a".repeat(108)}-2/1-Photo.png`]).toEqual(
    new Uint8Array([0]),
  );
  expect(Object.keys(zipped)).toHaveLength(4);
});
it.each(["markdown", "html"] as const)(
  "packs exact binary assets and references into %s ZIP with portable links",
  async (format) => {
    const options = { ...defaults.export, format, mediaFiles: true };
    const name = format === "html" ? "trip.html" : "trip.md";
    const result = await pack(
      `![Map](${image})\n\n[reference notes.csv](${input})\n\n![Again](${image})`,
      options,
      name,
    );
    const zipped = unzipSync(makeZip(result.files, undefined));
    expect(Object.keys(zipped)).toHaveLength(3);
    expect([...zipped["assets/trip/1-Map.png"]]).toEqual([0, 1, 2, 255]);
    expect(strFromU8(zipped["assets/trip/2-reference notes.csv"])).toBe(
      "input",
    );
    expect(result.text).toContain("assets/trip/1-Map.png");
    expect(result.text).toContain("assets/trip/2-reference%20notes.csv");
    expect(result.text).not.toContain("base64");
    if (format === "html") {
      const parsed = new DOMParser().parseFromString(result.text, "text/html");
      expect(parsed.querySelectorAll("img")).toHaveLength(2);
      expect(parsed.querySelector("a[download]")?.getAttribute("href")).toBe(
        "assets/trip/2-reference%20notes.csv",
      );
    }
  },
);
it("rewrites resource tokens in lists, quotes and tables but leaves code examples untouched", async () => {
  const example = `![Example](${image})`;
  const body = `\`\`\`md\n${example}\n\`\`\`\n\n\`${example}\`\n\n- ![List](${image})\n\n> ![Quote](${image})\n\n| Map |\n| --- |\n| ![Table](${image}) |`;
  const result = await pack(
    body,
    { ...defaults.export, mediaFiles: true },
    "one.md",
  );
  expect(result.text).toContain(`\`\`\`md\n${example}\n\`\`\``);
  expect(result.text).toContain(`\`${example}\``);
  expect(result.text).toContain("![List](assets/one/1-List.png)");
  expect(result.text).toContain("![Quote](assets/one/1-List.png)");
  expect(result.text).toContain("![Table](assets/one/1-List.png)");
  expect(result.files.size).toBe(2);
});
it("keeps linked and inline exports unchanged when packaging is off", () => {
  const result = prepareDocument(
    `![Map](${image})`,
    chat,
    defaults.export,
    "one.md",
  );
  expect(result.text).toContain(image);
});
it("rejects arbitrary local paths and packs over 100 inline resources", async () => {
  expect(() => offlineHtml("![Unsafe](../private.png)", "unsafe")).toThrow();
  const body = Array.from(
    { length: 101 },
    (_, i) =>
      `[${i}.txt](data:application/octet-stream;base64,${btoa(String(i))})`,
  ).join("\n\n");
  const result = await pack(
    body,
    { ...defaults.export, mediaFiles: true },
    "one.md",
  );
  expect(result.files.size).toBe(102);
  expect(result.text).toContain("[100.txt](assets/one/101-100.txt)");
});
