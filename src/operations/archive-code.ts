// SPDX-License-Identifier: MIT OR Apache-2.0
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const highlighter = hljs.newInstance();
for (const [name, grammar] of Object.entries({
  bash,
  cpp,
  csharp,
  css,
  diff,
  go,
  java,
  javascript,
  json,
  python,
  ruby,
  rust,
  sql,
  typescript,
  xml,
  yaml,
}))
  highlighter.registerLanguage(name, grammar);

const detectable = [
  "bash",
  "css",
  "javascript",
  "json",
  "python",
  "sql",
  "xml",
  "yaml",
];
const plainText = /^(?:text|txt|plain|plaintext|nohighlight)$/i;

export function styleArchiveCodeBlocks(content: HTMLElement): void {
  const doc = content.ownerDocument;
  for (const code of content.querySelectorAll<HTMLElement>("pre > code")) {
    if (code.closest(".archive-metadata,.archive-code-block")) continue;
    const pre = code.parentElement!;
    const language = [...code.classList]
      .find((name) => name.startsWith("language-"))
      ?.slice("language-".length);
    const source = code.textContent || "";
    const grammar = language && highlighter.getLanguage(language);
    // Bound work on large snippets and try only a small set for unlabelled code.
    const result =
      grammar && language && source.length <= 50_000
        ? highlighter.highlight(source, { language, ignoreIllegals: true })
        : !language && source.length <= 8_000
          ? highlighter.highlightAuto(source, detectable)
          : undefined;
    if (result?.language && (grammar || result.relevance >= 2))
      code.innerHTML = result.value;

    const block = doc.createElement("div");
    block.className = "archive-code-block";
    const toolbar = doc.createElement("div");
    toolbar.className = "archive-code-toolbar";
    const label = doc.createElement("span");
    label.textContent =
      (grammar && grammar.name) ||
      (result?.language &&
        result.relevance >= 2 &&
        highlighter.getLanguage(result.language)?.name) ||
      (language && !plainText.test(language) && language) ||
      "Code";
    const copy = doc.createElement("button");
    copy.type = "button";
    copy.className = "archive-code-copy";
    copy.textContent = "Copy";
    copy.setAttribute("aria-live", "polite");
    copy.hidden = true;
    toolbar.append(label, copy);
    pre.before(block);
    block.append(toolbar, pre);
  }
}
