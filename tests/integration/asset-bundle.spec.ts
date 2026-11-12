import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { unzipSync, strFromU8 } from "fflate";

const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=";
for (const platform of [
  "chatgpt",
  "gemini",
  "grok",
  "claude",
  "deepseek",
] as const) {
  for (const format of ["html", "markdown"] as const) {
    test(`${platform} ${format} ZIP captures blob/SVG images and reference files with editable names`, async ({
      page,
      context,
    }, testInfo) => {
      const { host, path } = {
        chatgpt: { host: "chatgpt.com", path: "/c/one" },
        gemini: { host: "gemini.google.com", path: "/app/one" },
        grok: { host: "grok.com", path: "/c/one" },
        claude: { host: "claude.ai", path: "/chat/one" },
        deepseek: { host: "chat.deepseek.com", path: "/a/chat/s/one" },
      }[platform];
      await page.route(`https://${host}/reference.csv`, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        await route.fulfill({
          contentType: "text/csv",
          body: "reference,input\nexact,bytes\n",
        });
      });
      const svg =
        "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><rect width="64" height="32" fill="red"/></svg>',
        );
      const content = `<p>Portable fixture</p><img id="blob-image" alt="Generated"><img alt="Diagram" src="${svg}"><div class="attachment-card" data-file-name="reference.csv"><a href="/reference.csv">reference.csv</a></div>`;
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
          body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bundle chat</title><aside><a href="${path}">Bundle chat</a></aside><main>${messages}</main><script>
        localStorage.setItem('__ai_chat_md_v2__:settings',JSON.stringify({autoMinimize:false,delayMs:0,export:{mediaFiles:true,format:'${format}'}}));
        document.getElementById('blob-image').src=URL.createObjectURL(new Blob([Uint8Array.from(atob('${png}'),c=>c.charCodeAt(0))],{type:'image/png'}));
        </script>`,
        }),
      );
      await page.goto(`https://${host}${path}`);
      await expect
        .poll(() =>
          page
            .locator("main img")
            .evaluateAll((images) =>
              images.every((img) => (img as HTMLImageElement).naturalWidth > 0),
            ),
        )
        .toBe(true);
      await page.addScriptTag({
        path: resolve("dist/AI-Chat-Markdown-Manager.user.js"),
      });
      await page
        .getByRole("button", { name: "Open Markdown Manager", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Save Current Chat",
          exact: false,
        })
        .click();
      const dialog = page.getByRole("dialog", { name: "Export options" });
      const selector = dialog.getByRole("combobox", { name: "File format" });
      await expect(dialog.locator("select")).toHaveCount(0);
      await selector.click();
      await selector.press("Escape");
      await expect(dialog).toBeVisible();
      await expect(selector).toHaveAttribute("aria-expanded", "false");
      if (format === "html") {
        await selector.press("End");
        await selector.press("Enter");
      }
      await expect(selector).toContainText(
        format === "html" ? "HTML (.html)" : "Markdown (.md)",
      );
      await dialog
        .getByRole("textbox", { name: "Filename" })
        .fill("Plane trip");
      await expect(
        dialog.getByRole("switch", { name: "Embed media and input files" }),
      ).not.toBeChecked();
      await expect(
        dialog.getByRole("switch", { name: "Save ZIP with separate media and input files" }),
      ).toBeChecked();
      const downloaded = page.waitForEvent("download");
      await dialog
        .getByRole("button", { name: "Download ZIP", exact: true })
        .click();
      await expect(dialog.getByRole("progressbar")).toBeVisible();
      const download = await downloaded;
      expect(download.suggestedFilename()).toBe("Plane trip.zip");
      const archive = unzipSync(readFileSync((await download.path())!));
      const documentName = "Plane trip." + (format === "html" ? "html" : "md");
      const source = strFromU8(archive[documentName]);
      expect(source).not.toMatch(/blob:|data:image|svg\+xml/);
      const assets = Object.entries(archive).filter(([name]) =>
        name.startsWith("assets/"),
      );
      expect(assets).toHaveLength(3);
      expect(
        strFromU8(assets.find(([name]) => name.endsWith("reference.csv"))![1]),
      ).toBe("reference,input\nexact,bytes\n");
      for (const [, bytes] of assets.filter(([name]) => name.endsWith(".png")))
        expect([...bytes.slice(0, 8)]).toEqual([
          137, 80, 78, 71, 13, 10, 26, 10,
        ]);
      if (platform === "chatgpt" || platform === "gemini") {
        await page
          .getByRole("button", { name: "Manage conversations", exact: false })
          .click();
        await page.getByRole("button", { name: "Select all matching" }).click();
        const batchDownload = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Export selected", exact: true })
          .click();
        await page
          .getByRole("dialog", { name: "Export selected" })
          .getByRole("button", { name: "Download ZIP", exact: true })
          .click();
        const batch = unzipSync(
          readFileSync((await (await batchDownload).path())!),
        );
        expect(JSON.parse(strFromU8(batch["manifest.json"]))).toMatchObject({
          completed: 1,
          failed: 0,
          mediaFiles: true,
        });
        expect(
          Object.keys(batch).filter((name) => name.startsWith("assets/")),
        ).toHaveLength(3);
        await page.getByRole("button", { name: "Back", exact: true }).click();
        await page
          .getByRole("button", { name: "Manage conversations", exact: false })
          .click();
        await page
          .getByRole("button", { name: "Actions for Bundle chat", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Preview / export", exact: true })
          .click();
        const preview = page.getByRole("dialog");
        await expect(
          preview.getByRole("button", { name: "Download ZIP", exact: true }),
        ).toBeEnabled();
        await preview
          .getByRole("textbox", { name: "Filename" })
          .fill("Renamed preview");
        const previewDownload = page.waitForEvent("download");
        await preview
          .getByRole("button", { name: "Download ZIP", exact: true })
          .click();
        const previewFile = await previewDownload;
        expect(previewFile.suggestedFilename()).toBe("Renamed preview.zip");
        const previewZip = unzipSync(readFileSync((await previewFile.path())!));
        expect(
          previewZip["Renamed preview." + (format === "html" ? "html" : "md")],
        ).toBeDefined();
        expect(
          Object.keys(previewZip).filter((name) => name.startsWith("assets/")),
        ).toHaveLength(3);
      }
      if (format === "html") {
        const directory = testInfo.outputPath("unpacked");
        for (const [name, bytes] of Object.entries(archive)) {
          const path = resolve(directory, name);
          mkdirSync(dirname(path), { recursive: true });
          writeFileSync(path, bytes);
        }
        await context.setOffline(true);
        const offline = await context.newPage();
        const requests: string[] = [];
        offline.on("request", (request) => {
          if (/^https?:/.test(request.url())) requests.push(request.url());
        });
        await offline.goto(
          pathToFileURL(resolve(directory, documentName)).href,
        );
        await expect
          .poll(() =>
            offline
              .locator("img")
              .evaluateAll((images) =>
                images.map((img) => (img as HTMLImageElement).naturalWidth),
              ),
          )
          .toEqual([1, 64]);
        const reference = offline.locator('a[download="reference.csv"]');
        // WebKit opens local file links instead of emitting a download event.
        const href = await reference.getAttribute("href");
        expect(href).toMatch(/^assets\//);
        expect(
          readFileSync(resolve(directory, decodeURIComponent(href!)), "utf8"),
        ).toBe("reference,input\nexact,bytes\n");
        if (testInfo.project.name === "chromium") {
          const referenceDownload = offline.waitForEvent("download");
          await reference.click();
          expect(
            readFileSync((await (await referenceDownload).path())!, "utf8"),
          ).toBe("reference,input\nexact,bytes\n");
        }
        expect(requests).toEqual([]);
      }
    });
  }
}

test("public image CDN with anonymous-only CORS exports exact pixels", async ({
  page,
}) => {
  let imageRequests = 0;
  await page.route("https://public-images.test/map.png", (route) => {
    imageRequests++;
    return route.fulfill({
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
      body: Buffer.from(png, "base64"),
    });
  });
  await page.route("https://chatgpt.com/c/cors", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><title>CORS fixture</title><main><article data-message-author-role="assistant"><p>Public image</p><img src="https://public-images.test/map.png" alt="Map"></article></main>',
    }),
  );
  await page.goto("https://chatgpt.com/c/cors");
  await expect
    .poll(() =>
      page
        .locator("main img")
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBe(1);
  // The ordinary display succeeds, but these pixels are tainted without crossorigin.
  expect(
    await page.locator("img").evaluate((img) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      canvas.getContext("2d")!.drawImage(img as HTMLImageElement, 0, 0);
      try {
        canvas.toDataURL();
        return false;
      } catch {
        return true;
      }
    }),
  ).toBe(true);
  await page.addScriptTag({
    path: resolve("dist/AI-Chat-Markdown-Manager.user.js"),
  });
  await page
    .getByRole("button", { name: "Open Markdown Manager", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save Current Chat", exact: false })
    .click();
  const choice = page.getByRole("dialog", { name: "Export options" });
  await choice.getByRole("combobox", { name: "File format" }).click();
  await choice.getByRole("option", { name: "HTML (.html)", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await choice
    .getByRole("button", { name: "Download HTML", exact: true })
    .click();
  const source = readFileSync((await (await downloaded).path())!, "utf8");
  expect(source).toContain(`data:image/png;base64,${png}`);
  expect(source).not.toContain("public-images.test");
  expect(imageRequests).toBe(3); // display, rejected credentialed fetch, anonymous fetch
});

test("ChatGPT bulk ZIP saves live and revoked blob previews with stale HTTP hints", async ({
  page,
}) => {
  const bytes = Buffer.from(png, "base64");
  let staleRequests = 0;
  await page.route("https://chatgpt.com/stale.png", (route) => {
    staleRequests++;
    return route.fulfill({ status: 404, body: "Expired" });
  });
  await page.route("https://chatgpt.com/c/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><title>Image export fixture</title>
        <aside><a href="/c/one">Start</a><a href="/c/two">Generated images</a></aside><main></main>
        <script>
          localStorage.setItem('__ai_chat_md_v2__:settings',JSON.stringify({autoMinimize:false,delayMs:0,export:{mediaFiles:true,format:'html'}}));
          function render(id) {
            const root = document.querySelector('main');
            root.innerHTML = '<article data-message-author-role="assistant"><p>Chat '+id+'</p></article>';
            if (id !== 'two') return;
            for (const [index, alt] of ['Live preview', 'Revoked preview'].entries()) {
              const img = new Image();
              const url = URL.createObjectURL(new Blob([Uint8Array.from(atob('${png}'),c=>c.charCodeAt(0))],{type:'image/png'}));
              img.alt = alt;
              img.dataset.original = '/stale.png';
              if (index === 1) img.onload = () => URL.revokeObjectURL(url);
              img.src = url;
              root.firstElementChild.append(img);
            }
          }
          render('one');
          document.querySelectorAll('aside a').forEach(a=>a.onclick=e=>{e.preventDefault();history.pushState(null,'',a.href);render(a.pathname.split('/').pop());});
        </script>`,
    }),
  );
  await page.goto("https://chatgpt.com/c/one");
  await page.addScriptTag({
    path: resolve("dist/AI-Chat-Markdown-Manager.user.js"),
  });
  await page
    .getByRole("button", { name: "Open Markdown Manager", exact: true })
    .click();
  await page.getByRole("button", { name: /^Export All/ }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("dialog", { name: "Export All" })
    .getByRole("button", { name: "Download ZIP", exact: true })
    .click();
  const zip = unzipSync(readFileSync((await (await downloaded).path())!));
  expect(JSON.parse(strFromU8(zip["manifest.json"]))).toMatchObject({
    completed: 2,
    failed: 0,
  });
  const assets = Object.entries(zip).filter(([path]) =>
    path.startsWith("assets/"),
  );
  expect(assets).toHaveLength(2);
  const live = assets.find(([path]) => path.endsWith("Live preview.png"))![1];
  const revoked = assets.find(([path]) => path.endsWith("Revoked preview.png"))![1];
  expect(Buffer.from(live)).toEqual(bytes);
  expect(Buffer.from(revoked.subarray(0, 8))).toEqual(bytes.subarray(0, 8));
  const doc = Object.entries(zip).find(
    ([path]) => path.endsWith(".html") && path.includes("Generated images"),
  )![1];
  const html = strFromU8(doc);
  expect(html).toContain("Live%20preview.png");
  expect(html).toContain("Revoked%20preview.png");
  expect(html).not.toMatch(/blob:|stale\.png/);
  expect(staleRequests).toBe(0);
  await expect(page).toHaveURL("https://chatgpt.com/c/one");
});

for (const format of ["html", "markdown"] as const) {
  test(`ChatGPT ${format} bulk ZIP recovers display-only images and flags incomplete chats`, async ({
    page,
  }) => {
    const cdn = "https://chat-image-cdn.test";
    const imageBytes = Buffer.from(png, "base64");
    await page.route(`${cdn}/**`, (route) =>
      route.fulfill({
        contentType: "image/png",
        // Playwright inserts a permissive CORS header if the response omits it.
        headers: {
          "access-control-allow-origin": route
            .request()
            .url()
            .endsWith("/recoverable.png")
            ? "*"
            : "https://other-origin.test",
        },
        body: imageBytes,
      }),
    );
    await page.route("https://chatgpt.com/c/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        headers: {
          "content-security-policy": `connect-src 'self'; img-src ${cdn}`,
        },
        body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Image export fixture</title>
          <aside><a href="/c/one">Chat one</a><a href="/c/two">Chat two</a></aside><main></main>
          <script>
          localStorage.setItem('__ai_chat_md_v2__:settings', JSON.stringify({autoMinimize:false,delayMs:0,export:{mediaFiles:true,format:'${format}'}}));
          function render(id) {
            document.querySelector('main').innerHTML = '<article data-message-author-role="assistant"><p>Text for chat '+id+'</p>' +
              (id === 'two' ? '<img alt="Blocked image" src="${cdn}/blocked.png">' : '') +
              '<img alt="Recoverable image" src="${cdn}/recoverable.png"></article>';
          }
          render('one');
          document.querySelectorAll('aside a').forEach(a=>a.onclick=e=>{e.preventDefault();history.pushState(null,'',a.href);render(a.pathname.split('/').pop());});
          </script>`,
      }),
    );
    await page.goto("https://chatgpt.com/c/one");
    await expect
      .poll(() =>
        page
          .locator("main img")
          .evaluate((img) => (img as HTMLImageElement).naturalWidth),
      )
      .toBe(1);
    expect(
      await page.evaluate(
        async (url) =>
          fetch(url).then(
            () => true,
            () => false,
          ),
        `${cdn}/recoverable.png`,
      ),
    ).toBe(false);
    await page.addScriptTag({
      path: resolve("dist/AI-Chat-Markdown-Manager.user.js"),
    });
    await page
      .getByRole("button", { name: "Open Markdown Manager", exact: true })
      .click();
    await page.getByRole("button", { name: /^Export All/ }).click();
    const choice = page.getByRole("dialog", { name: "Export All" });
    await expect(
      choice.getByRole("switch", {
        name: "Save ZIP with separate media and input files",
      }),
    ).toBeChecked();
    const downloaded = page.waitForEvent("download");
    await choice
      .getByRole("button", { name: "Download ZIP", exact: true })
      .click();
    const zip = unzipSync(readFileSync((await (await downloaded).path())!));
    const manifest = JSON.parse(strFromU8(zip["manifest.json"]));
    expect(manifest).toMatchObject({
      completed: 1,
      failed: 1,
      results: expect.arrayContaining([
        { key: "chatgpt:one", status: "success" },
        {
          key: "chatgpt:two",
          status: "failed",
          error: expect.stringContaining(
            "Saved an incomplete copy in the ZIP. Blocked image",
          ),
        },
      ]),
    });
    const extension = format === "html" ? ".html" : ".md";
    const docs = Object.keys(zip).filter((name) => name.endsWith(extension));
    expect(docs).toHaveLength(2);
    for (const name of docs) {
      const source = strFromU8(zip[name]);
      const folder = `assets/${name.slice(0, -extension.length)}/`;
      const images = Object.keys(zip).filter((path) => path.startsWith(folder));
      expect(images).toHaveLength(1);
      expect(Buffer.from(zip[images[0]].slice(0, 8))).toEqual(
        imageBytes.subarray(0, 8),
      );
      expect(source).toContain(
        folder.split("/").map(encodeURIComponent).join("/"),
      );
      expect(source).not.toContain(cdn);
      if (source.includes("Text for chat two")) {
        expect(source).toContain("Incomplete offline export");
        expect(source).toContain("Image unavailable offline");
      } else {
        expect(source).toContain("Text for chat one");
        expect(source).not.toContain("Incomplete offline export");
      }
    }
    await page.getByText("Review backed-up chats (1)", { exact: true }).click();
    const review = page.locator("details.backup-review");
    await expect(review.getByText("Chat one", { exact: true })).toBeVisible();
    await expect(review.getByText("Chat two", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Retry failed exports" }),
    ).toBeEnabled();
  });
}
