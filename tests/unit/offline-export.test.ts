import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { elementMarkdown } from "../../src/markdown/legacy";
import { embedMarkdownMedia } from "../../src/markdown/media";
import { exportDocument, offlineHtml } from "../../src/operations/document";
import { filename, uniqueFilename } from "../../src/operations/export";
import { defaults, loadSettings } from "../../src/storage";
import type { Conversation, ExportOptions } from "../../src/types";

const chat: Conversation = {
  platform: "gemini",
  id: "one",
  title: "Plane <notes>",
  url: "https://gemini.google.com/app/one",
  current: true,
  completeness: "partial",
  status: "unknown",
};
const options: ExportOptions = { ...defaults.export, embedMedia: true };
function fixture(html: string) {
  document.body.innerHTML = `<main><user-query>${html}</user-query></main>`;
  const root = document.querySelector("user-query")!;
  return { root, text: elementMarkdown(root, options) };
}
beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("offline resources", () => {
  it("embeds exact image, audio/video and input-file bytes, deduplicating requests and leaving ordinary links alone", async () => {
    const { root, text } = fixture(
      '<img alt="map" src="https://files.test/map.png"><img alt="again" src="https://files.test/map.png"><audio src="https://files.test/voice.wav"></audio><video><source src="https://files.test/clip.mp4"></video><file-preview data-file-name="input.csv"><a href="https://files.test/signed">input.csv</a></file-preview><a href="https://example.com/help">Help</a>',
    );
    const fetcher = vi.fn(
      async (url: string) =>
        new Response("exact bytes", {
          headers: {
            "content-type": url.endsWith("png")
              ? "image/png"
              : url.endsWith("wav")
                ? "audio/wav"
                : url.endsWith("mp4")
                  ? "video/mp4"
                  : "text/csv",
          },
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = await embedMarkdownMedia(text, [root], options);
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(result).toContain(
      `![map](data:image/png;base64,${btoa("exact bytes")})`,
    );
    expect(result).toContain("[Audio](data:audio/wav;base64,");
    expect(result).toContain("[Video](data:video/mp4;base64,");
    expect(result).toContain(
      `[input.csv](data:application/octet-stream;base64,${btoa("exact bytes")})`,
    );
    expect(result).toContain("[Help](https://example.com/help)");
  });
  it("makes no media requests in ordinary Markdown link mode", async () => {
    const { root, text } = fixture('<img src="https://files.test/map.png">');
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await embedMarkdownMedia(text, [root], defaults.export)).toBe(text);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([403, 404])(
    "fails closed on HTTP %s without claiming an offline backup",
    async (status) => {
      const { root, text } = fixture(
        '<file-preview data-file-name="input.pdf"><a href="https://files.test/file">input.pdf</a></file-preview>',
      );
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("denied", { status })),
      );
      await expect(embedMarkdownMedia(text, [root], options)).rejects.toThrow(
        /could not be embedded/,
      );
    },
  );
  it("rejects missing files, login pages, and oversized responses", async () => {
    const absent = fixture(
      '<file-preview><button><span class="file-name">private.csv</span></button></file-preview>',
    );
    await expect(
      embedMarkdownMedia(absent.text, [absent.root], options),
    ).rejects.toThrow(/direct link unavailable/);
    const { root, text } = fixture(
      '<file-preview data-file-name="input.pdf"><a href="https://files.test/file">input.pdf</a></file-preview>',
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("login", { headers: { "content-type": "text/html" } }),
      ),
    );
    await expect(embedMarkdownMedia(text, [root], options)).rejects.toThrow(
      /login screen/,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("large", {
            headers: { "content-length": String(21 * 1024 * 1024) },
          }),
      ),
    );
    await expect(embedMarkdownMedia(text, [root], options)).rejects.toThrow(
      /20 MiB/,
    );
  });
  it("does not request hidden or unreferenced resources and respects cancellation", async () => {
    const { root, text } = fixture(
      '<p>Hello</p><img hidden src="https://files.test/secret.png"><a href="https://files.test/unreferenced">normal</a>',
    );
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await embedMarkdownMedia(text, [root], options);
    expect(fetcher).not.toHaveBeenCalled();
    const controller = new AbortController();
    controller.abort();
    await expect(
      embedMarkdownMedia(text, [root], options, controller.signal),
    ).rejects.toThrow();
  });
  it("HTML forces embedding even with the Markdown embed switch off", async () => {
    const { root, text } = fixture(
      '<img alt="map" src="https://files.test/map.png">',
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("pixels", { headers: { "content-type": "image/png" } }),
      ),
    );
    expect(
      await embedMarkdownMedia(text, [root], {
        ...options,
        format: "html",
        embedMedia: false,
      }),
    ).toContain("data:image/png;base64,");
  });
});

describe("standalone HTML", () => {
  it("renders readable content, metadata, tables, code, media and downloadable input files without external assets", () => {
    const body =
      "# Notes\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```js\nconst value = 42;\n```\n\n![map](data:image/png;base64,YQ==)\n\n[Audio](data:audio/wav;base64,Yg==)\n\n[input.csv](data:application/octet-stream;base64,Yw==)";
    const html = exportDocument(body, chat, { ...options, format: "html" });
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.title).toBe(chat.title);
    expect(doc.querySelector("table td")?.textContent).toBe("1");
    expect(doc.querySelector("pre code")?.textContent).toContain("title:");
    expect(doc.body.textContent).toContain("const value = 42;");
    expect(doc.body.textContent).toContain("Partial export");
    expect(doc.querySelector("audio")?.getAttribute("src")).toBe(
      "data:audio/wav;base64,Yg==",
    );
    expect(doc.querySelector("a[download]")?.getAttribute("download")).toBe(
      "Audio",
    );
    expect(
      doc.querySelector('a[download="input.csv"]')?.getAttribute("href"),
    ).toBe("data:application/octet-stream;base64,Yw==");
    expect(
      doc
        .querySelector('meta[http-equiv="Content-Security-Policy"]')
        ?.getAttribute("content"),
    ).toContain("default-src 'none'");
  });
  it("removes active markup and unsafe protocols while preserving literal code", () => {
    const html = offlineHtml(
      '<script>alert(1)</script>\n\n<iframe src="https://evil.test"></iframe><form action="https://evil.test"><input></form>\n\n<a href="javascript:alert(1)" onclick="evil()">unsafe</a>\n\n```html\n<script>example</script>\n```',
      "</title><script>evil()</script>",
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(
      doc.querySelector("script,iframe,form,[onclick],a[href^='javascript']"),
    ).toBeNull();
    expect(doc.querySelector("code")?.textContent).toContain(
      "<script>example</script>",
    );
    expect(doc.title).toBe("</title><script>evil()</script>");
    expect(() =>
      offlineHtml("![online](https://evil.test/image.png)", "title"),
    ).toThrow(/unavailable image/);
  });
  it("keeps Markdown as default and validates migrated format values", () => {
    expect(exportDocument("body", chat, defaults.export)).not.toContain(
      "<!doctype",
    );
    localStorage.setItem(
      "__ai_chat_md_v2__:settings",
      JSON.stringify({ export: { format: "evil", embedMedia: true } }),
    );
    expect(loadSettings().export).toMatchObject({
      format: "markdown",
      embedMedia: true,
    });
    expect(filename(chat, "{id}", "html")).toBe("one.html");
    const used = new Set<string>();
    expect(uniqueFilename("a.html", used)).toBe("a.html");
    expect(uniqueFilename("A.html", used)).toBe("A-2.html");
  });
});
