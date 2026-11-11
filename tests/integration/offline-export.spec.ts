import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { unzipSync, strFromU8 } from "fflate";

const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=";
// Real 100 ms PCM WAV: verify the exported player can decode its offline bytes.
const wav = Buffer.alloc(1644);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24);
wav.writeUInt32LE(16000, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(wav.length - 44, 40);
for (const platform of ["chatgpt", "gemini"] as const) {
  for (const format of ["html", "markdown"] as const) {
    test(`${platform} ${format} current and batch exports embed media and input bytes for offline use`, async ({
      page,
      context,
    }, testInfo) => {
      const host = platform === "gemini" ? "gemini.google.com" : "chatgpt.com";
      const prefix = platform === "gemini" ? "/app/" : "/c/";
      await page.route(`https://${host}/assets/**`, (route) => {
        const path = new URL(route.request().url()).pathname;
        return path.endsWith(".png")
          ? route.fulfill({
              contentType: "image/png",
              body: Buffer.from(png, "base64"),
            })
          : route.fulfill({
              contentType: path.endsWith(".wav") ? "audio/wav" : "text/csv",
              body: path.endsWith(".wav") ? wav : `exact input bytes ${path}`,
            });
      });
      await page.route(`https://${host}${prefix}**`, (route) =>
        route.fulfill({
          contentType: "text/html",
          body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline fixture</title>
        <main><form>Unrelated pane</form></main><main><button>Other controls</button></main><aside><a href="${prefix}one">Chat one</a><a href="${prefix}two">Chat two</a></aside><main></main><script>
        localStorage.setItem('__ai_chat_md_v2__:settings',JSON.stringify({autoMinimize:false,delayMs:0,export:{format:'${format}',embedMedia:true}}));
        function render(id) {
          const body = '<p>UNIQUE-'+id+'</p><img alt="Map '+id+'" src="/assets/'+id+'.png"><audio controls src="/assets/'+id+'.wav"></audio><div class="attachment-card" data-file-name="'+id+'.csv"><a href="/assets/'+id+'.csv">'+id+'.csv</a></div><pre><code class="language-js">const value = 42;</code></pre><table><tr><th>A</th></tr><tr><td>42</td></tr></table><a href="https://example.com/help">Source help</a>';
          document.querySelectorAll('main')[2].innerHTML = ${platform === "gemini" ? "'<user-query>Prompt '+id+'</user-query><model-response>'+body+'</model-response>'" : '\'<div aria-label="Conversation"><div data-talvt-turn-state="complete"><div><h4 data-conversation-role="user">You said:</h4><div data-content-search-unit-key="fallback-turn-0:0:user">Prompt \'+id+\'</div></div><div data-content-search-unit-key="fallback-turn-0:2:assistant"><h4 data-conversation-role="assistant">ChatGPT said:</h4>\'+body+\'</div></div></div>\''};
        }
        render('one');document.querySelectorAll('aside a').forEach(a=>a.onclick=e=>{e.preventDefault();history.pushState(null,'',a.href);render(a.pathname.split('/').pop());});
        </script>`,
        }),
      );
      await page.goto(`https://${host}${prefix}one`);
      await page.addScriptTag({
        path: resolve("dist/AI-Chat-Markdown-Manager.user.js"),
      });
      await page
        .getByRole("button", { name: "Open Markdown Manager", exact: true })
        .click();
      const currentDownload = page.waitForEvent("download");
      await page
        .getByRole("button", {
          name: `Save current chat as ${format === "html" ? "HTML" : "Markdown"}`,
          exact: false,
        })
        .click();
      await page
        .getByRole("dialog", { name: "Export options" })
        .getByRole("button", {
          name: format === "html" ? "Download HTML" : "Download Markdown",
          exact: true,
        })
        .click();
      const current = await currentDownload;
      expect(current.suggestedFilename()).toMatch(
        format === "html" ? /\.html$/ : /\.md$/,
      );
      const single = readFileSync((await current.path())!, "utf8");
      expect(single).toContain("data:image/png;base64,");
      expect(single).toContain("data:audio/wav;base64,");
      expect(single).toContain(
        `data:application/octet-stream;base64,${Buffer.from("exact input bytes /assets/one.csv").toString("base64")}`,
      );
      expect(single).not.toContain(`https://${host}/assets/`);
      await page
        .getByRole("button", { name: "Manage conversations", exact: false })
        .click();
      await page.getByRole("button", { name: "Select all matching" }).click();
      const zipDownload = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Export selected", exact: true })
        .click();
      const archive = unzipSync(
        readFileSync((await (await zipDownload).path())!),
      );
      expect(JSON.parse(strFromU8(archive["manifest.json"]))).toMatchObject({
        total: 2,
        completed: 2,
        failed: 0,
        format,
        embeddedMedia: true,
      });
      const docs = Object.entries(archive)
        .filter(([name]) => name.endsWith(format === "html" ? ".html" : ".md"))
        .map(([, bytes]) => strFromU8(bytes));
      expect(docs).toHaveLength(2);
      const second = docs.find((text) => text.includes("UNIQUE-two"))!;
      expect(second).toContain(
        `data:application/octet-stream;base64,${Buffer.from("exact input bytes /assets/two.csv").toString("base64")}`,
      );
      expect(second).not.toContain("UNIQUE-one");
      await expect(page).toHaveURL(`https://${host}${prefix}one`);
      if (format === "html") {
        const offline = await context.newPage();
        await context.setOffline(true);
        const requests: string[] = [];
        offline.on("request", (request) => {
          if (/^https?:/.test(request.url())) requests.push(request.url());
        });
        const offlinePath = testInfo.outputPath("offline-conversation.html");
        writeFileSync(offlinePath, second);
        await offline.goto(pathToFileURL(offlinePath).href);
        await expect(
          offline.getByRole("heading", { name: "Assistant", exact: true }),
        ).toBeVisible();
        await expect(offline.locator("table td")).toHaveText("42");
        expect(
          await offline
            .locator("img")
            .evaluate((img) => (img as HTMLImageElement).naturalWidth),
        ).toBe(1);
        await expect(offline.locator("audio")).toHaveAttribute(
          "src",
          /^data:audio/,
        );
        await expect
          .poll(() =>
            offline
              .locator("audio")
              .evaluate((audio) => (audio as HTMLAudioElement).duration),
          )
          .toBeGreaterThan(0);
        await expect(offline.locator('a[download="two.csv"]')).toHaveAttribute(
          "href",
          /^data:application\/octet-stream/,
        );
        expect(requests).toEqual([]);
      }
    });
  }
}

for (const platform of [
  "chatgpt",
  "gemini",
  "grok",
  "claude",
  "deepseek",
] as const) {
  test(`${platform} preview exposes format and embedding controls and blocks stale downloads after failure`, async ({
    page,
  }, testInfo) => {
    const { host, path } = {
      chatgpt: { host: "chatgpt.com", path: "/c/one" },
      gemini: { host: "gemini.google.com", path: "/app/one" },
      grok: { host: "grok.com", path: "/c/one" },
      claude: { host: "claude.ai", path: "/chat/one" },
      deepseek: { host: "chat.deepseek.com", path: "/a/chat/s/one" },
    }[platform];
    let failMedia = false;
    let captureRequests = 0;
    await page.route(`https://${host}/assets/**`, (route) => {
      if (route.request().resourceType() === "fetch") captureRequests++;
      if (failMedia) return route.fulfill({ status: 403, body: "expired" });
      return route.request().url().endsWith(".png")
        ? route.fulfill({
            contentType: "image/png",
            body: Buffer.from(png, "base64"),
          })
        : route.fulfill({
            contentType: "text/csv",
            body: "exact preview input bytes",
          });
    });
    const content =
      '<p>Preview content</p><img alt="Map" src="/assets/map.png"><div class="attachment-card" data-file-name="input.csv"><a href="/assets/input.csv">input.csv</a></div>';
    const messages =
      platform === "gemini"
        ? `<user-query>Prompt</user-query><model-response>${content}</model-response>`
        : platform === "deepseek"
          ? `<div class="ds-message">Prompt</div><div class="ds-message"><div class="ds-assistant-message-main-content">${content}</div></div>`
          : platform === "chatgpt"
            ? `<article data-message-author-role="user">Prompt</article><article data-message-author-role="assistant">${content}</article>`
            : `<div data-testid="user-message">Prompt</div><div data-testid="assistant-message">${content}</div>`;
    await page.route(`https://${host}${path}`, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview chat</title><aside><a href="${path}">Preview chat</a></aside><main>${messages}</main><script>localStorage.setItem('__ai_chat_md_v2__:settings',JSON.stringify({autoMinimize:false,delayMs:0}));</script>`,
      }),
    );
    await page.goto(`https://${host}${path}`);
    await page.addScriptTag({
      path: resolve("dist/AI-Chat-Markdown-Manager.user.js"),
    });
    await page
      .getByRole("button", { name: "Open Markdown Manager", exact: true })
      .click();
    const choice = page.getByRole("dialog", { name: "Export options" });
    const choiceEmbed = choice.getByRole("switch", {
      name: "Embed media and input files",
    });
    const downloadedFiles: string[] = [];
    page.on("download", (download) =>
      downloadedFiles.push(download.suggestedFilename()),
    );
    // No export capture or download occurs until the user confirms the choices.
    await page
      .getByRole("button", { name: "Save current chat as HTML", exact: false })
      .click();
    await expect(choiceEmbed).toBeChecked();
    await expect(choiceEmbed).toBeEnabled();
    const beforeCancel = captureRequests;
    await choice.getByRole("button", { name: "Close dialog" }).click();
    expect(captureRequests).toBe(beforeCancel);
    expect(downloadedFiles).toEqual([]);
    for (const format of ["markdown", "html"] as const) {
      for (const embedded of [false, true]) {
        const label = format === "html" ? "HTML" : "Markdown";
        const before = captureRequests;
        await page
          .getByRole("button", {
            name: `Save current chat as ${label}`,
            exact: false,
          })
          .click();
        await expect(
          choice.getByRole("combobox", { name: "File format" }),
        ).toContainText(format === "html" ? "HTML (.html)" : "Markdown (.md)");
        await expect(choiceEmbed).toBeEnabled();
        await choiceEmbed.setChecked(embedded);
        expect(captureRequests).toBe(before);
        await expect(choice.locator(".hint")).toContainText(
          embedded ? "offline" : "external links",
        );
        if (format === "html" && !embedded) {
          await choice.screenshot({
            path: testInfo.outputPath("export-options.png"),
          });
        }
        const directDownload = page.waitForEvent("download");
        await choice
          .getByRole("button", { name: `Download ${label}`, exact: true })
          .click();
        const direct = await directDownload;
        expect(direct.suggestedFilename()).toMatch(
          format === "html" ? /\.html$/ : /\.md$/,
        );
        const text = readFileSync((await direct.path())!, "utf8");
        if (embedded) {
          expect(captureRequests).toBeGreaterThan(before);
          expect(text).toContain(`data:image/png;base64,${png}`);
          expect(text).toContain(
            Buffer.from("exact preview input bytes").toString("base64"),
          );
        } else {
          expect(captureRequests).toBe(before);
          expect(text).toContain(`https://${host}/assets/map.png`);
          expect(text).toContain(`https://${host}/assets/input.csv`);
          expect(text).not.toContain("data:image");
          expect(text).not.toContain("data:application/octet-stream");
          if (format === "html")
            expect(text).toContain("media and file links require internet");
        }
        await expect(choice).not.toBeVisible();
      }
    }
    // An embedded export failure keeps the choices available for correction.
    failMedia = true;
    await page.locator("main p").evaluate((p) => {
      p.textContent = "Changed direct export content";
    });
    await page
      .getByRole("button", { name: "Save current chat as HTML", exact: false })
      .click();
    await choice
      .getByRole("button", { name: "Download HTML", exact: true })
      .click();
    await expect(choice.getByRole("alert")).toContainText(
      "could not be embedded",
    );
    expect(downloadedFiles).toHaveLength(4);
    await choiceEmbed.uncheck();
    const recoveredDownload = page.waitForEvent("download");
    await choice
      .getByRole("button", { name: "Download HTML", exact: true })
      .click();
    expect(
      readFileSync((await (await recoveredDownload).path())!, "utf8"),
    ).toContain("Linked conversation export");
    failMedia = false;
    await page
      .getByRole("button", { name: "Manage conversations", exact: false })
      .click();
    const openPreview = async () => {
      await page
        .getByRole("button", { name: "Actions for Preview chat", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Preview / export", exact: true })
        .click();
    };
    await openPreview();
    const dialog = page.getByRole("dialog");
    const format = dialog.getByRole("combobox", { name: "File format" });
    const embed = dialog.getByRole("switch", {
      name: "Embed media and input files",
    });
    const images = dialog.getByRole("switch", {
      name: "Include images",
      exact: true,
    });
    const files = dialog.getByRole("switch", {
      name: "Include links and input files",
      exact: true,
    });
    await expect(format).toContainText("Markdown (.md)");
    await expect(embed).not.toBeChecked();
    await expect(
      dialog.getByRole("button", { name: "Download Markdown", exact: true }),
    ).toBeEnabled();
    await expect(dialog.locator("pre")).not.toContainText(
      "data:application/octet-stream",
    );
    await embed.check();
    const markdownButton = dialog.getByRole("button", {
      name: "Download Markdown",
      exact: true,
    });
    await expect(markdownButton).toBeEnabled();
    await expect(dialog.locator("pre")).toContainText("data:image/png;base64,");
    const markdownDownload = page.waitForEvent("download");
    await markdownButton.click();
    const markdown = await markdownDownload;
    expect(markdown.suggestedFilename()).toMatch(/\.md$/);
    const markdownText = readFileSync((await markdown.path())!, "utf8");
    expect(markdownText).toContain("data:image/png;base64,");
    expect(markdownText).toContain(
      Buffer.from("exact preview input bytes").toString("base64"),
    );
    await dialog.screenshot({
      path: testInfo.outputPath("preview-export.png"),
    });
    await images.uncheck();
    await expect(markdownButton).toBeEnabled();
    await expect(dialog.locator("pre")).not.toContainText("data:image");
    await images.check();
    await expect(markdownButton).toBeEnabled();
    await files.uncheck();
    await expect(markdownButton).toBeEnabled();
    await expect(dialog.locator("pre")).not.toContainText(
      "data:application/octet-stream",
    );
    await files.check();
    await expect(markdownButton).toBeEnabled();
    await format.click();
    await dialog
      .getByRole("option", { name: "HTML (.html)", exact: true })
      .click();
    const htmlButton = dialog.getByRole("button", {
      name: "Download HTML",
      exact: true,
    });
    await expect(htmlButton).toBeEnabled();
    await expect(embed).toBeChecked();
    await expect(embed).toBeEnabled();
    await embed.uncheck();
    await expect(htmlButton).toBeEnabled();
    await expect(dialog.locator("pre")).toContainText(
      `https://${host}/assets/map.png`,
    );
    await expect(dialog.locator("pre")).not.toContainText("data:image");
    await embed.check();
    await expect(htmlButton).toBeEnabled();
    const htmlDownload = page.waitForEvent("download");
    await htmlButton.click();
    const html = await htmlDownload;
    expect(html.suggestedFilename()).toMatch(/\.html$/);
    const htmlText = readFileSync((await html.path())!, "utf8");
    expect(htmlText).toContain("<!doctype html>");
    expect(htmlText).toContain("data:image/png;base64,");
    expect(htmlText).toContain(
      Buffer.from("exact preview input bytes").toString("base64"),
    );
    await dialog.getByRole("button", { name: "Close dialog" }).click();
    // Invalidate cached body by changing the actual loaded message content.
    await page.locator("main p").evaluate((p) => {
      p.textContent = "Changed preview content";
    });
    await openPreview();
    await expect(markdownButton).toBeEnabled();
    failMedia = true;
    await format.click();
    await dialog
      .getByRole("option", { name: "HTML (.html)", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(htmlButton).toBeDisabled();
    await expect(dialog.locator("pre")).toBeEmpty();
    failMedia = false;
    await dialog.getByRole("button", { name: "Retry preview" }).click();
    await expect(htmlButton).toBeEnabled();
    await expect(dialog.locator("pre")).toContainText(
      "Changed preview content",
    );
    await expect(page).toHaveURL(`https://${host}${path}`);
  });
}
