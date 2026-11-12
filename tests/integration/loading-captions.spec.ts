import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
const bundle = resolve("dist/AI-Chat-Markdown-Manager.user.js");
async function open(page: Page, section: string) {
  await page
    .getByRole("button", { name: "Open Markdown Manager", exact: true })
    .click();
  await page.getByRole("button", { name: section, exact: false }).click();
}
async function chatFixture(
  page: Page,
  platform: string,
  slow = false,
  startAtHome = false,
) {
  const host =
    platform === "chatgpt"
      ? "chatgpt.com"
      : platform === "claude"
        ? "claude.ai"
        : "gemini.google.com";
  const prefix =
    platform === "chatgpt" ? "/c/" : platform === "claude" ? "/chat/" : "/app/";
  const home =
    platform === "gemini" ? "/app" : platform === "claude" ? "/new" : "/";
  await page.route(`https://${host}/**`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fixture</title></head><body>
    <aside><a href="${home}">New chat</a>${["one", "two", "three"].map((id) => `<a href="${prefix}${id}">Chat ${id}</a>`).join(" ")}</aside>
    <main></main><script>
    const platform=${JSON.stringify(platform)}, prefix=${JSON.stringify(prefix)}, home=${JSON.stringify(home)};
    function render(id) {
      if (id === 'home') { document.querySelector('main').innerHTML = '<h1>Where should we start?</h1>'; return; }
      document.querySelector('main').innerHTML = platform === 'gemini'
        ? '<user-query>Question '+id+'</user-query><model-response><p>Answer '+id+' UNIQUE-'+id+'</p></model-response>'
        : platform === 'claude' ? '<div data-testid="user-message">Question '+id+'</div><div class="font-claude-response"><p>Answer '+id+' UNIQUE-'+id+'</p></div>'
        : '<article data-message-author-role="user">Question '+id+'</article><article data-message-author-role="assistant"><p>Answer '+id+' UNIQUE-'+id+'</p></article>';
    }
    render(${JSON.stringify(startAtHome ? "home" : "one")});
    document.addEventListener('click', (e) => {
      const link = e.target.closest('aside a'); if (!link) return;
      e.preventDefault(); const id = link.pathname === home ? 'home' : link.pathname.split('/').pop();
      history.pushState(null, '', link.href);
      const main = document.querySelector('main'); main.setAttribute('aria-busy', 'true');
      setTimeout(() => { render(id); main.removeAttribute('aria-busy'); }, ${slow ? 2500 : 650});
    });</script></body></html>`,
    }),
  );
  await page.goto(`https://${host}${startAtHome ? home : `${prefix}one`}`);
  if (startAtHome)
    await page.evaluate(() =>
      localStorage.setItem(
        "__ai_chat_md_v2__:selection",
        JSON.stringify(["gemini:page:/app"]),
      ),
    );
  await page.addScriptTag({ path: bundle });
  return prefix;
}
test("Gemini start page is excluded from ZIP and stale selections; batch restores the empty home", async ({
  page,
}) => {
  await chatFixture(page, "gemini", false, true);
  await open(page, "Manage conversations");
  await expect(page.getByRole("checkbox")).toHaveCount(3);
  await expect(
    page.getByLabel("Select Where should we start?", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("0 selected · 3 matching", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Select all matching" }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export selected", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Export selected" })
    .getByRole("button", { name: "Download ZIP", exact: true })
    .click();
  const file = await downloaded;
  const archive = unzipSync(readFileSync((await file.path())!));
  const report = JSON.parse(strFromU8(archive["manifest.json"]));
  expect(report).toMatchObject({ total: 3, completed: 3, failed: 0 });
  expect(report.results.map((r: { key: string }) => r.key)).not.toContain(
    "gemini:page:/app",
  );
  await expect(page).toHaveURL("https://gemini.google.com/app");
  await expect(page.locator("main")).toHaveText("Where should we start?");
  await expect(
    page.getByRole("button", { name: "Export report", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText("returning to the starting chat failed", { exact: false }),
  ).toHaveCount(0);
  await page.locator(".backup-review summary").click();
  await expect(page.locator(".backup-review li a")).toHaveCount(3);
});
test("post-backup review includes only successful exports and clears before a failed retry", async ({
  page,
}) => {
  await chatFixture(page, "gemini");
  await open(page, "Manage conversations");
  await page.getByLabel("Select Chat one", { exact: true }).check();
  await page.getByLabel("Select Chat two", { exact: true }).check();
  await page
    .locator('aside a[href="/app/two"]')
    .evaluate((node) => node.remove());
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export selected", exact: true })
    .click();
  const options = page.getByRole("dialog", { name: "Export selected" });
  await options.getByRole("switch", {
    name: "Save ZIP with separate media and input files",
  }).check();
  await options.getByRole("switch", { name: "Include images" }).uncheck();
  await options
    .getByRole("button", { name: "Download ZIP", exact: true })
    .click();
  const file = await downloaded;
  const archive = unzipSync(readFileSync((await file.path())!));
  expect(JSON.parse(strFromU8(archive["manifest.json"]))).toMatchObject({
    completed: 1,
    failed: 1,
  });
  await page.locator(".backup-review summary").click();
  await expect(page.locator(".backup-review li a")).toHaveText(["Chat one"]);
  await expect(page.locator(".backup-review li a")).toHaveAttribute(
    "href",
    "https://gemini.google.com/app/one",
  );
  await expect(page.locator(".backup-review")).toContainText(
    "open its More menu and choose Delete",
  );
  await expect(page.locator(".backup-review")).toContainText(
    "check these exported files before deleting",
  );
  await page
    .getByRole("button", { name: "Retry failed exports", exact: true })
    .click();
  const retry = page.getByRole("dialog", { name: "Retry failed exports" });
  await expect(retry.getByRole("combobox", { name: "File format" })).toBeVisible();
  await expect(retry.getByRole("switch", {
    name: "Save ZIP with separate media and input files",
  })).toBeChecked();
  await expect(retry.getByRole("switch", { name: "Embed media and input files" })).not.toBeChecked();
  await expect(retry.getByRole("switch", { name: "Include images" })).not.toBeChecked();
  await expect(retry.getByRole("switch", { name: "Include links and input files" })).toBeChecked();
  await retry.getByRole("button", { name: "Download ZIP", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Export report", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".backup-review")).toHaveCount(0);
});
for (const platform of ["gemini", "chatgpt", "claude"]) {
  test(`${platform}: batch loads unopened chats without stale messages, then restores start`, async ({
    page,
  }) => {
    const prefix = await chatFixture(page, platform);
    await open(page, "Manage conversations");
    await page.getByRole("button", { name: "Select all matching" }).click();
    const downloaded = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export selected", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Export selected" })
      .getByRole("button", { name: "Download ZIP", exact: true })
      .click();
    const file = await downloaded;
    const archive = unzipSync(readFileSync((await file.path())!));
    const docs = Object.entries(archive)
      .filter(([name]) => name.endsWith(".md"))
      .map(([name, value]) => [name, strFromU8(value)]);
    expect(docs).toHaveLength(3);
    for (const id of ["one", "two", "three"]) {
      const body = docs.find(([, text]) => text.includes(`UNIQUE-${id}`))?.[1];
      expect(body).toBeTruthy();
      for (const other of ["one", "two", "three"].filter(
        (other) => other !== id,
      ))
        expect(body).not.toContain(`UNIQUE-${other}`);
      expect(body).toContain("## User");
      expect(body).toContain("## Assistant");
    }
    const report = JSON.parse(strFromU8(archive["manifest.json"]));
    expect(report.completed).toBe(3);
    expect(report.failed).toBe(0);
    await expect(page).toHaveURL(new RegExp(`${prefix}one$`));
    await expect(page.locator("main")).toContainText("UNIQUE-one");
    await expect(page.locator("main")).not.toHaveAttribute("aria-busy", "true");
  });
}
test("cancel during loading skips remaining chats and restores original without downloading stale content", async ({
  page,
}) => {
  await chatFixture(page, "chatgpt", true);
  await open(page, "Manage conversations");
  await page.getByLabel("Select Chat two", { exact: true }).check();
  await page.getByLabel("Select Chat three", { exact: true }).check();
  const downloads: string[] = [];
  page.on("download", (file) => downloads.push(file.suggestedFilename()));
  await page
    .getByRole("button", { name: "Export selected", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Export selected" })
    .getByRole("button", { name: "Download ZIP", exact: true })
    .click();
  await expect(page).toHaveURL(/\/c\/two$/);
  await page
    .getByRole("button", { name: "Cancel remaining work", exact: true })
    .click();
  await expect(page).toHaveURL(/\/c\/one$/);
  await expect(page.locator("main")).toContainText("UNIQUE-one");
  await expect(
    page.getByRole("button", { name: "Export report", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("main")).not.toHaveAttribute("aria-busy", "true");
  await expect(page.locator("main")).toContainText("UNIQUE-one");
  expect(downloads).toEqual([]);
});
const video = "video123";
const timedtext = (language: string) =>
  JSON.stringify({
    events: [
      {
        tStartMs: 1500,
        dDurationMs: 2300,
        segs: [{ utf8: language === "ru" ? "Привет мир" : "Hello world" }],
      },
      { tStartMs: 6000, dDurationMs: 1000, segs: [{ utf8: "Second line" }] },
    ],
  });
async function youtubeFixture(page: Page, empty = false, xml = false) {
  const requests: string[] = [];
  await page.route("https://www.youtube.com/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/timedtext") {
      requests.push(url.href);
      await route.fulfill({
        contentType: "application/json",
        body:
          empty || (xml && url.searchParams.get("fmt") === "json3")
            ? ""
            : xml
              ? '<transcript><text start="1.5" dur="2.3">Привет &amp; мир</text></transcript>'
              : timedtext(
                  url.searchParams.get("tlang") ||
                    url.searchParams.get("lang") ||
                    "en",
                ),
      });
      return;
    }
    const id = url.searchParams.get("v") || video;
    const player = {
      videoDetails: { videoId: id, title: "Test video" },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: ["en", "ru"].map((lang) => ({
            baseUrl: `https://www.youtube.com/api/timedtext?v=${id}&lang=${lang}&signature=preserved&pot=preserved-token`,
            languageCode: lang,
            name: { simpleText: lang === "en" ? "English" : "Russian" },
            isTranslatable: true,
          })),
          translationLanguages: [
            { languageCode: "ru", languageName: { simpleText: "Russian" } },
            { languageCode: "es", languageName: { simpleText: "Spanish" } },
          ],
        },
      },
    };
    await route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main><h1>Test video</h1></main><script>var ytInitialPlayerResponse=${JSON.stringify(player)};</script></body></html>`,
    });
  });
  await page.goto(`https://www.youtube.com/watch?v=${video}`);
  await page.addScriptTag({ path: bundle });
  await open(page, "YouTube timedtext");
  return requests;
}
test("YouTube loads languages and downloads real TXT and translated VTT automatically, preserving signed parameters", async ({
  page,
}, testInfo) => {
  const requests = await youtubeFixture(page);
  await expect(page.getByLabel("Caption track", { exact: true })).toBeVisible();
  // Simulate the video player's own caption request with a newer signed token.
  await page.evaluate(async () => {
    await fetch(
      "/api/timedtext?v=video123&lang=en&signature=preserved&pot=live-page-token",
    ).then((response) => response.text());
  });
  if (testInfo.project.name === "chromium")
    await page.screenshot({ path: "docs/screenshots/youtube-captions.png" });
  await page.getByLabel("Caption track", { exact: true }).selectOption("1");
  let event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download TXT", exact: true }).click();
  let file = await event;
  expect(file.suggestedFilename()).toContain("-ru.txt");
  expect(readFileSync((await file.path())!, "utf8")).toBe(
    "Привет мир Second line\n",
  );
  await page.getByLabel("Caption track", { exact: true }).selectOption("0");
  await page.getByLabel("Translate captions to").selectOption("ru");
  event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download VTT", exact: true }).click();
  file = await event;
  const vtt = readFileSync((await file.path())!, "utf8");
  expect(vtt).toContain(
    "WEBVTT\n\n1\n00:00:01.500 --> 00:00:03.800\nПривет мир",
  );
  expect(new URL(requests.at(-1)!).searchParams.get("tlang")).toBe("ru");
  expect(new URL(requests.at(-1)!).searchParams.get("pot")).toBe(
    "live-page-token",
  );
  for (const request of requests) {
    const params = new URL(request).searchParams;
    expect(params.get("signature")).toBe("preserved");
    expect(params.get("pot")).toBe(
      params.get("lang") === "en" ? "live-page-token" : "preserved-token",
    );
  }
});
test("YouTube refuses empty responses and stale video tracks; offline import still converts and downloads", async ({
  page,
}) => {
  await youtubeFixture(page, true);
  const downloads: string[] = [];
  page.on("download", (file) => downloads.push(file.suggestedFilename()));
  await page.getByRole("button", { name: "Download TXT", exact: true }).click();
  await expect(page.getByRole("status").last()).toContainText("empty");
  expect(downloads).toEqual([]);
  await page.evaluate(() => history.pushState(null, "", "/watch?v=otherVideo"));
  await page.getByRole("button", { name: "Download VTT", exact: true }).click();
  await expect(page.getByRole("status").last()).toContainText("Video changed");
  expect(downloads).toEqual([]);
  await page.route("**/*", (route) => route.abort());
  await page
    .getByText("Import saved timedtext (optional)", { exact: true })
    .click();
  await page
    .getByLabel("Timedtext response", { exact: true })
    .fill(timedtext("ru"));
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Convert to VTT", exact: true })
    .click();
  const file = await event;
  expect(readFileSync((await file.path())!, "utf8")).toContain("Привет мир");
});
test("saved JSON3 file imports and converts to plain text without a video account", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/host.html");
  await page.addScriptTag({ path: bundle });
  await open(page, "YouTube timedtext");
  await page
    .getByText("Import saved timedtext (optional)", { exact: true })
    .click();
  await page.getByLabel("Import timedtext file").setInputFiles({
    name: "example-ru.json",
    mimeType: "application/json",
    buffer: Buffer.from(timedtext("ru")),
  });
  await expect(
    page.getByRole("button", { name: "Convert to TXT", exact: true }),
  ).toBeEnabled();
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Convert to TXT", exact: true })
    .click();
  const file = await event;
  expect(file.suggestedFilename()).toBe("example-ru.txt");
  expect(readFileSync((await file.path())!, "utf8")).toBe(
    "Привет мир Second line\n",
  );
});

test("YouTube refreshes tracks after video navigation and falls back from JSON3 to native XML", async ({
  page,
}) => {
  const requests = await youtubeFixture(page, false, true);
  await expect(page.getByLabel("Caption track", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    history.pushState(null, "", "/watch?v=nextVideo");
    document.dispatchEvent(new Event("yt-navigate-finish"));
  });
  await expect(
    page.getByRole("button", { name: "Download TXT", exact: true }),
  ).toBeEnabled();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download TXT", exact: true }).click();
  const file = await event;
  expect(file.suggestedFilename()).toContain("nextVideo");
  expect(readFileSync((await file.path())!, "utf8")).toBe("Привет & мир\n");
  expect(requests).toHaveLength(2);
  expect(
    requests.every(
      (request) => new URL(request).searchParams.get("v") === "nextVideo",
    ),
  ).toBe(true);
  expect(new URL(requests[0]).searchParams.get("fmt")).toBe("json3");
  expect(new URL(requests[1]).searchParams.has("fmt")).toBe(false);
});
