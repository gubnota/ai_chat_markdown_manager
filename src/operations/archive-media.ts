// SPDX-License-Identifier: MIT OR Apache-2.0
import { linkedFilename, pathFilename } from "../markdown/filenames";
import { safeFilename } from "./export";
import { assetFilename } from "./resources";

type Entry = { id: string; name: string };

/** Index conversation media and surface saved files without a retained message. */
export function archiveMediaLists(
  content: HTMLElement,
  assets: ReadonlyMap<string, string>,
): HTMLElement[] {
  const doc = content.ownerDocument;
  const referenced = new Set<string>();
  for (const node of content.querySelectorAll(
    "img[src],a[href],audio[src],video[src]",
  )) {
    const url = node.getAttribute("src") ?? node.getAttribute("href") ?? "";
    if (assets.has(url)) referenced.add(url);
  }
  const extra = doc.createElement("section");
  extra.className = "archive-card archive-additional-files";
  const heading = doc.createElement("h2");
  heading.textContent = "Additional exported files";
  extra.append(heading);
  for (const [url, mime] of assets) {
    if (referenced.has(url)) continue;
    const paragraph = doc.createElement("p");
    const name = pathFilename(url);
    if (mime.startsWith("image/")) {
      const image = doc.createElement("img");
      image.setAttribute("src", url);
      image.alt = name;
      image.loading = "lazy";
      paragraph.append(image);
    } else {
      const link = doc.createElement("a");
      link.setAttribute("href", url);
      link.download = name;
      link.textContent = name;
      paragraph.append(link);
    }
    extra.append(paragraph);
  }
  if (extra.childElementCount > 1) content.append(extra);

  const illustrations: Entry[] = [];
  const imageLinks = new Set<Element>();
  for (const image of content.querySelectorAll<HTMLImageElement>("img[src]")) {
    const src = image.getAttribute("src")!;
    const link = image.closest("a");
    if (link?.getAttribute("href") === src) imageLinks.add(link);
    const media =
      link &&
      link.childElementCount === 1 &&
      image.parentElement === link &&
      !link.textContent?.trim()
        ? link
        : image;
    const adjacent = media.nextElementSibling;
    const inlineName = adjacent?.matches("code")
      ? adjacent.textContent?.trim()
      : "";
    const savedName = assets.has(src) ? pathFilename(src) : linkedFilename(src);
    const mime = /^data:(image\/[\w.+-]+);/i.exec(src)?.[1];
    const fallback = mime
      ? assetFilename(image.alt || "Image", mime)
      : safeFilename(image.alt || "Image");
    const name =
      savedName ||
      (inlineName && /^\d+-/.test(inlineName) ? inlineName : "") ||
      `${illustrations.length + 1}-${fallback}`;
    const id = `archive-illustration-${illustrations.length + 1}`;
    const figure = doc.createElement("span");
    figure.className = "archive-illustration";
    figure.id = id;
    figure.setAttribute("role", "figure");
    figure.setAttribute("aria-labelledby", id + "-caption");
    const caption = doc.createElement("span");
    caption.className = "archive-image-caption";
    caption.id = id + "-caption";
    const filename = doc.createElement("code");
    filename.textContent = name;
    caption.append(filename);
    media.before(figure);
    figure.append(media, caption);
    if (inlineName === name || inlineName === name.replaceAll("|", "\\|"))
      adjacent?.remove();
    illustrations.push({ id, name });
  }

  const attachments: Entry[] = [];
  const listed = new Set<string>();
  for (const link of content.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    if (imageLinks.has(link)) continue;
    const href = link.getAttribute("href")!;
    const name =
      link.getAttribute("download") ||
      (assets.has(href) ? pathFilename(href) : linkedFilename(href));
    if (!name || listed.has(href)) continue;
    listed.add(href);
    link.id ||= `archive-attachment-${attachments.length + 1}`;
    attachments.push({ id: link.id, name });
  }

  return [
    list("Illustrations", illustrations),
    list("Attachments", attachments),
  ];

  function list(title: string, entries: Entry[]): HTMLElement {
    const details = doc.createElement("details");
    details.className = "archive-media-list";
    details.open = entries.length > 0;
    const summary = doc.createElement("summary");
    const label = doc.createElement("span");
    label.textContent = title;
    const count = doc.createElement("small");
    count.textContent = String(entries.length);
    summary.append(label, count);
    details.append(summary);
    if (!entries.length) {
      const empty = doc.createElement("p");
      empty.className = "archive-media-empty";
      empty.textContent = "None in this export";
      details.append(empty);
      return details;
    }
    const items = doc.createElement("ol");
    for (const { id, name } of entries) {
      const item = doc.createElement("li");
      const link = doc.createElement("a");
      link.setAttribute("href", "#" + id);
      link.textContent = name;
      item.append(link);
      items.append(item);
    }
    details.append(items);
    return details;
  }
}
