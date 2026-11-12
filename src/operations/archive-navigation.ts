// SPDX-License-Identifier: MIT OR Apache-2.0
export const archiveNavigationStyles = `
.archive-content{min-width:0}
.archive-layout:has(.archive-toc){display:grid;grid-template-columns:minmax(0,15rem) minmax(0,1fr);align-items:start;gap:1.5rem}
.archive-toc{position:sticky;top:1rem;min-width:0;padding:.45rem .75rem;background:Canvas;color:CanvasText;border:1px solid #8886;border-radius:.5rem;font-size:.85rem;line-height:1.45}
.archive-toc summary{cursor:pointer;font-weight:600}
.archive-toc ol{list-style:none;margin:.4rem 0 0;padding:.15rem;max-height:calc(100vh - 5rem);overflow:auto;overscroll-behavior:contain}
.archive-toc a{display:block;padding:.25rem .3rem;color:LinkText}
.archive-toc .archive-subheading{padding-inline-start:1rem}
.archive-content [id]{scroll-margin-top:1rem}
.archive-content [id]:target{outline:2px solid #4c8bdc;outline-offset:.2rem}
.archive-progress{display:none}
@supports (animation-timeline:scroll(root block)){
  .archive-progress{display:block;position:fixed;inset:0 0 auto;height:4px;background:#8884;z-index:2;pointer-events:none}
  .archive-progress span{display:block;height:100%;background:#4c8bdc;transform-origin:left;transform:scaleX(0);animation:archive-reading-progress 1ms linear both;animation-timeline:scroll(root block)}
  @keyframes archive-reading-progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}
}
@media(max-width:680px){
  .archive-layout:has(.archive-toc){display:block}
  .archive-toc{top:4px;z-index:1;margin-block:.65rem}
  .archive-toc ol{max-height:min(23vh,13rem)}
  .archive-content [id]{scroll-margin-top:3rem}
  .archive-layout:has(.archive-toc details[open]) .archive-content [id]{scroll-margin-top:calc(min(23vh,13rem) + 4rem)}
}
@media print{.archive-layout:has(.archive-toc){display:block}.archive-toc,.archive-progress{display:none}}
`;

/** Add generated navigation to a sanitized conversation tree. */
export function archiveNavigation(content: HTMLElement): HTMLElement {
  const doc = content.ownerDocument;
  const layout = doc.createElement("div");
  layout.className = "archive-layout";
  content.classList.add("archive-content");

  const progress = doc.createElement("div");
  progress.className = "archive-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.append(doc.createElement("span"));
  layout.append(progress);

  const headings = [...content.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(
    (heading) => heading.textContent?.trim(),
  );
  if (headings.length) {
    const nav = doc.createElement("nav");
    nav.className = "archive-toc";
    nav.setAttribute("aria-label", "Table of contents");
    const details = doc.createElement("details");
    details.open = true;
    const summary = doc.createElement("summary");
    summary.textContent = "Table of contents";
    const list = doc.createElement("ol");
    let turn = 0;
    headings.forEach((heading, index) => {
      heading.id = `archive-section-${index + 1}`;
      heading.setAttribute("tabindex", "-1");
      const title = heading.textContent!.replace(/\s+/g, " ").trim();
      const item = doc.createElement("li");
      const link = doc.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent =
        heading.tagName === "H2" && /^(User|Assistant|Message)$/.test(title)
          ? `${++turn}. ${title}`
          : title;
      if (/^H[3-6]$/.test(heading.tagName))
        item.className = "archive-subheading";
      item.append(link);
      list.append(item);
    });
    details.append(summary, list);
    nav.append(details);
    layout.append(nav);
  }
  layout.append(content);
  return layout;
}
