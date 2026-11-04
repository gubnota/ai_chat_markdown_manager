import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
const bundle = resolve("dist/AI-Chat-Markdown-Manager.user.js");
const host = "/tests/fixtures/host.html";
const root = (p: Page) => p.locator("#__safari_md_export_root__");
async function install(page: Page) {
  await page.goto(host);
  await page.addScriptTag({ path: bundle });
  await expect(
    page.getByRole("button", { name: "Open Markdown Manager", exact: true }),
  ).toBeVisible();
}
async function open(page: Page) {
  await page
    .getByRole("button", { name: "Open Markdown Manager", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Markdown Manager panel" }),
  ).toBeVisible();
}
async function manager(page: Page) {
  await open(page);
  await page.getByRole("button", { name: "Manage conversations" }).click();
  await expect(root(page).locator(".conversation")).toHaveCount(4);
}
async function anchor(page: Page) {
  return root(page).locator(".fab").boundingBox();
}
test("FAB drag, expand, collapse, dismiss, restore and persisted anchor", async ({
  page,
}) => {
  await install(page);
  const start = (await anchor(page))!;
  await page.mouse.move(start.x + 22, start.y + 22);
  await page.mouse.down();
  await page.mouse.move(280, 210, { steps: 10 });
  await page.mouse.up();
  const moved = (await anchor(page))!;
  expect(moved.x).toBeGreaterThan(start.x + 20);
  await open(page);
  await page.getByRole("button", { name: "Settings", exact: false }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Minimize", exact: true }).click();
  expect(await anchor(page)).toEqual(moved);
  await open(page);
  await page.getByRole("button", { name: "Hide overlay" }).click();
  await expect(root(page).locator(".fab")).toHaveCount(0);
  await page.keyboard.press("Alt+Shift+E");
  await expect(root(page).locator(".fab")).toBeVisible();
  expect(await anchor(page)).toEqual(moved);
  await page.reload();
  await page.addScriptTag({ path: bundle });
  expect(await anchor(page)).toEqual(moved);
});
test("right edge, resize and Send collision protection", async ({ page }) => {
  await install(page);
  const viewport = page.viewportSize()!;
  const send = (await page
    .getByRole("button", { name: "Send", exact: true })
    .boundingBox())!;
  const start = (await anchor(page))!;
  await page.mouse.move(start.x + 22, start.y + 22);
  await page.mouse.down();
  await page.mouse.move(send.x + 22, send.y + 22, { steps: 10 });
  await page.mouse.up();
  const fab = (await anchor(page))!;
  expect(
    fab.x + fab.width <= send.x - 10 ||
      fab.y + fab.height <= send.y - 10 ||
      fab.x >= send.x + send.width + 10 ||
      fab.y >= send.y + send.height + 10,
  ).toBe(true);
  await open(page);
  const panel = (await root(page).locator(".panel").boundingBox())!;
  expect(panel.x).toBeGreaterThanOrEqual(10);
  expect(panel.x + panel.width).toBeLessThanOrEqual(viewport.width - 10);
  await page.getByRole("button", { name: "Minimize", exact: true }).click();
  const stable = await anchor(page);
  await open(page);
  await page.keyboard.press("Escape");
  expect(await anchor(page)).toEqual(stable);
  await page.setViewportSize({ width: 360, height: 640 });
  await expect
    .poll(async () => {
      const b = (await anchor(page))!;
      return b.x + b.width;
    })
    .toBeLessThanOrEqual(352);
  const resized = (await anchor(page))!;
  expect(resized.x + resized.width).toBeLessThanOrEqual(352);
  expect(resized.y + resized.height).toBeLessThanOrEqual(632);
});
test("real discovery, persistent multi-selection, search, filters and sort", async ({
  page,
}) => {
  await install(page);
  await manager(page);
  await page
    .getByRole("checkbox", { name: "Select Research notes", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Select Weekly planning", exact: true })
    .check();
  await page
    .getByRole("textbox", { name: "Search conversations" })
    .fill("Research");
  await expect(root(page).locator(".conversation")).toHaveCount(1);
  await expect(root(page).locator(".counts")).toContainText("2 selected");
  await page.getByRole("textbox", { name: "Search conversations" }).fill("");
  await page.getByLabel("Sort conversations").selectOption("title");
  const titles = await root(page)
    .locator(".conversation-copy strong")
    .allTextContents();
  expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  await page.getByLabel("Status filter").selectOption("archived");
  await expect(root(page).locator(".empty")).toBeVisible();
  await page.getByLabel("Status filter").selectOption("all");
  await page.reload();
  await page.addScriptTag({ path: bundle });
  await manager(page);
  await expect(
    page.getByRole("checkbox", { name: "Select Research notes", exact: true }),
  ).toBeChecked();
  await expect(root(page).locator(".counts")).toContainText("2 selected");
  await expect(
    page.getByRole("button", { name: "Delete", exact: true }).last(),
  ).toBeDisabled();
});
test("virtualized host discovery accumulates IDs and paginates manager", async ({
  page,
}) => {
  await install(page);
  await manager(page);
  await page.evaluate(() => {
    const nav = document.querySelector("aside")!;
    nav.innerHTML = "";
    for (let i = 0; i < 80; i++) {
      const a = document.createElement("a");
      a.href = `/c/virtual-${i}`;
      a.textContent = `Virtual ${i}`;
      nav.append(a);
    }
  });
  await expect(root(page).locator(".counts")).toContainText("84 discovered");
  await expect(root(page).locator(".conversation")).toHaveCount(24);
  await page.getByRole("button", { name: "Load more" }).click();
  await expect(root(page).locator(".conversation")).toHaveCount(48);
  await page.getByRole("button", { name: "Select all matching" }).click();
  await expect(root(page).locator(".counts")).toContainText("84 selected");
  await page
    .getByRole("textbox", { name: "Search conversations" })
    .fill("Virtual 79");
  await expect(root(page).locator(".conversation")).toHaveCount(1);
  await expect(root(page).locator(".counts")).toContainText("84 selected");
});
test("downloaded Markdown and bulk ZIP contain genuine loaded content and failure report", async ({
  page,
}) => {
  await install(page);
  await open(page);
  const singleEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save current chat as Markdown" })
    .click();
  const single = await singleEvent;
  const text = readFileSync((await single.path())!, "utf8");
  expect(text).toContain("const privacy");
  expect(text).toContain("Partial export:");
  expect(text).not.toContain("Manage conversations");
  await page.getByRole("button", { name: "Manage conversations" }).click();
  const zipEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "ZIP all discovered" }).click();
  const archive = await zipEvent;
  const entries = unzipSync(readFileSync((await archive.path())!));
  const names = Object.keys(entries).filter((n) => n.endsWith(".md"));
  expect(names).toHaveLength(1);
  expect(strFromU8(entries[names[0]])).toContain("const anchor");
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
  expect(manifest).toMatchObject({
    state: "partially_completed",
    total: 4,
    completed: 1,
    failed: 3,
    skipped: 0,
  });
  expect(
    manifest.results.filter((r: { status: string }) => r.status === "failed"),
  ).toHaveLength(3);
  await expect(
    root(page).getByRole("heading", { name: "partially completed" }),
  ).toBeVisible();
});
test("theme persistence, keyboard focus, no duplicate mount and host controls remain usable", async ({
  page,
}) => {
  await install(page);
  await open(page);
  await page.getByRole("button", { name: "Settings", exact: false }).click();
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await expect(root(page).locator(".manager-root")).toHaveClass(/dark/);
  await page.addScriptTag({ path: bundle });
  await expect(page.locator("#__safari_md_export_root__")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(root(page).locator(".fab")).toBeFocused();
  await open(page);
  await page.getByRole("button", { name: "Minimize", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Host composer is usable");
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toHaveValue("Host composer is usable");
  await page.reload();
  await page.addScriptTag({ path: bundle });
  await expect(root(page).locator(".manager-root")).toHaveClass(/dark/);
});
test("ZIP retains genuine exported conversations across SPA navigation", async ({
  page,
}) => {
  await install(page);
  await open(page);
  const first = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save current chat as Markdown" })
    .click();
  await first;
  await page.evaluate(() => {
    history.pushState({}, "", "/c/research");
    document.querySelector("main h1")!.textContent = "Research notes";
    document.querySelector("main article")!.innerHTML =
      "<p>Genuine second conversation snapshot.</p>";
  });
  const second = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save current chat as Markdown" })
    .click();
  await second;
  await page.getByRole("button", { name: "Manage conversations" }).click();
  const zipEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "ZIP all discovered" }).click();
  const archive = await zipEvent;
  const entries = unzipSync(readFileSync((await archive.path())!));
  const markdown = Object.keys(entries)
    .filter((n) => n.endsWith(".md"))
    .map((n) => strFromU8(entries[n]));
  expect(markdown).toHaveLength(2);
  expect(
    markdown.some((body) =>
      body.includes("Genuine second conversation snapshot."),
    ),
  ).toBe(true);
  expect(markdown.some((body) => body.includes("const privacy"))).toBe(true);
});
test("standalone bundle needs no outgoing requests after injection", async ({
  page,
}) => {
  await page.goto(host);
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.route("**/*", (r) => r.abort());
  await page.addScriptTag({ path: bundle });
  await open(page);
  await page.getByRole("button", { name: "Manage conversations" }).click();
  await expect(root(page).locator(".conversation")).toHaveCount(4);
  expect(requests).toEqual([]);
});
test("visual release screenshots", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await install(page);
  await open(page);
  await page.screenshot({ path: info.outputPath("menu.png") });
  if (info.project.name === "chromium")
    await page.screenshot({ path: "docs/screenshots/manager.png" });
  await page.getByRole("button", { name: "Manage conversations" }).click();
  await page
    .getByRole("checkbox", { name: "Select Research notes", exact: true })
    .check();
  await page.screenshot({ path: info.outputPath("conversations.png") });
  if (info.project.name === "chromium")
    await page.screenshot({ path: "docs/screenshots/conversations.png" });
  if (info.project.name === "mobile-webkit")
    await page.screenshot({ path: "docs/screenshots/mobile.png" });
});
