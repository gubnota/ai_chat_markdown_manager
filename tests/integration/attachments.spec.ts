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
      : '<user-query>Review uploads<user-query-file-carousel><file-preview><button><span class="file-name">one-report.pdf</span></button><a href="https://files.example/one-report.pdf?signature=one">Download</a></file-preview><button aria-label="Enlarge uploaded image"><img src="https://files.example/one-upload.png" alt="Upload one"></button><file-preview><button><span class="file-name">one-private.csv</span></button></file-preview></user-query-file-carousel></user-query><model-response><generated-image><button aria-label="Enlarge image"><img src="https://files.example/one-generated.png" alt="Generated one"></button><div role="toolbar"><button>Share image</button><button>Download full size image</button></div></generated-image></model-response>';
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
      name: "Save current chat as Markdown",
      exact: false,
    })
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
