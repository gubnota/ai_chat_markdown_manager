import { beforeEach, expect, it } from "vitest";
import { elementMarkdown } from "../../src/markdown/legacy";
import {
  messageBody,
  navigateConversation,
} from "../../src/adapters/base/navigation";
import { defaults } from "../../src/storage";

beforeEach(() => {
  history.replaceState(null, "", "/app/one");
  document.body.innerHTML = "<main></main>";
});
function render(html: string, options = defaults.export) {
  document.querySelector("main")!.innerHTML = html;
  return messageBody("gemini", options)!;
}
it("keeps uploaded and generated image previews without native actions", () => {
  const html =
    '<user-query><button aria-label="Expand uploaded image"><img src="https://files.example/upload.png" alt="My upload"></button>Describe this</user-query><model-response><generated-image><button><img src="https://files.example/generated.png?token=abc" alt="Generated image"></button><div role="toolbar"><button>Download full size image</button></div></generated-image></model-response>';
  const text = render(html);
  expect(text).toContain("![My upload](https://files.example/upload.png)");
  expect(text).toContain(
    "![Generated image](https://files.example/generated.png?token=abc)",
  );
  expect(text).not.toContain("Download full size");
  expect(document.querySelector("main")!.innerHTML).toBe(html);
});
it("exports file cards with exposed URLs and names inaccessible files", () => {
  const text = render(
    '<user-query><file-preview><button><mat-icon>description</mat-icon><span class="file-name">Quarterly report.pdf</span></button><a href="https://files.example/report.pdf?signature=abc">Download</a></file-preview><file-preview><button><span class="file-name">private.csv</span></button></file-preview></user-query>',
  );
  expect(text).toContain(
    "[Quarterly report.pdf](https://files.example/report.pdf?signature=abc)",
  );
  expect(text).toContain("Attachment: private.csv — direct link unavailable.");
  expect(text).not.toContain("description");
  expect(text.match(/Quarterly report/g)).toHaveLength(1);
});
it("respects independent image and link settings", () => {
  const html =
    '<user-query><button><img src="https://files.example/a.png" alt="Upload"></button><file-preview data-file-name="report.pdf" data-file-url="https://files.example/report.pdf"></file-preview></user-query>';
  const noImages = render(html, { ...defaults.export, images: false });
  expect(noImages).not.toContain("a.png");
  expect(noImages).toContain("[report.pdf]");
  const noLinks = render(html, { ...defaults.export, links: false });
  expect(noLinks).toContain("![Upload]");
  expect(noLinks).toContain("Attachment: report.pdf");
  expect(noLinks).not.toContain("https://files.example/report.pdf");
});
it("uses filename-only preview buttons and supports named files without extensions", () => {
  const text = render(
    '<user-query><file-preview><button>notes.pdf</button><a href="https://files.example/notes.pdf">Download</a></file-preview><file-preview data-file-name="Dockerfile" data-file-url="https://files.example/source"></file-preview></user-query>',
  );
  expect(text).toContain("[notes.pdf](https://files.example/notes.pdf)");
  expect(text).toContain("[Dockerfile](https://files.example/source)");
  expect(text).not.toContain("direct link unavailable");
});
it("labels blob/data media and rejects executable attachment URLs", () => {
  const text = render(
    '<user-query><button><img src="blob:https://gemini.google.com/local" alt="Local upload"></button><file-preview data-file-name="notes.txt" data-file-url="javascript:alert(1)"></file-preview><file-preview data-file-name="data.csv" data-file-url="data:text/plain,private"></file-preview></user-query>',
  );
  expect(text).toContain("Image: Local upload — direct link unavailable.");
  expect(text).toContain("Attachment: notes.txt — direct link unavailable.");
  expect(text).not.toMatch(/blob:|javascript:|data:text/);
});
it("prefers a usable image source over a temporary placeholder", () => {
  const text = render(
    '<model-response><button><img data-src="data:image/png;base64,placeholder" src="https://files.example/actual.png" alt="Result"></button></model-response>',
  );
  expect(text).toContain("![Result](https://files.example/actual.png)");
  expect(text).not.toContain("placeholder");
});
it("excludes hidden previews, toolbars, sidebar and unrelated buttons", () => {
  document.body.innerHTML =
    '<aside><user-query><button><img src="https://files.example/sidebar.png"></button></user-query></aside><main><user-query><button>Send</button><button><span hidden><img src="https://files.example/hidden.png"></span><img src="https://files.example/visible.png"></button><div role="toolbar"><button><img src="https://files.example/icon.png"></button></div></user-query></main>';
  const text = messageBody("gemini", defaults.export)!;
  expect(text).toContain("visible.png");
  expect(text).not.toMatch(/sidebar.png|hidden.png|icon.png|Send/);
  const button = document.createElement("button");
  button.innerHTML = '<img src="https://files.example/nonchat.png">Click';
  expect(elementMarkdown(button)).toBe("\n");
});
it("waits for image identity when Gemini reuses an image-only response node", async () => {
  document.body.innerHTML =
    '<aside><a href="/app/two">Two</a></aside><main><model-response><button><img src="https://files.example/old.png"></button></model-response></main>';
  document.querySelector("a")!.addEventListener("click", (event) => {
    event.preventDefault();
    history.pushState(null, "", "/app/two");
    document.querySelector("img")!.src = "https://files.example/new.png";
  });
  await navigateConversation(
    "gemini",
    "/app/two",
    () => location.pathname === "/app/two",
    undefined,
    2500,
  );
  expect(messageBody("gemini", defaults.export)).toContain("new.png");
});
it("does not accept an unchanged image-only response on a new route", async () => {
  document.body.innerHTML =
    '<aside><a href="/app/two">Two</a></aside><main><model-response><img src="https://files.example/old.png"></model-response></main>';
  document.querySelector("a")!.addEventListener("click", (event) => {
    event.preventDefault();
    history.pushState(null, "", "/app/two");
  });
  await expect(
    navigateConversation(
      "gemini",
      "/app/two",
      () => location.pathname === "/app/two",
      undefined,
      220,
    ),
  ).rejects.toThrow("no stale content was exported");
});
