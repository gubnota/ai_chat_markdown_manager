// SPDX-License-Identifier: MIT OR Apache-2.0
/* global document, window, navigator, NodeFilter, requestAnimationFrame, getComputedStyle, clearTimeout, setTimeout, CSS, ResizeObserver */
(() => {
  const thread = document.querySelector("#archive-thread");
  const search = document.querySelector(".archive-search");
  const input = document.querySelector("#archive-query");
  const clear = document.querySelector(".archive-clear");
  const results = document.querySelector("#archive-results");
  const resultList = document.querySelector("#archive-result-list");
  const status = document.querySelector(".archive-search-status");
  const more = document.querySelector(".archive-more");
  const previewCount = 8;
  let index, timer;
  let snippets = [];
  let expanded = false;
  let count = 0;

  function buildIndex() {
    const walker = document.createTreeWalker(thread, NodeFilter.SHOW_TEXT);
    const entries = [];
    const blocks =
      "p,h1,h2,h3,h4,h5,h6,pre,li,td,th,blockquote,article,section";
    let entry;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (parent.closest(".archive-turn-number,.archive-metadata,.archive-code-toolbar")) continue;
      const block = parent.closest(blocks) || thread;
      if (block !== entry?.block) {
        const role = block
          .closest(".archive-turn")
          ?.querySelector(".archive-role");
        entry = {
          block,
          text: "",
          nodes: [],
          label: role
            ? role.firstChild.textContent.trim() +
              " · " +
              role.lastChild.textContent
            : "Thread overview",
        };
        entries.push(entry);
      }
      entry.nodes.push({ node, offset: entry.text.length });
      entry.text += node.data;
    }
    return entries.filter((item) => item.text.trim());
  }

  function sliceStart(text, offset) {
    if (offset <= 75) return 0;
    const edge = text.slice(offset - 75, offset - 30).search(/\s/);
    return offset - 75 + (edge < 0 ? 0 : edge + 1);
  }

  function sliceEnd(text, offset) {
    if (text.length - offset <= 85) return text.length;
    const edge = text.slice(offset + 45, offset + 85).search(/\s/);
    return offset + (edge < 0 ? 85 : 45 + edge);
  }

  function render() {
    const shown = expanded ? snippets : snippets.slice(0, previewCount);
    more.hidden = snippets.length <= previewCount;
    more.textContent = expanded ? "Collapse results" : "Expand all results";
    more.setAttribute("aria-expanded", String(expanded));
    status.textContent = count
      ? count.toLocaleString() +
        (count === 1 ? " match" : " matches") +
        (shown.length < snippets.length
          ? " · showing " + shown.length + " of " + snippets.length + " results"
          : "")
      : "No matches found.";
    const fragment = document.createDocumentFragment();
    for (const { entry, spans, start, end } of shown) {
      const item = document.createElement("li");
      item.className = "archive-result";
      const link = document.createElement("a");
      link.href = "#" + entry.block.id;
      const label = document.createElement("span");
      label.className = "archive-result-label";
      label.textContent = entry.label;
      const context = document.createElement("span");
      context.className = "archive-result-snippet";
      let position = start;
      if (start) context.append("…");
      for (const [from, to] of spans) {
        const mark = document.createElement("mark");
        mark.textContent = entry.text.slice(from, to);
        context.append(entry.text.slice(position, from), mark);
        position = to;
      }
      context.append(
        entry.text.slice(position, end),
        end < entry.text.length ? "…" : "",
      );
      link.append(label, context);
      link.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        // Let the fragment update, then align the actual occurrence inside long blocks.
        requestAnimationFrame(() => {
          const from = spans[0][0];
          let index = entry.nodes.length - 1;
          while (index >= 0 && entry.nodes[index].offset > from) index--;
          const target = entry.nodes[index];
          if (!target) return;
          const range = document.createRange();
          range.setStart(target.node, from - target.offset);
          range.setEnd(
            target.node,
            Math.min(target.node.length, from - target.offset + 1),
          );
          const rect = range.getBoundingClientRect();
          const margin =
            parseFloat(getComputedStyle(entry.block).scrollMarginTop) || 0;
          if (rect.height)
            window.scrollTo(0, window.scrollY + rect.top - margin);
        });
      });
      item.append(link);
      fragment.append(item);
    }
    resultList.replaceChildren(fragment);
  }

  function find() {
    const query = input.value.trim().slice(0, input.maxLength);
    clear.hidden = !input.value;
    results.hidden = !query;
    snippets = [];
    count = 0;
    expanded = false;
    if (!query) {
      resultList.replaceChildren();
      status.textContent = "";
      return;
    }
    const pattern = query
      .split(/\s+/)
      .map((word) => word.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&"))
      .join("\\s+");
    const regex = new RegExp(pattern, "giu");
    index ||= buildIndex();
    for (const [number, entry] of index.entries()) {
      let snippet;
      for (const match of entry.text.matchAll(regex)) {
        const from = match.index;
        const to = from + match[0].length;
        count++;
        if (snippet && from <= snippet.end && to - snippet.start <= 220) {
          snippet.spans.push([from, to]);
          snippet.end = sliceEnd(entry.text, to);
        } else {
          if (!entry.block.id) entry.block.id = "archive-match-block-" + number;
          snippet = {
            entry,
            spans: [[from, to]],
            start: sliceStart(entry.text, from),
            end: sliceEnd(entry.text, to),
          };
          snippets.push(snippet);
        }
      }
    }
    render();
    window.scrollTo(0, 0);
  }

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(find, 100);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && input.value) clear.click();
    if (event.key === "Enter") {
      clearTimeout(timer);
      find();
      resultList.querySelector("a")?.focus();
    }
  });
  clear.addEventListener("click", () => {
    input.value = "";
    clearTimeout(timer);
    find();
    input.focus();
  });
  more.addEventListener("click", () => {
    expanded = !expanded;
    render();
  });
  search.hidden = false;

  async function copyCode(code, button) {
    try {
      await navigator.clipboard.writeText(code.textContent);
      return true;
    } catch {
      // Some browsers restrict the Clipboard API on local files.
      const field = document.createElement("textarea");
      field.className = "archive-clipboard";
      field.value = code.textContent;
      document.body.append(field);
      field.focus({ preventScroll: true });
      field.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch {
        // Selecting the code still permits manual copying.
      } finally {
        field.remove();
        button.focus({ preventScroll: true });
      }
      if (!copied) window.getSelection()?.selectAllChildren(code);
      return copied;
    }
  }

  for (const button of thread.querySelectorAll(".archive-code-copy")) {
    const code = button.closest(".archive-code-block").querySelector("pre > code");
    let reset;
    button.hidden = false;
    button.addEventListener("click", async () => {
      const copied = await copyCode(code, button);
      clearTimeout(reset);
      button.textContent = copied ? "Copied" : "Copy manually";
      reset = setTimeout(() => { button.textContent = "Copy"; }, 2400);
    });
  }

  const sidebar = document.querySelector(".archive-toc");
  if (sidebar && typeof ResizeObserver === "function") {
    new ResizeObserver(() => {
      document.documentElement.style.setProperty(
        "--archive-mobile-nav",
        sidebar.offsetHeight + "px",
      );
    }).observe(sidebar);
  }

  const dialog = document.querySelector(".archive-image-viewer");
  if (typeof dialog.showModal === "function") {
    const stage = dialog.querySelector(".archive-image-stage");
    const caption = dialog.querySelector("p");
    for (const image of thread.querySelectorAll("img[src]")) {
      const link = image.closest("a");
      const filename = image.closest(".archive-illustration")
        ?.querySelector(".archive-image-caption")?.textContent;
      const name = filename || image.alt || "Image";
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", "Expand image: " + name);
      if (link) {
        button.className = "archive-zoom-link";
        button.textContent = "Expand image";
        link.after(button);
        image.classList.add("archive-linked-image");
        image.addEventListener("click", (event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
          event.preventDefault();
          button.focus({ preventScroll: true });
          button.click();
        });
      } else {
        button.className = "archive-image-trigger";
        image.before(button);
        button.append(image);
      }
      button.addEventListener("click", () => {
        const expandedImage = document.createElement("img");
        expandedImage.alt = image.alt || name;
        expandedImage.src = image.getAttribute("src");
        caption.textContent = name;
        stage.replaceChildren(expandedImage);
        if (!dialog.open) dialog.showModal();
      });
    }
    dialog
      .querySelector("button")
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    });
    dialog.addEventListener("close", () => stage.replaceChildren());
  }

  if (!CSS.supports("animation-timeline:scroll(root block)")) {
    const progress = document.querySelector(".archive-progress span");
    const refresh = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty(
        "--archive-progress",
        height > 0 ? Math.max(0, Math.min(1, window.scrollY / height)) : 0,
      );
    };
    window.addEventListener("scroll", refresh, { passive: true });
    window.addEventListener("resize", refresh);
    new ResizeObserver(refresh).observe(document.body);
    refresh();
  }
})();
