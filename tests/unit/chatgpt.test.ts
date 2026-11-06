import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatGPTAdapter } from "../../src/adapters/chatgpt";
import { GeminiAdapter } from "../../src/adapters/gemini";
import { createAdapter } from "../../src/adapters";
import { BatchRunner } from "../../src/operations/batch";

const id = { platform: "chatgpt", id: "one" };
function fixture(
  options: {
    noRemoval?: boolean;
    wrongTitle?: boolean;
    generic?: boolean;
    abort?: AbortController;
    reused?: boolean;
    archiveLabel?: string;
    mutate?: boolean;
    replaceSidebar?: boolean;
  } = {},
) {
  document.body.innerHTML = `<aside>${["one", "two"].map((key) => `<a href="/c/${key}"><span>Chat ${key}</span><button aria-label="Open conversation options">⋮</button></a>`).join("")}</aside><main><h1>Chat one</h1></main>`;
  const clicks: string[] = [];
  const reused = document.createElement("div");
  reused.role = "menu";
  reused.hidden = true;
  if (options.reused) document.body.append(reused);
  document.querySelectorAll<HTMLAnchorElement>("aside a").forEach((link) => {
    link.querySelector("button")!.addEventListener("click", () => {
      const menu = options.reused ? reused : document.createElement("div");
      menu.role = "menu";
      menu.hidden = false;
      menu.innerHTML = `<button role="menuitem">${options.archiveLabel || "Archive"}</button><button role="menuitem">Delete</button><button role="menuitem">Delete all chats</button>`;
      document.body.append(menu);
      menu.addEventListener(
        "keydown",
        () => {
          menu.hidden = true;
        },
        { once: true },
      );
      const [archive, remove, all] = menu.querySelectorAll("button");
      all.onclick = () => clicks.push("WRONG-all");
      archive.onclick = () => {
        clicks.push(`archive:${link.pathname}`);
        menu.hidden = true;
        if (!options.noRemoval) link.remove();
        if (options.replaceSidebar) document.querySelector("aside")!.remove();
        options.abort?.abort();
      };
      remove.onclick = () => {
        menu.hidden = true;
        const dialog = document.createElement("div");
        dialog.role = "alertdialog";
        dialog.innerHTML = `<p>Delete chat? ${options.generic ? "" : `<strong>${options.wrongTitle ? "Other chat" : link.querySelector("span")!.textContent}</strong>`}</p><button>Cancel</button><button>Delete</button>`;
        document.body.append(dialog);
        dialog.querySelector("button")!.onclick = () => dialog.remove();
        dialog.querySelectorAll("button")[1].onclick = () => {
          clicks.push(`delete:${link.pathname}`);
          if (!options.noRemoval) {
            link.remove();
            dialog.remove();
          }
          options.abort?.abort();
        };
        if (options.mutate) link.querySelector("span")!.textContent = "Changed";
      };
    });
  });
  return clicks;
}
const make = () => new ChatGPTAdapter({ timeoutMs: 650 });
beforeEach(() => {
  history.replaceState(null, "", "/c/one");
});
describe("ChatGPT native batches", () => {
  it("factory discovers runtime controls and strips nested button labels from titles", async () => {
    fixture();
    const adapter = createAdapter();
    expect(adapter).toBeInstanceOf(ChatGPTAdapter);
    expect((await adapter.discoverConversations()).map((c) => c.title)).toEqual(
      ["Chat one", "Chat two"],
    );
    expect(adapter.capabilities).toMatchObject({
      archive: "supported",
      delete: "supported",
    });
  });
  it("keeps capabilities unknown when controls are absent", async () => {
    fixture();
    document.querySelectorAll("button").forEach((el) => el.remove());
    const adapter = make();
    await adapter.discoverConversations();
    expect(adapter.capabilities).toMatchObject({
      archive: "unknown",
      delete: "unknown",
    });
  });
  it.each(["archive", "delete"] as const)(
    "runs sequential %s without account-wide actions or resurrecting the current chat",
    async (kind) => {
      const clicks = fixture();
      const adapter = make();
      const items = await adapter.discoverConversations();
      const result = await new BatchRunner().run(
        { kind, conversations: items, delayMs: 0, stopOnError: true },
        (c, s) =>
          kind === "archive"
            ? adapter.archiveConversation(c, s)
            : adapter.deleteConversation(c, s),
        () => {},
      );
      expect(result).toMatchObject({ completed: 2, failed: 0 });
      expect(clicks).toEqual([`${kind}:/c/one`, `${kind}:/c/two`]);
      expect(await adapter.discoverConversations()).toEqual([]);
    },
  );
  it("accepts reused hidden native menus", async () => {
    const clicks = fixture({ reused: true });
    await make().archiveConversation(id);
    expect(clicks).toEqual(["archive:/c/one"]);
  });
  it.each(["Архивировать", "Archivieren", "Archiver", "Archivar"])(
    "archives with exact localized label %s",
    async (archiveLabel) => {
      const clicks = fixture({ archiveLabel });
      await make().archiveConversation(id);
      expect(clicks).toEqual(["archive:/c/one"]);
    },
  );
  it.each([{ wrongTitle: true }, { generic: true }, { mutate: true }])(
    "never confirms a mismatched or generic dialog: %j",
    async (options) => {
      const clicks = fixture(options);
      await expect(make().deleteConversation(id)).rejects.toThrow(
        /identify|changed/,
      );
      expect(clicks).toEqual([]);
      expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    },
  );
  it("refuses existing unrelated dialogs before any clicks", async () => {
    fixture();
    const dialog = document.createElement("div");
    dialog.role = "dialog";
    document.body.append(dialog);
    const click = vi.spyOn(HTMLElement.prototype, "click");
    await expect(make().archiveConversation(id)).rejects.toThrow(/existing/);
    expect(click).not.toHaveBeenCalled();
  });
  it("does not treat sidebar replacement as confirmed removal", async () => {
    fixture({ replaceSidebar: true });
    await expect(make().archiveConversation(id)).rejects.toMatchObject({
      actionAttempted: true,
    });
  });
  it("reports verified in-flight success after cancellation and skips the next target", async () => {
    const runner = new BatchRunner();
    const controller = new AbortController();
    const clicks = fixture({ abort: controller });
    controller.signal.addEventListener("abort", () => runner.cancel());
    const adapter = make();
    const items = await adapter.discoverConversations();
    const result = await runner.run(
      { kind: "delete", conversations: items, delayMs: 0, stopOnError: false },
      (c, s) => adapter.deleteConversation(c, s),
      () => {},
    );
    expect(result).toMatchObject({
      state: "cancelled",
      completed: 1,
      skipped: 1,
    });
    expect(clicks).toEqual(["delete:/c/one"]);
  });
  it("reports a clicked-but-unverified action as failed even when cancelled", async () => {
    const runner = new BatchRunner();
    const controller = new AbortController();
    fixture({ abort: controller, noRemoval: true });
    controller.signal.addEventListener("abort", () => runner.cancel());
    const adapter = make();
    const items = await adapter.discoverConversations();
    const result = await runner.run(
      { kind: "archive", conversations: items, delayMs: 0, stopOnError: false },
      (c, s) => adapter.archiveConversation(c, s),
      () => {},
    );
    expect(result).toMatchObject({ state: "cancelled", failed: 1, skipped: 1 });
    expect(result.results[0]).toMatchObject({
      status: "failed",
      error: expect.stringContaining("outcome is unverified"),
    });
  });
  it("rejects foreign and duplicate identities", async () => {
    fixture();
    const adapter = make();
    await expect(
      adapter.deleteConversation({ ...id, platform: "gemini" }),
    ).rejects.toThrow(/identity/);
    document
      .querySelector("aside")!
      .append(document.querySelector("a")!.cloneNode(true));
    await expect(adapter.archiveConversation(id)).rejects.toThrow(
      /exactly one/,
    );
  });
  it("enables default Gemini delete only when native row controls are found", async () => {
    document.body.innerHTML =
      '<nav><div data-conversation-id="one"><a href="/app/one">Gemini chat</a><button aria-label="Open menu for conversation actions.">⋮</button></div></nav>';
    history.replaceState(null, "", "/app");
    const adapter = new GeminiAdapter();
    await adapter.discoverConversations();
    expect(adapter.capabilities).toMatchObject({
      delete: "supported",
      archive: "unsupported",
    });
  });
});
