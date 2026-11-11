import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";

async function fixture(
  page: Page,
  options: {
    platform?: string;
    backup?: boolean;
    wrongTitle?: boolean;
    failRemoval?: boolean;
    slow?: boolean;
    format?: "html" | "markdown";
    embedMedia?: boolean;
    failedMedia?: boolean;
  } = {},
) {
  const platform = options.platform || "chatgpt";
  const host = platform === "gemini" ? "gemini.google.com" : "chatgpt.com";
  const prefix = platform === "gemini" ? "/app/" : "/c/";
  await page.route(`https://${host}/**`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Native fixture</title>
  <aside>${["one", "two", "three"].map((id) => `<div data-conversation-id="${id}"><a href="${prefix}${id}">Chat ${id}</a><button aria-label="More options">⋮</button></div>`).join("")}</aside><main></main><script>
  const opts=${JSON.stringify(options)}, prefix=${JSON.stringify(prefix)}, platform=${JSON.stringify(platform)};
  window.nativeActions=[]; window.visits=[];
  localStorage.setItem('__ai_chat_md_v2__:settings',JSON.stringify({backupArchive:!!opts.backup,backupDelete:!!opts.backup,delayMs:0,autoMinimize:false,export:{format:opts.format||"markdown",embedMedia:opts.embedMedia ?? opts.format === "html"}}));
  function render(id) { document.querySelector('main').innerHTML=platform==='gemini'
    ? '<user-query>Question '+id+'</user-query><model-response>Answer UNIQUE-'+id+(opts.failedMedia&&id==='two'?'<div class="attachment-card" data-file-name="private.csv"><a href="/unavailable.csv">private.csv</a></div>':'')+'</model-response>'
    : '<article data-message-author-role="user">Question '+id+'</article><article data-message-author-role="assistant">Answer UNIQUE-'+id+(opts.failedMedia&&id==='two'?'<div class="attachment-card" data-file-name="private.csv"><a href="/unavailable.csv">private.csv</a></div>':'')+'</article>';  }
  render('one');
  document.querySelectorAll('aside a').forEach(link=>link.onclick=e=>{e.preventDefault();const id=link.pathname.split('/').pop();window.visits.push(id);history.pushState(null,'',link.href);const main=document.querySelector('main');main.setAttribute('aria-busy','true');setTimeout(()=>{render(id);main.removeAttribute('aria-busy');},opts.slow?2500:350);});
  document.querySelectorAll('aside button').forEach(button=>button.onclick=()=>{
    const row=button.parentElement, id=row.dataset.conversationId;
    const menu=document.createElement('div');menu.role='menu';menu.innerHTML='<button role="menuitem">Archive</button><button role="menuitem">Delete</button><button role="menuitem">Delete all chats</button>';document.body.append(menu);
    menu.addEventListener('keydown',()=>menu.remove());
    const finish=kind=>{window.nativeActions.push({kind,id,at:location.pathname});if(!opts.failRemoval){row.remove();document.querySelector('[role="alertdialog"]')?.remove();}menu.remove();};
    menu.children[0].onclick=()=>finish('archive');
    menu.children[2].onclick=()=>window.nativeActions.push({kind:'WRONG-all'});
    menu.children[1].onclick=()=>{menu.remove();const dialog=document.createElement('div');dialog.role='alertdialog';dialog.innerHTML='<p>Delete <strong>'+ (opts.wrongTitle?'Other chat':'Chat '+id) +'</strong>?</p><button>Cancel</button><button>Delete</button>';document.body.append(dialog);dialog.children[1].onclick=()=>dialog.remove();dialog.children[2].onclick=()=>finish('delete');};
  });</script>`,
    }),
  );
  await page.goto(`https://${host}${prefix}one`);
  await page.addScriptTag({
    path: resolve("dist/AI-Chat-Markdown-Manager.user.js"),
  });
  await page
    .getByRole("button", { name: "Open Markdown Manager", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Manage conversations", exact: false })
    .click();
}
async function select(page: Page, ...ids: string[]) {
  for (const id of ids)
    await page.getByLabel(`Select Chat ${id}`, { exact: true }).check();
}
async function confirm(page: Page, count: number, phrase?: string) {
  if (phrase) await page.getByLabel("Deletion confirmation").fill(phrase);
  await page
    .getByRole("button", { name: `Confirm (${count})`, exact: true })
    .click();
}
const actions = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          nativeActions: { kind: string; id: string; at: string }[];
        }
      ).nativeActions,
  );
