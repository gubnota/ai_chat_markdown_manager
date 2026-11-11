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
        <aside><a href="${prefix}one">Chat one</a><a href="${prefix}two">Chat two</a></aside><main></main><script>
        localStorage.setItem('__ai_chat_md_v2__:settings',JSON.stringify({autoMinimize:false,delayMs:0,export:{format:'${format}',embedMedia:${format === "markdown"}}}));
        function render(id) {
          const body = '<p>UNIQUE-'+id+'</p><img alt="Map '+id+'" src="/assets/'+id+'.png"><audio controls src="/assets/'+id+'.wav"></audio><div class="attachment-card" data-file-name="'+id+'.csv"><a href="/assets/'+id+'.csv">'+id+'.csv</a></div><pre><code class="language-js">const value = 42;</code></pre><table><tr><th>A</th></tr><tr><td>42</td></tr></table><a href="https://example.com/help">Source help</a>';
          document.querySelector('main').innerHTML = ${platform === "gemini" ? "'<user-query>Prompt '+id+'</user-query><model-response>'+body+'</model-response>'" : "'<article data-message-author-role=\"user\">Prompt '+id+'</article><article data-message-author-role=\"assistant\">'+body+'</article>'"};
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
