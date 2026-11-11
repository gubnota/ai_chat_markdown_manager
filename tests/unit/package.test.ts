import { expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { prepareDocument, renamedDocument } from "../../src/operations/package";
import { makeZip } from "../../src/operations/export";
import { offlineHtml } from "../../src/operations/document";
import { defaults } from "../../src/storage";
import type { Conversation } from "../../src/types";
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
it.each(["markdown", "html"] as const)(
  "packs exact binary assets and references into %s ZIP with portable links",
  (format) => {
    const options = { ...defaults.export, format, mediaFiles: true };
    const name = format === "html" ? "trip.html" : "trip.md";
    const result = prepareDocument(
      `![Map](${image})\n\n[reference notes.csv](${input})\n\n![Again](${image})`,
      chat,
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
    const renamed = renamedDocument(
      result,
      "holiday." + (format === "html" ? "html" : "md"),
    );
    expect(renamed.has(name)).toBe(false);
    expect(renamed.size).toBe(3);
  },
);
it("rewrites resource tokens in lists, quotes and tables but leaves code examples untouched", () => {
  const example = `![Example](${image})`;
  const body = `\`\`\`md\n${example}\n\`\`\`\n\n\`${example}\`\n\n- ![List](${image})\n\n> ![Quote](${image})\n\n| Map |\n| --- |\n| ![Table](${image}) |`;
  const result = prepareDocument(
    body,
    chat,
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
  expect(result.files.size).toBe(1);
  expect(result.text).toContain(image);
});
it("rejects arbitrary local paths and retains the explicit resource cap", () => {
  expect(() => offlineHtml("![Unsafe](../private.png)", "unsafe")).toThrow();
  const body = Array.from(
    { length: 101 },
    (_, i) =>
      `[${i}.txt](data:application/octet-stream;base64,${btoa(String(i))})`,
  ).join("\n\n");
  expect(() =>
    prepareDocument(
      body,
      chat,
      { ...defaults.export, mediaFiles: true },
      "one.md",
    ),
  ).toThrow("limits");
});