test("ChatGPT selected archive requires confirmation and preserves unselected chats", async ({
  page,
}) => {
  await fixture(page);
  await select(page, "one", "two");
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  expect(await actions(page)).toEqual([]);
  await confirm(page, 2);
  await expect(
    page.getByRole("button", { name: "Export report", exact: true }),
  ).toBeEnabled();
  expect((await actions(page)).map((a) => [a.kind, a.id])).toEqual([
    ["archive", "one"],
    ["archive", "two"],
  ]);
  await expect(page.locator("aside a")).toHaveText(["Chat three"]);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page
    .getByRole("button", { name: "Manage conversations", exact: false })
    .click();
  await expect(page.getByLabel("Select Chat one", { exact: true })).toHaveCount(
    0,
  );
});
test("delete all freezes discovered targets and requires DELETE ALL", async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole("button", { name: "Delete all", exact: true }).click();
  await expect(
    page.getByText("ALL means all discovered entries", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Deletion confirmation").fill("DELETE");
  await expect(
    page.getByRole("button", { name: "Confirm (3)", exact: true }),
  ).toBeDisabled();
  await page
    .locator("aside")
    .evaluate((node) =>
      node.insertAdjacentHTML("beforeend", '<a href="/c/four">Chat four</a>'),
    );
  await confirm(page, 3, "DELETE ALL");
  await expect(
    page.getByRole("button", { name: "Export report", exact: true }),
  ).toBeEnabled();
  expect((await actions(page)).map((a) => a.id)).toEqual([
    "one",
    "two",
    "three",
  ]);
  await expect(page.locator("aside a")).toHaveText(["Chat four"]);
});
test("Gemini selected batch delete is enabled and confirms each native title", async ({
  page,
}) => {
  await fixture(page, { platform: "gemini" });
  await select(page, "one", "two");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await confirm(page, 2, "DELETE");
  await expect(
    page.getByRole("button", { name: "Export report", exact: true }),
  ).toBeEnabled();
  expect((await actions(page)).map((a) => [a.kind, a.id])).toEqual([
    ["delete", "one"],
    ["delete", "two"],
  ]);
});
test("backup finishes and restores before native archive, without reopening archived chat", async ({
  page,
}) => {
  await fixture(page, { backup: true });
  await select(page, "one", "two");
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await confirm(page, 2);
  await downloaded;
  await expect(
    page.getByRole("button", { name: "Export report", exact: true }),
  ).toBeEnabled();
  expect((await actions(page)).map((a) => a.at)).toEqual(["/c/one", "/c/one"]);
  expect(
    await page.evaluate(
      () => (window as unknown as { visits: string[] }).visits,
    ),
  ).toEqual(["two", "one"]);
});
test("failed backup prevents every native action", async ({ page }) => {
  await fixture(page, { backup: true });
  await select(page, "one", "two");
  await page
    .locator('aside [data-conversation-id="two"]')
    .evaluate((el) => el.remove());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await confirm(page, 2, "DELETE");
  await expect(
    page.getByText("Backup did not finish. No native action was started.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(await actions(page)).toEqual([]);
});
test("successful-backup shortcuts exclude failed exports and require ZIP acknowledgement and typed confirmation", async ({
  page,
}) => {
  await fixture(page);
  await select(page, "one", "two");
  await page
    .locator('aside [data-conversation-id="two"]')
    .evaluate((el) => el.remove());
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export selected", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Export selected" })
    .getByRole("button", { name: "Download ZIP", exact: true })
    .click();
  await downloaded;
  await expect(
    page.getByRole("button", { name: "Export report", exact: true }),
  ).toBeEnabled();
  await page.locator(".backup-review summary").click();
  await expect(page.locator(".backup-review li a")).toHaveText(["Chat one"]);
  const remove = page.getByRole("button", {
    name: "Delete backed-up chats",
    exact: true,
  });
  await expect(remove).toBeDisabled();
  await page
    .getByLabel("I opened the ZIP and checked these files", { exact: true })
    .check();
  await remove.click();
  await expect(
    page.getByRole("button", { name: "Confirm (1)", exact: true }),
  ).toBeDisabled();
  await confirm(page, 1, "DELETE");
  await expect(
    page.getByRole("button", { name: "Export report", exact: true }),
  ).toBeEnabled();
  expect((await actions(page)).map((a) => a.id)).toEqual(["one"]);
});
test("wrong native confirmation fails without deleting any chat", async ({
  page,
}) => {
  await fixture(page, { wrongTitle: true });
  await select(page, "one");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await confirm(page, 1, "DELETE");
  await expect(
    page.getByRole("button", { name: "Export report", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText("Native confirmation does not identify", { exact: false }),
  ).toBeVisible();
  expect(await actions(page)).toEqual([]);
});
test("cancel during required backup never starts native deletion", async ({
  page,
}) => {
  await fixture(page, { backup: true, slow: true });
  await select(page, "two", "three");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await confirm(page, 2, "DELETE");
  await expect(page).toHaveURL(/\/c\/two$/);
  await page
    .getByRole("button", { name: "Cancel remaining work", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Export report", exact: true }),
  ).toBeEnabled();
  await expect(page).toHaveURL(/\/c\/one$/);
  expect(await actions(page)).toEqual([]);
});

for (const platform of ["chatgpt", "gemini"]) {
  test(`${platform} offline backup completes before native cleanup and restores the starting route`, async ({
    page,
  }) => {
    await fixture(page, { platform, backup: true, format: "html" });
    await select(page, "one", "two");
    const archive = platform === "chatgpt";
    await page
      .getByRole("button", {
        name: archive ? "Archive" : "Delete",
        exact: true,
      })
      .click();
    const downloaded = page.waitForEvent("download");
    await confirm(page, 2, archive ? undefined : "DELETE");
    const entries = unzipSync(readFileSync((await (await downloaded).path())!));
    const docs = Object.entries(entries)
      .filter(([name]) => name.endsWith(".html"))
      .map(([, bytes]) => strFromU8(bytes));
    expect(docs).toHaveLength(2);
    expect(docs.some((text) => text.includes("UNIQUE-one"))).toBe(true);
    expect(docs.some((text) => text.includes("UNIQUE-two"))).toBe(true);
    await expect(
      page.getByRole("button", { name: "Export report", exact: true }),
    ).toBeEnabled();
    const prefix = platform === "gemini" ? "/app/" : "/c/";
    expect((await actions(page)).map((a) => [a.kind, a.id, a.at])).toEqual([
      [archive ? "archive" : "delete", "one", prefix + "one"],
      [archive ? "archive" : "delete", "two", prefix + "one"],
    ]);
    await expect(page.locator("aside a")).toHaveText(["Chat three"]);
  });
  test(`${platform} inaccessible offline file blocks required backup and every native action`, async ({
    page,
  }) => {
    await fixture(page, {
      platform,
      backup: true,
      format: "html",
      failedMedia: true,
    });
    await select(page, "one", "two");
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await confirm(page, 2, "DELETE");
    await expect(
      page.getByText("Backup did not finish. No native action was started.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(await actions(page)).toEqual([]);
    await expect(page.locator("aside a")).toHaveCount(3);
  });
  test(`${platform} offline ZIP review excludes inaccessible files before deleting successful backups`, async ({
    page,
  }) => {
    await fixture(page, {
      platform,
      format: "markdown",
      embedMedia: true,
      failedMedia: true,
    });
    await select(page, "one", "two");
    const downloaded = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export selected", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Export selected" })
      .getByRole("button", { name: "Download ZIP", exact: true })
      .click();
    const entries = unzipSync(readFileSync((await (await downloaded).path())!));
    expect(JSON.parse(strFromU8(entries["manifest.json"]))).toMatchObject({
      completed: 1,
      failed: 1,
      embeddedMedia: true,
    });
    expect(
      Object.keys(entries).filter((name) => name.endsWith(".md")),
    ).toHaveLength(1);
    await page.locator(".backup-review summary").click();
    await expect(page.locator(".backup-review li a")).toHaveText(["Chat one"]);
    const remove = page.getByRole("button", {
      name: "Delete backed-up chats",
      exact: true,
    });
    await expect(remove).toBeDisabled();
    await page
      .getByLabel("I opened the ZIP and checked these files", { exact: true })
      .check();
    await remove.click();
    await confirm(page, 1, "DELETE");
    await expect(
      page.getByRole("button", { name: "Export report", exact: true }),
    ).toBeEnabled();
    expect((await actions(page)).map((a) => a.id)).toEqual(["one"]);
    await expect(page.locator("aside a")).toHaveText([
      "Chat two",
      "Chat three",
    ]);
  });
}
