import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { unzipSync, strFromU8 } from "fflate";

test("Gemini current and batch downloads preserve uploaded files and generated image references", async ({
  page,
}) => {
  await page.route("https://files.example/**", (route) => route.abort());
  await page.route("https://gemini.google.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Attachments</title></head><body>
    <aside><a href="/app/one">Chat one</a><a href="/app/two">Chat two</a></aside><main></main>
    <script>
    function render(id) {
      document.querySelector('main').innerHTML = id === 'two'
      ? '<model-response><generated-image><button aria-label="Enlarge image"><img src="https://files.example/two-generated.png" alt="Generated two"></button></generated-image></model-response>'
      : '<user-query><user-query-content>Review uploads<div class="file-preview-container"><user-query-file-carousel class="query-file-carousel desktop"><div class="scrollable-area"><file-preview><button><span class="file-name">one-report.pdf</span></button><a href="https://files.example/one-report.pdf?signature=one">Download</a></file-preview><user-query-file-preview class="query-file-preview force-ltr enable-luminous-prompt-bubble"><div class="file-preview-container"><button class="preview-image-button large-preview-image" aria-label="Show uploaded image in lightbox"><img class="preview-image" data-test-id="uploaded-img" src="https://files.example/one-upload.png" alt="Upload one"></button></div></user-query-file-preview><file-preview><button><span class="file-name">one-private.csv</span></button></file-preview></div></user-query-file-carousel></div></user-query-content></user-query><model-response><generated-image><button aria-label="Enlarge image"><img src="https://files.example/one-generated.png" alt="Generated one"></button><div role="toolbar"><button>Share image</button><button>Download full size image</button></div></generated-image></model-response>';
    }
    render('one');
    document.addEventListener('click', event => {
      const link = event.target.closest('aside a');
      if (!link) return;
      event.preventDefault(); history.pushState(null, '', link.href);
      document.querySelector('main').setAttribute('aria-busy', 'true');
      setTimeout(() => { render(link.pathname.split('/').pop()); document.querySelector('main').removeAttribute('aria-busy'); }, 300);
    });</script></body></html>`,
    }),
  );
  await page.goto("https://gemini.google.com/app/one");
  await page.addScriptTag({
    path: resolve("dist/AI-Chat-Markdown-Manager.user.js"),
  });
  await page
    .getByRole("button", { name: "Open Markdown Manager", exact: true })
    .click();
  const singleDownload = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Save Current Chat",
      exact: false,
    })
    .click();
  await page
    .getByRole("dialog", { name: "Export options" })
    .getByRole("button", { name: "Download Markdown", exact: true })
    .click();
  const single = readFileSync((await (await singleDownload).path())!, "utf8");
  expect(single).toContain(
    "![Upload one](https://files.example/one-upload.png)",
  );
  expect(single).toContain(
    "![Generated one](https://files.example/one-generated.png)",
  );
  expect(single).toContain(
    "[one-report.pdf](https://files.example/one-report.pdf?signature=one)",
  );
  expect(single).toContain("one-private.csv — direct link unavailable.");
  expect(single).not.toMatch(/Share image|Download full size/);
  await page
    .getByRole("button", { name: "Manage conversations", exact: false })
    .click();
  await page.getByRole("button", { name: "Select all matching" }).click();
  const zipDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export selected", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Export selected" })
    .getByRole("switch", { name: "Embed media and input files" })
    .uncheck();
  await page
    .getByRole("dialog", { name: "Export selected" })
    .getByRole("button", { name: "Download ZIP", exact: true })
    .click();
  const archive = unzipSync(readFileSync((await (await zipDownload).path())!));
  expect(JSON.parse(strFromU8(archive["manifest.json"]))).toMatchObject({
    total: 2,
    completed: 2,
    failed: 0,
  });
  const documents = Object.entries(archive)
    .filter(([name]) => name.endsWith(".md"))
    .map(([, bytes]) => strFromU8(bytes));
  expect(documents).toHaveLength(2);
  expect(documents.find((text) => text.includes("one-report.pdf"))).toContain(
    "one-generated.png",
  );
  const second = documents.find((text) => text.includes("two-generated.png"))!;
  expect(second).toContain(
    "![Generated two](https://files.example/two-generated.png)",
  );
  expect(second).not.toContain("one-");
  await expect(page).toHaveURL("https://gemini.google.com/app/one");
});

test("Gemini temporary images survive current and batch exports after blob revocation", async ({
  page,
}) => {
  await page.route("https://gemini.google.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="connect-src 'none'"><title>Temporary images</title></head><body>
    <aside><a href="/app/one">Chat one</a><a href="/app/two">Chat two</a></aside><main aria-busy="true"></main>
    <script>
    window.expectedImages = {}; window.nativeActions = 0; let previous = [];
    async function render(id) {
      const main = document.querySelector('main'); main.setAttribute('aria-busy', 'true');
      previous.forEach(URL.revokeObjectURL); previous = [];
      const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 1;
      const context = canvas.getContext('2d'); context.fillStyle = id === 'one' ? '#ff0000' : '#0000ff'; context.fillRect(0, 0, 2, 1);
      window.expectedImages[id] = canvas.toDataURL('image/png');
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const url = URL.createObjectURL(blob); previous.push(url);
      main.innerHTML = '<user-query><user-query-content>Prompt '+id+'<div class="file-preview-container"><user-query-file-carousel><user-query-file-preview><div class="file-preview-container"><button class="preview-image-button"><img data-test-id="uploaded-img" class="preview-image" alt="Upload '+id+'" src="'+url+'"></button></div></user-query-file-preview></user-query-file-carousel></div></user-query-content></user-query><model-response><single-image class="generated-image large luminous-layout"><div class="image-container replace-fife-images-at-export"><div class="overlay-container"><button class="image-button"><img class="image animate loaded" alt="Generated '+id+'" src="'+url+'"></button></div></div><div role="toolbar"><button>Copy image</button><button>Download image</button></div></single-image></model-response>';
      await Promise.all(Array.from(main.querySelectorAll('img'), img => img.decode()));
      main.removeAttribute('aria-busy');
    }
    render('one');
    document.addEventListener('click', event => {
      if (event.target.closest('main button')) window.nativeActions++;
      const link = event.target.closest('aside a'); if (!link) return;
      event.preventDefault(); history.pushState(null, '', link.href); render(link.pathname.split('/').pop());
    });</script></body></html>`,
    }),
  );
  await page.goto("https://gemini.google.com/app/one");
  await expect(page.locator("main")).not.toHaveAttribute("aria-busy");
  await page.addScriptTag({
    path: resolve("dist/AI-Chat-Markdown-Manager.user.js"),
  });
  await page
    .getByRole("button", { name: "Open Markdown Manager", exact: true })
    .click();
  const singleDownload = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Save Current Chat",
      exact: false,
    })
    .click();
  await page
    .getByRole("dialog", { name: "Export options" })
    .getByRole("button", { name: "Download Markdown", exact: true })
    .click();
  const single = readFileSync((await (await singleDownload).path())!, "utf8");
  const one = await page.evaluate(
    () =>
      (window as unknown as { expectedImages: Record<string, string> })
        .expectedImages.one,
  );
  expect(single).toContain(`![Upload one](${one})`);
  expect(single).toContain(`![Generated one](${one})`);
  expect(single).not.toMatch(
    /blob:|direct link unavailable|Copy image|Download image/,
  );
  await page
    .getByRole("button", { name: "Manage conversations", exact: false })
    .click();
  await page.getByRole("button", { name: "Select all matching" }).click();
  const zipDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export selected", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Export selected" })
    .getByRole("button", { name: "Download ZIP", exact: true })
    .click();
  const archive = unzipSync(readFileSync((await (await zipDownload).path())!));
  expect(JSON.parse(strFromU8(archive["manifest.json"]))).toMatchObject({
    total: 2,
    completed: 2,
    failed: 0,
  });
  const documents = Object.entries(archive)
    .filter(([name]) => name.endsWith(".md"))
    .map(([, bytes]) => strFromU8(bytes));
  expect(documents).toHaveLength(2);
  const expected = await page.evaluate(
    () =>
      (window as unknown as { expectedImages: Record<string, string> })
        .expectedImages,
  );
  expect(expected.one).not.toBe(expected.two);
  for (const id of ["one", "two"]) {
    const text = documents.find((text) => text.includes("Prompt " + id))!;
    expect(text).toContain(`![Upload ${id}](${expected[id]})`);
    expect(text).toContain(`![Generated ${id}](${expected[id]})`);
    expect(text).not.toMatch(/blob:|direct link unavailable/);
    expect(text).not.toContain(expected[id === "one" ? "two" : "one"]);
  }
  expect(
    await page.evaluate(
      () => (window as unknown as { nativeActions: number }).nativeActions,
    ),
  ).toBe(0);
  await expect(page).toHaveURL("https://gemini.google.com/app/one");
});
