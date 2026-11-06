import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { GeminiAdapter } from "../../src/adapters/gemini";
import { BatchRunner } from "../../src/operations/batch";
import type { Conversation } from "../../src/types";
const fixture = readFileSync("tests/fixtures/gemini-sidebar.html", "utf8");
const id = { platform: "gemini", id: "alpha" };
interface FixtureOptions {
  locale?: string;
  wrongTitle?: boolean;
  remove?: boolean;
  mutate?: boolean;
  missingDelete?: boolean;
  onDialog?: () => void;
}
function nativeUI(options: FixtureOptions = {}) {
  const deletes: string[] = [];
  for (const row of document.querySelectorAll<HTMLElement>(
    "[data-conversation-id]",
  ))
    row.querySelector("button")!.addEventListener("click", () => {
      const menu = document.createElement("div");
      menu.role = "menu";
      const action = document.createElement("button");
      action.role = "menuitem";
      action.textContent = options.missingDelete
        ? "Unknown"
        : options.locale || "Delete";
      menu.append(action);
      document.body.append(menu);
      action.addEventListener("click", () => {
        menu.remove();
        const dialog = document.createElement("div");
        dialog.role = "dialog";
        const p = document.createElement("p");
        p.textContent = `Delete "${options.wrongTitle ? "Some other chat" : row.querySelector("a")!.textContent}"?`;
        const confirm = document.createElement("button");
        confirm.textContent = options.locale || "Delete";
        dialog.append(p, confirm);
        document.body.append(dialog);
        if (options.mutate) row.dataset.conversationId = "changed";
        options.onDialog?.();
        confirm.addEventListener("click", () => {
          deletes.push(row.dataset.conversationId!);
          if (options.remove !== false) {
            row.remove();
            dialog.remove();
          }
        });
      });
    });
  return deletes;
}
beforeEach(() => {
  history.replaceState(null, "", "/app/alpha");
  document.body.innerHTML = fixture;
});
const verified = () =>
  new GeminiAdapter({ nativeDelete: true, timeoutMs: 650 });
describe("Gemini native deletion", () => {
  it("explicitly disabled adapter makes no native clicks", async () => {
    const adapter = new GeminiAdapter({ nativeDelete: false });
    const click = vi.spyOn(HTMLElement.prototype, "click");
    expect(adapter.capabilities.delete).toBe("unknown");
    await expect(adapter.deleteConversation(id)).rejects.toThrow(/disabled/);
    expect(click).not.toHaveBeenCalled();
  });
  it("deletes multiple selected identities sequentially and verifies removal", async () => {
    const deletes = nativeUI();
    const adapter = verified();
    const items = (await adapter.discoverConversations()).filter((c) =>
      ["alpha", "beta"].includes(c.id),
    );
    const result = await new BatchRunner().run(
      { kind: "delete", conversations: items, stopOnError: true, delayMs: 0 },
      (c, s) => adapter.deleteConversation(c, s),
      () => {},
    );
    expect(result.completed).toBe(2);
    expect(deletes).toEqual(["alpha", "beta"]);
  });
  it.each(["Удалить", "Löschen", "Supprimer", "Eliminar"])(
    "uses explicit localized native controls: %s",
    async (locale) => {
      const deletes = nativeUI({ locale });
      await verified().deleteConversation(id);
      expect(deletes).toEqual(["alpha"]);
    },
  );
  it("refuses absent row and foreign identities", async () => {
    nativeUI();
    await expect(
      verified().deleteConversation({ ...id, id: "missing" }),
    ).rejects.toThrow(/exactly one/);
    await expect(
      verified().deleteConversation({ ...id, platform: "other" }),
    ).rejects.toThrow(/identity/);
  });
  it("refuses duplicate IDs before opening controls", async () => {
    document
      .querySelector("nav")!
      .append(
        document.querySelector("[data-conversation-id]")!.cloneNode(true),
      );
    const click = vi.spyOn(HTMLElement.prototype, "click");
    await expect(verified().deleteConversation(id)).rejects.toThrow(
      /exactly one/,
    );
    expect(click).not.toHaveBeenCalled();
  });
  it("refuses ambiguous titles", async () => {
    document.querySelector('a[href="/app/beta"]')!.textContent =
      "Planning project";
    await expect(verified().deleteConversation(id)).rejects.toThrow(
      /Duplicate/,
    );
  });
  it("never confirms a different conversation", async () => {
    const deletes = nativeUI({ wrongTitle: true });
    await expect(verified().deleteConversation(id)).rejects.toThrow(
      /does not identify/,
    );
    expect(deletes).toEqual([]);
    expect(document.querySelector('a[href="/app/alpha"]')).not.toBeNull();
  });
  it("refuses missing native controls", async () => {
    document.querySelector("button")!.remove();
    await expect(verified().deleteConversation(id)).rejects.toThrow(/unique/);
  });
  it("refuses unknown localization instead of guessing", async () => {
    const deletes = nativeUI({ missingDelete: true });
    await expect(verified().deleteConversation(id)).rejects.toThrow(
      /missing or ambiguous/,
    );
    expect(deletes).toEqual([]);
  });
  it("revalidates identity after UI mutations", async () => {
    const deletes = nativeUI({ mutate: true });
    await expect(verified().deleteConversation(id)).rejects.toThrow(/identity/);
    expect(deletes).toEqual([]);
  });
  it("times out rather than reporting an unremoved row as deleted", async () => {
    nativeUI({ remove: false });
    await expect(verified().deleteConversation(id)).rejects.toThrow(
      /timed out/,
    );
  });
  it("cancels before native confirmation", async () => {
    const controller = new AbortController();
    const deletes = nativeUI({ onDialog: () => controller.abort() });
    await expect(
      verified().deleteConversation(id, controller.signal),
    ).rejects.toThrow();
    expect(deletes).toEqual([]);
  });
  it("reports a partial failure without deleting another row", async () => {
    const deletes = nativeUI();
    document.querySelector('[data-conversation-id="beta"] button')!.remove();
    const adapter = verified();
    const items = (await adapter.discoverConversations()).filter((c) =>
      ["alpha", "beta"].includes(c.id),
    ) as Conversation[];
    const result = await new BatchRunner().run(
      { kind: "delete", conversations: items, stopOnError: false, delayMs: 0 },
      (c, s) => adapter.deleteConversation(c, s),
      () => {},
    );
    expect(result).toMatchObject({
      completed: 1,
      failed: 1,
      state: "partially_completed",
    });
    expect(deletes).toEqual(["alpha"]);
  });
  it("cancellation before starting does not click a control", async () => {
    const controller = new AbortController();
    controller.abort();
    const click = vi.spyOn(HTMLElement.prototype, "click");
    await expect(
      verified().deleteConversation(id, controller.signal),
    ).rejects.toThrow();
    expect(click).not.toHaveBeenCalled();
  });
});
