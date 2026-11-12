// SPDX-License-Identifier: MIT OR Apache-2.0
import readerStyles from "./archive-reader.css?raw";
import readerScript from "./archive-reader.js?raw";

export { readerStyles, readerScript };

const headingTags = "h1,h2,h3,h4,h5,h6";
const roles = /^(User|Assistant|Message)$/;

export function archiveNavigation(
  content: HTMLElement,
  title: string,
  showTitle: boolean,
  showMetadata: boolean,
): HTMLElement {
  const doc = content.ownerDocument;
  const create = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    label?: string,
  ) => {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (label) element.textContent = label;
    return element;
  };
  const layout = create("div", "archive-layout");
  content.className = "archive-content";
  content.id = "archive-thread";

  const nav = create("nav", "archive-toc");
  nav.setAttribute("aria-label", "Table of contents");
  const details = create("details");
  details.open = true;
  const list = create("ol");
  const intro = create("section", "archive-card archive-intro");
  intro.append(create("p", "archive-eyebrow", "Conversation archive"));
  if (showTitle) intro.append(create("h1", "archive-title", title));
  const original = [...content.childNodes];
  const metadataBlock = showMetadata ? content.firstElementChild : null;
  content.prepend(intro);

  let section = intro;
  let turn = 0;
  for (const child of original) {
    if (
      child instanceof HTMLElement &&
      child.tagName === "H2" &&
      roles.test(child.textContent?.trim() || "")
    ) {
      turn++;
      section = create("article", "archive-card archive-turn");
      content.append(section);
      const number = create(
        "span",
        "archive-turn-number",
        String(turn).padStart(3, "0"),
      );
      number.setAttribute("aria-hidden", "true");
      child.append(number);
      child.classList.add("archive-role");
    }
    // Keep metadata available without filling the opening screen with YAML.
    if (
      child === metadataBlock &&
      metadataBlock.tagName === "PRE"
    ) {
      const metadata = create("details", "archive-metadata");
      metadata.append(create("summary", undefined, "Export details"), child);
      intro.append(metadata);
    } else section.append(child);
  }

  const headings = [...content.querySelectorAll(headingTags)].filter(
    (heading) => heading.textContent?.trim(),
  );
  let currentTurn = 0;
  for (const [index, heading] of headings.entries()) {
    heading.id = `archive-section-${index + 1}`;
    heading.setAttribute("tabindex", "-1");
    const role = heading.classList.contains("archive-role");
    const title = (role ? heading.firstChild?.textContent : heading.textContent)
      ?.replace(/\s+/g, " ")
      .trim();
    const item = create("li", role ? "archive-toc-turn" : "archive-subheading");
    const link = create(
      "a",
      undefined,
      role ? `${++currentTurn}. ${title}` : title,
    );
    link.href = `#${heading.id}`;
    item.append(link);
    list.append(item);
  }
  if (headings.length) {
    const summary = create("summary");
    summary.append(create("span", undefined, "Table of contents"));
    if (turn) summary.append(create("small", undefined, `${turn} turns`));
    details.append(summary, list);
    nav.append(details);
    layout.append(nav);
  }
  layout.append(content);
  return layout;
}

export const readerToolbar = `<header class="archive-toolbar">
  <div class="archive-progress" aria-hidden="true"><span></span></div>
  <div class="archive-toolbar-inner">
    <a class="archive-brand" href="#archive-top">Chat archive</a>
    <div class="archive-search" role="search" hidden>
      <label class="archive-sr-only" for="archive-query">Search this thread</label>
      <input id="archive-query" type="search" placeholder="Search this thread" autocomplete="off" spellcheck="false" maxlength="160" aria-controls="archive-results">
      <button type="button" class="archive-clear" hidden>Clear</button>
    </div>
  </div>
</header>
<section class="archive-results" id="archive-results" aria-labelledby="archive-results-title" hidden>
  <div class="archive-results-head">
    <div><h2 id="archive-results-title">Search results</h2><p class="archive-search-status" role="status"></p></div>
    <button type="button" class="archive-more" aria-controls="archive-result-list" aria-expanded="false" hidden>Expand all results</button>
  </div>
  <ol id="archive-result-list"></ol>
</section>
<dialog class="archive-image-viewer" aria-label="Expanded image">
  <div class="archive-viewer-bar"><p></p><button type="button" autofocus aria-label="Close image">✕</button></div>
  <div class="archive-image-stage"></div>
</dialog>`;
