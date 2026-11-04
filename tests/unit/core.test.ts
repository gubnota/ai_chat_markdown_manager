import { beforeEach, describe, expect, it, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import {
  elementMarkdown,
  extractMarkdown,
  conversationDocument,
} from "../../src/markdown/legacy";
import {
  safeFilename,
  uniqueFilename,
  makeZip,
} from "../../src/operations/export";
import { BatchRunner } from "../../src/operations/batch";
import { defaults, loadSettings, recordHistory, read } from "../../src/storage";
import {
  filterConversations,
  toggleSelection,
} from "../../src/utils/selection";
import { safePosition, intersects } from "../../src/utils/position";
import { DOMAdapter } from "../../src/adapters/base";
import type { Conversation } from "../../src/types";
const c = (id: string, title = id): Conversation => ({
  id,
  platform: "chatgpt",
  title,
  url: `https://chatgpt.com/c/${id}`,
  status: "unknown",
  current: false,
  completeness: "partial",
});
beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  history.replaceState(null, "", "/");
});
function md(html: string) {
  const el = document.createElement("article");
  el.innerHTML = html;
  return elementMarkdown(el);
}
describe("preserved Markdown converter", () => {
  it("preserves language and nested fence content", () => {
    const text = md(
      '<pre><code class="language-ts">const a = `hello`;\n```</code></pre>',
    );
    expect(text).toContain("````ts");
    expect(text).toContain("const a = `hello`;");
  });
  it("converts tables and escapes table pipes", () => {
    const text = md(
      "<table><tr><th>Name</th><th>Value</th></tr><tr><td>A|B</td><td>42</td></tr></table>",
    );
    expect(text).toContain("| Name | Value |");
    expect(text).toContain("A\\|B");
  });
  it("preserves math annotation", () => {
    expect(
      md(
        '<span class="katex"><math><semantics><annotation encoding="application/x-tex">x^2 + y^2</annotation></semantics></math></span>',
      ),
    ).toContain("$x^2 + y^2$");
  });
  it("keeps safe images and links and rejects javascript URLs", () => {
    const text = md(
      '<p><img src="https://example.com/a.png" alt="Diagram"><a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a></p>',
    );
    expect(text).toContain("![Diagram](https://example.com/a.png)");
    expect(text).not.toContain("javascript:");
    expect(text).toContain("[good](https://example.com/)");
  });
  it("omits UI and unsafe DOM", () => {
    expect(
      md("<p>Keep me</p><button>Ignore me</button><script>evil()</script>"),
    ).toBe("Keep me\n");
  });
  it("rejects empty selection", () => {
    window.getSelection()?.removeAllRanges();
    expect(() => extractMarkdown({ selection: true })).toThrow(/select/i);
  });
  it("rejects empty pages", () => {
    document.body.innerHTML = "<main></main>";
    expect(() => extractMarkdown()).toThrow();
  });
  it("labels partial exports and quotes front matter", () => {
    const text = conversationDocument(
      "body",
      c("a", 'Title: "unsafe"'),
      defaults.export,
    );
    expect(text).toContain("completeness: partial");
    expect(text).toContain("Partial export:");
    expect(text).toContain('title: "Title: \\"unsafe\\""');
  });
});
describe("ZIP files and names", () => {
  it("sanitizes path traversal and device names", () => {
    expect(safeFilename("../../CON")).not.toContain("/");
    expect(safeFilename("CON")).toBe("_CON");
    expect(safeFilename("")).toBe("conversation");
  });
  it("avoids case-insensitive collisions", () => {
    const used = new Set<string>();
    expect(uniqueFilename("A.md", used)).toBe("A.md");
    expect(uniqueFilename("a.md", used)).toBe("a-2.md");
  });
  it("produces a working offline ZIP and manifest", () => {
    const bytes = makeZip(new Map([["a.md", "# Hello\n"]]), { partial: true });
    const entries = unzipSync(bytes);
    expect(strFromU8(entries["a.md"])).toBe("# Hello\n");
    expect(JSON.parse(strFromU8(entries["manifest.json"]))).toEqual({
      partial: true,
    });
  });
});
describe("stable selection and filters", () => {
  it("keeps selected IDs across search, sorting and new object instances", () => {
    const items = [c("b", "Zulu"), c("a", "Alpha")];
    const selected = toggleSelection(new Set(), items, "add");
    const visible = filterConversations([...items].reverse(), {
      query: "alp",
      platform: "all",
      status: "all",
      days: 0,
      sort: "title",
    });
    expect(visible.map((v) => v.id)).toEqual(["a"]);
    expect([...selected].sort()).toEqual(["chatgpt:a", "chatgpt:b"]);
    expect(toggleSelection(selected, visible, "invert").has("chatgpt:b")).toBe(
      true,
    );
  });
  it("does not invent dates or archive state", () => {
    expect(
      filterConversations([c("a")], {
        query: "",
        platform: "all",
        status: "archived",
        days: 0,
        sort: "newest",
      }),
    ).toEqual([]);
    expect(
      filterConversations([c("a")], {
        query: "",
        platform: "all",
        status: "all",
        days: 7,
        sort: "newest",
      }),
    ).toEqual([]);
  });
});
describe("local settings", () => {
  it("migrates old switches and rejects invalid values", () => {
    localStorage.setItem(
      "__safari_md_export_settings_v1__",
      JSON.stringify({ images: false }),
    );
    localStorage.setItem(
      "__ai_chat_md_v2__:settings",
      JSON.stringify({ scale: 99, theme: "bogus", opacity: "bad" }),
    );
    const s = loadSettings();
    expect(s.export.images).toBe(false);
    expect(s.scale).toBe(1.2);
    expect(s.theme).toBe("system");
    expect(s.opacity).toBe(0.96);
  });
  it("survives denied storage and malformed JSON", () => {
    localStorage.setItem("__ai_chat_md_v2__:settings", "{");
    expect(loadSettings().theme).toBe("system");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(loadSettings().fabSize).toBe(44);
  });
  it("persists counts without titles or IDs", () => {
    recordHistory({
      state: "completed",
      total: 1,
      completed: 1,
      failed: 0,
      skipped: 0,
      current: "secret",
      results: [{ key: "private-id", status: "success" }],
    });
    expect(JSON.stringify(read("history", []))).not.toMatch(
      /secret|private-id/,
    );
  });
});
describe("independent anchor geometry", () => {
  it.each([
    { x: 9999, y: -4 },
    { x: NaN, y: Infinity },
    { x: 800, y: 550 },
  ])("clamps corrupt and resized positions %o", (point) => {
    const p = safePosition(point, 900, 600);
    expect(p.x).toBeGreaterThanOrEqual(8);
    expect(p.x).toBeLessThanOrEqual(848);
    expect(p.y).toBeGreaterThanOrEqual(8);
    expect(p.y).toBeLessThanOrEqual(548);
  });
  it("avoids Send button reserve", () => {
    const reserved = { left: 780, top: 500, right: 890, bottom: 590 };
    const p = safePosition({ x: 820, y: 530 }, 900, 600, 44, [reserved]);
    expect(
      intersects(
        { left: p.x, top: p.y, right: p.x + 44, bottom: p.y + 44 },
        reserved,
      ),
    ).toBe(false);
  });
});
describe("partial DOM adapter", () => {
  const make = () =>
    new DOMAdapter({
      id: "chatgpt",
      name: "ChatGPT",
      path: /^\/c\/([\w-]+)$/,
      sidebar: "aside a",
    });
  it("combines genuine exported snapshots across SPA navigation and guards formatting changes", async () => {
    history.replaceState(null, "", "/c/a");
    document.body.innerHTML = "<main><p>First conversation body</p></main>";
    const adapter = make();
    await adapter.exportConversation(c("a"), defaults.export);
    history.replaceState(null, "", "/c/b");
    document.body.innerHTML = "<main><p>Second conversation body</p></main>";
    await adapter.exportConversation(c("b"), defaults.export);
    expect(await adapter.exportConversation(c("a"), defaults.export)).toContain(
      "First conversation body",
    );
    expect(
      (await adapter.discoverConversations()).find((v) => v.id === "a")?.cached,
    ).toBe(true);
    await expect(
      adapter.exportConversation(c("a"), { ...defaults.export, images: false }),
    ).rejects.toThrow(/formatting changed/);
    adapter.forget(c("a"));
    await expect(
      adapter.exportConversation(c("a"), defaults.export),
    ).rejects.toThrow(/identity/);
  });
  it("accumulates virtualized IDs and never treats link titles as messages", async () => {
    document.body.innerHTML =
      '<aside><a href="/c/a">Alpha</a></aside><main><p>Loaded body</p></main>';
    const adapter = make();
    expect(await adapter.discoverConversations()).toHaveLength(2);
    document.querySelector("aside")!.innerHTML = '<a href="/c/b">Beta</a>';
    expect(await adapter.discoverConversations()).toHaveLength(3);
    await expect(
      adapter.exportConversation(c("a"), defaults.export),
    ).rejects.toThrow(/not loaded/);
  });
  it("exports loaded page content with unavailable operations throwing", async () => {
    document.body.innerHTML = "<main><h1>Hello</h1><p>Loaded body</p></main>";
    const a = make();
    const current = (await a.discoverConversations()).find((v) => v.current)!;
    expect(await a.exportConversation(current, defaults.export)).toContain(
      "Loaded body",
    );
    await expect(a.archiveConversation(current)).rejects.toThrow(/unsupported/);
  });
});
describe("operation queue", () => {
  it("continues failures with exact results", async () => {
    const runner = new BatchRunner();
    const result = await runner.run(
      {
        kind: "export",
        conversations: [c("a"), c("b"), c("c")],
        stopOnError: false,
        delayMs: 0,
      },
      async (item) => {
        if (item.id === "b") throw new Error("Not loaded");
      },
      () => {},
    );
    expect(result).toMatchObject({
      state: "partially_completed",
      completed: 2,
      failed: 1,
      skipped: 0,
    });
    expect(runner.running).toBe(false);
  });
  it("cancels queued work without rolling back success", async () => {
    const runner = new BatchRunner();
    const work = vi.fn(async () => {
      runner.cancel();
    });
    const result = await runner.run(
      {
        kind: "delete",
        conversations: [c("a"), c("b")],
        stopOnError: false,
        delayMs: 0,
      },
      work,
      () => {},
    );
    expect(work).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      state: "cancelled",
      completed: 1,
      skipped: 1,
    });
  });
  it("prevents duplicate operation starts and stops on errors", async () => {
    const runner = new BatchRunner();
    let release!: () => void;
    const first = runner.run(
      {
        kind: "export",
        conversations: [c("a"), c("b")],
        stopOnError: true,
        delayMs: 0,
      },
      async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        throw new Error("failure");
      },
      () => {},
    );
    await expect(
      runner.run(
        { kind: "delete", conversations: [], stopOnError: false, delayMs: 0 },
        async () => {},
        () => {},
      ),
    ).rejects.toThrow(/already/);
    release();
    expect(await first).toMatchObject({
      state: "failed",
      failed: 1,
      skipped: 1,
    });
  });
});
