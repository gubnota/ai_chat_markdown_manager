// ==UserScript==
// @name         Save Page as Markdown (Safari)
// @namespace    local.safari.markdown.export
// @version      1.2.0
// @description  Export supported AI-chat pages to Markdown. ChatGPT has turn-aware export; other chats use generic DOM extraction. Offline script.
// @author       Local adaptation of .MD this page (Adem Kouki, MIT)
// @license      MIT
// OpenAI
// @match        *://chatgpt.com/*
// @match        *://chat.openai.com/*
// Google
// @match        *://gemini.google.com/*
// @match        *://aistudio.google.com/*
// @match        *://notebooklm.google.com/*
// xAI
// @match        *://grok.com/*
// DeepSeek
// @match        *://chat.deepseek.com/*
// Anthropic
// @match        *://claude.ai/*
// Microsoft Copilot
// @match        *://copilot.microsoft.com/*
// @match        *://copilot.cloud.microsoft/*
// Mistral Vibe (formerly Le Chat)
// @match        *://chat.mistral.ai/*
// Perplexity
// @match        *://www.perplexity.ai/*
// @match        *://perplexity.ai/*
// Meta AI
// @match        *://www.meta.ai/*
// @match        *://meta.ai/*
// Poe
// @match        *://poe.com/*
// Qwen
// @match        *://chat.qwen.ai/*
// Kimi
// @match        *://www.kimi.com/*
// @match        *://kimi.com/*
// @match        *://kimi.moonshot.cn/*
// Z.ai / ChatGLM
// @match        *://chat.z.ai/*
// @match        *://chatglm.cn/*
// Doubao
// @match        *://www.doubao.com/chat*
// @match        *://doubao.com/chat*
// Tencent Yuanbao
// @match        *://yuanbao.tencent.com/*
// MiniMax
// @match        *://chat.minimax.io/*
// Duck.ai
// @match        *://duck.ai/*
// Pi
// @match        *://pi.ai/*
// Character.AI
// @match        *://character.ai/*
// @match        *://www.character.ai/*
// HuggingChat
// @match        *://huggingface.co/chat*
// OpenRouter
// @match        *://openrouter.ai/chat*
// Arena (formerly LMArena)
// @match        *://arena.ai/*
// @match        *://lmarena.ai/*
// T3 Chat
// @match        *://t3.chat/*
// You.com
// @match        *://you.com/*
// @match        *://www.you.com/*
// Phind
// @match        *://phind.com/*
// @match        *://www.phind.com/*
// Venice AI
// @match        *://venice.ai/*
// Blackbox AI
// @match        *://www.blackbox.ai/*
// @match        *://blackbox.ai/*
// Other official chat entry points
// @match        *://x.com/i/grok*
// @match        *://m365.cloud.microsoft/chat*
// @match        *://www.bing.com/chat*
// @match        *://chat.huggingface.co/*
// @match        *://legacy.lmarena.ai/*
// @match        *://hf.co/chat*
// @run-at       document-idle
// @grant        none
// @inject-into  content
// @noframes
// ==/UserScript==

/*
 * Safari userscript, standalone. Runs on the explicit AI-chat allowlist above.
 * To also export arbitrary websites, add the global wildcard @match shown in README.
 * Safari userscript, standalone. Install in Userscripts for Safari or
 * Tampermonkey for Safari. No GM_* APIs, imports, eval, or remote CDNs.
 *
 * Inspired by .MD this page v2.0.0, copyright (c) 2026 Adem Kouki.
 * Original project license (MIT):
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 * This is an independent DOM-to-Markdown implementation; it does not
 * bundle the extension's Defuddle library or require its build system.
 *
 * Shortcuts: Option + Shift + M to save; Option + Shift + E to show/hide the widget.
 * Drag the compact MD bubble or the expanded toolbar grip to reposition.
 * Click the MD bubble to expand; minimize (−) or dismiss (×) at any time.
 * Shift-click Save to export selected text only.
 */
(() => {
  'use strict';

  if (window.top !== window.self) return;
  if (document.getElementById('__safari_md_export_root__')) return;

  const UI_ID = '__safari_md_export_root__';
  const STORAGE_KEY = '__safari_md_export_settings_v1__';
  const DEFAULTS = {
    images: true,
    links: true,
    metadata: true,
    source: true,
    outline: false,
    selection: false
  };

  let config = { ...DEFAULTS };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    for (const key of Object.keys(DEFAULTS)) {
      if (typeof saved[key] === 'boolean') config[key] = saved[key];
    }
  } catch (_) { /* Storage may be blocked; defaults still work. */ }

  const isChatGPT = /(^|\.)(chatgpt\.com|chat\.openai\.com)$/i.test(location.hostname);
  const ignored = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'META', 'LINK',
    'IFRAME', 'CANVAS', 'SVG', 'FORM', 'INPUT', 'SELECT', 'TEXTAREA',
    'BUTTON', 'NAV', 'ASIDE', 'DIALOG'
  ]);

  const normalizeLineEndings = (value) => String(value || '').replace(/\r\n?/g, '\n');
  const squash = (value) => normalizeLineEndings(value)
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n');
  const cleanup = (value) => normalizeLineEndings(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const plainText = (element) => squash(element?.textContent || '').replace(/\s+/g, ' ').trim();
  const escapeText = (s) => squash(s).replace(/\\/g, '\\\\')
    .replace(/([`*_{}\[\]<>])/g, '\\$1')
    .replace(/^([ \t]*)([#>])/gm, '$1\\$2')
    .replace(/^([ \t]*)([-+*])(?=\s)/gm, '$1\\$2')
    .replace(/^([ \t]*)(\d+)(\.)(?=\s)/gm, '$1$2\\$3');
  const markdownInline = (s) => cleanup(s).replace(/\n+/g, ' ');

  const absoluteUrl = (raw) => {
    if (!raw) return '';
    try {
      const uri = new URL(raw.trim(), document.baseURI || location.href);
      return /^(https?:|mailto:|tel:)$/.test(uri.protocol) ? uri.href : '';
    } catch (_) { return ''; }
  };
  const mdUrl = (url) => url.replace(/\\/g, '%5C').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\s/g, '%20');
  const safeHeading = (s) => s.replace(/\n/g, ' ').trim();
  const isHidden = (el) => {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest('#' + UI_ID)) return true;
    if (el.hidden || el.hasAttribute('inert') || el.getAttribute('aria-hidden') === 'true') return true;
    const style = getComputedStyle(el);
    return style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse';
  };

  function imageMarkdown(el) {
    if (!config.images) return '';
    let raw = el.getAttribute('data-src') || el.getAttribute('data-original') ||
      el.getAttribute('src') || el.currentSrc || '';
    if (!raw && el.getAttribute('srcset')) raw = el.getAttribute('srcset').split(',')[0].trim().split(/\s+/)[0];
    const src = absoluteUrl(raw);
    if (!src || !/^https?:/.test(src)) return '';
    const alt = (el.getAttribute('alt') || el.getAttribute('aria-label') || '').replace(/[\[\]\n]/g, ' ').trim();
    return `![${alt}](${mdUrl(src)})`;
  }

  function mathMarkdown(el) {
    let tex = el.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
    tex ||= el.getAttribute('data-tex') || el.getAttribute('alttext');
    if (!tex) return '';
    const display = el.classList.contains('katex-display') ||
      el.closest('.katex-display, .MathJax_Display') || el.getAttribute('display') === 'block';
    return display ? `\n\n$$\n${tex.trim()}\n$$\n\n` : `$${tex.trim()}$`;
  }

  function codeFence(text, language) {
    const src = normalizeLineEndings(text).replace(/\n+$/g, '');
    const runs = src.match(/`+/g) || [];
    const count = Math.max(3, ...runs.map(s => s.length + 1));
    const ticks = '`'.repeat(count);
    return `\n\n${ticks}${(language || '').replace(/[^a-zA-Z0-9_+#.-]/g, '')}\n${src}\n${ticks}\n\n`;
  }
  function codeLanguage(el) {
    const code = el.querySelector('code') || el;
    const source = [code.className?.baseVal || code.className || '', el.className?.baseVal || el.className || '',
      code.getAttribute('data-language') || '', el.getAttribute('data-language') || ''].join(' ');
    return source.match(/(?:language-|lang-)([\w+#.-]+)/i)?.[1] ||
      code.getAttribute('data-language') || el.getAttribute('data-language') || '';
  }
  function inlineCode(s) {
    const src = normalizeLineEndings(s).replace(/\s*\n\s*/g, ' ').trim();
    if (!src) return '';
    const ticks = '`'.repeat(Math.max(1, ...(src.match(/`+/g) || []).map(x => x.length + 1)));
    return ticks + (src.startsWith('`') || src.endsWith('`') ? ' ' : '') + src +
      (src.startsWith('`') || src.endsWith('`') ? ' ' : '') + ticks;
  }

  function childrenToMarkdown(node, state) {
    return Array.from(node.childNodes).map(child => toMarkdown(child, state)).join('');
  }
  function listMarkdown(list, depth = 0) {
    const ordered = list.tagName === 'OL';
    let index = Number.parseInt(list.getAttribute('start') || '1', 10);
    if (!Number.isFinite(index)) index = 1;
    const lines = [];
    for (const li of list.children) {
      if (li.tagName !== 'LI' || isHidden(li)) continue;
      const nested = [];
      const nodes = Array.from(li.childNodes).filter(node => {
        if (node.nodeType === 1 && ['UL', 'OL'].includes(node.tagName)) {
          nested.push(node);
          return false;
        }
        return true;
      });
      const checkbox = li.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]');
      const checked = checkbox ? `[${checkbox.checked ? 'x' : ' '}] ` : '';
      const body = cleanup(nodes.map(n => toMarkdown(n, { inList: true })).join(''));
      const marker = ordered ? `${index++}. ` : '- ';
      const indent = '  '.repeat(depth);
      const bodyLines = body.split('\n');
      const firstLine = bodyLines.shift() || '';
      lines.push(indent + marker + checked + firstLine);
      for (const follow of bodyLines) lines.push(indent + ' '.repeat(marker.length) + follow);
      for (const nestedList of nested) lines.push(listMarkdown(nestedList, depth + 1).trimEnd());
    }
    return lines.join('\n') + '\n';
  }
  function tableMarkdown(table) {
    const rows = Array.from(table.querySelectorAll('tr')).filter(tr => tr.closest('table') === table && !isHidden(tr));
    if (!rows.length) return '';
    const matrix = rows.map(tr => Array.from(tr.children)
      .filter(c => c.matches('th,td') && !isHidden(c))
      .map(c => markdownInline(childrenToMarkdown(c, { inTable: true }))
        .replace(/\|/g, '\\|').replace(/\n/g, ' ').trim()));
    const cols = Math.max(...matrix.map(r => r.length), 0);
    if (!cols) return '';
    const row = values => '| ' + Array.from({ length: cols }, (_, i) => values[i] || '').join(' | ') + ' |';
    const header = matrix[0];
    const body = matrix.slice(1);
    return `\n\n${row(header)}\n${row(Array(cols).fill('---'))}` +
      (body.length ? '\n' + body.map(row).join('\n') : '') + '\n\n';
  }

  function toMarkdown(node, state = {}) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) return escapeText(node.nodeValue || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node;
    const tag = el.tagName;
    if (ignored.has(tag) || isHidden(el)) return '';
    if (el.matches('[data-md-export-ignore], [role="navigation"], [role="complementary"], [role="toolbar"], [role="menu"], [role="menubar"], [role="tooltip"], [role="status"], [data-testid="toast"]')) return '';
    if (tag === 'HEADER' && el.closest('body > header')) return '';
    if (tag === 'FOOTER' && !state.inTable) return '';

    if (tag === 'BR') return '\n';
    if (tag === 'HR') return '\n\n---\n\n';
    if (tag === 'IMG') return imageMarkdown(el);
    if (tag === 'PICTURE') {
      const img = el.querySelector('img');
      return img ? imageMarkdown(img) : '';
    }
    if (tag === 'MATH' || el.classList?.contains('katex') || el.classList?.contains('MathJax')) {
      const renderedMath = mathMarkdown(el);
      if (renderedMath) return renderedMath;
    }
    if (tag === 'PRE') {
      // Rich-text editors sometimes use PRE as a prose container.
      if (el.querySelector('p, h1, h2, h3, h4, h5, h6, table, ul, ol, blockquote')) {
        return childrenToMarkdown(el, state) + '\n\n';
      }
      const code = el.querySelector('code') || el;
      return codeFence(code.textContent || '', codeLanguage(el));
    }
    if (tag === 'CODE') return inlineCode(el.textContent || '');
    if (/^H[1-6]$/.test(tag)) {
      return `\n\n${'#'.repeat(Number(tag[1]))} ${safeHeading(markdownInline(childrenToMarkdown(el, state)))}\n\n`;
    }
    if (tag === 'A') {
      const content = markdownInline(childrenToMarkdown(el, state));
      const href = absoluteUrl(el.getAttribute('href'));
      if (!config.links || !href || !content) return content;
      if (/^!\[.*\]\(.+\)$/.test(content)) return `[${content}](${mdUrl(href)})`;
      return `[${content.replace(/\]/g, '\\]')}](${mdUrl(href)})`;
    }
    if (tag === 'STRONG' || tag === 'B') {
      const content = markdownInline(childrenToMarkdown(el, state));
      return content ? `**${content}**` : '';
    }
    if (tag === 'EM' || tag === 'I' || tag === 'CITE') {
      const content = markdownInline(childrenToMarkdown(el, state));
      return content ? `*${content}*` : '';
    }
    if (tag === 'DEL' || tag === 'S' || tag === 'STRIKE') {
      const content = markdownInline(childrenToMarkdown(el, state));
      return content ? `~~${content}~~` : '';
    }
    if (tag === 'SUP') return `<sup>${markdownInline(childrenToMarkdown(el, state))}</sup>`;
    if (tag === 'SUB') return `<sub>${markdownInline(childrenToMarkdown(el, state))}</sub>`;
    if (tag === 'BLOCKQUOTE') {
      const content = cleanup(childrenToMarkdown(el, state));
      return content ? '\n\n' + content.split('\n').map(line => '> ' + line).join('\n') + '\n\n' : '';
    }
    if (tag === 'UL' || tag === 'OL') return '\n' + listMarkdown(el).trimEnd() + '\n\n';
    if (tag === 'TABLE') return tableMarkdown(el);
    if (tag === 'LI') return childrenToMarkdown(el, state);
    if (tag === 'P') return '\n\n' + childrenToMarkdown(el, state).trim() + '\n\n';
    if (tag === 'FIGCAPTION') return '\n\n*' + markdownInline(childrenToMarkdown(el, state)) + '*\n\n';
    if (tag === 'DT') return '\n\n**' + markdownInline(childrenToMarkdown(el, state)) + '**\n';
    if (tag === 'DD') return '\n' + childrenToMarkdown(el, state) + '\n';
    if (tag === 'SUMMARY') return '\n\n**' + markdownInline(childrenToMarkdown(el, state)) + '**\n\n';
    if (tag === 'KBD') return inlineCode(el.textContent || '');
    if (tag === 'VIDEO' || tag === 'AUDIO') {
      const url = absoluteUrl(el.getAttribute('src') || el.querySelector('source')?.getAttribute('src'));
      return url ? `\n\n[${tag === 'VIDEO' ? 'Video' : 'Audio'}](${mdUrl(url)})\n\n` : '';
    }
    const content = childrenToMarkdown(el, state);
    if (['DIV', 'MAIN', 'SECTION', 'ARTICLE', 'FIGURE', 'DETAILS', 'DL', 'HEADER'].includes(tag)) {
      return state.inTable ? content : `\n\n${content}\n\n`;
    }
    return content;
  }

  function chatConversationMarkdown() {
    if (!isChatGPT) return '';
    let turns = Array.from(document.querySelectorAll('[data-testid^="conversation-turn-"]'));
    if (turns.length === 0) turns = Array.from(document.querySelectorAll('[data-message-author-role]'));
    turns = turns.filter(t => !turns.some(parent => parent !== t && parent.contains(t)) && !isHidden(t));
    const entries = [];
    for (const turn of turns) {
      const roleNode = turn.matches('[data-message-author-role]') ? turn : turn.querySelector('[data-message-author-role]');
      let role = (roleNode?.getAttribute('data-message-author-role') || turn.getAttribute('data-message-author-role') || '').toLowerCase();
      if (!['user', 'assistant', 'system', 'tool'].includes(role)) continue;
      let content = roleNode?.querySelector('.markdown, [data-testid="message-text"], [class*="whitespace-pre-wrap"]');
      if (!content) content = roleNode || turn;
      const md = cleanup(toMarkdown(content));
      if (!md) continue;
      const label = role === 'user' ? 'User' : role === 'assistant' ? 'Assistant' : role[0].toUpperCase() + role.slice(1);
      entries.push(`## ${label}\n\n${md}`);
    }
    return cleanup(entries.join('\n\n---\n\n'));
  }

  function chooseRoot() {
    const specific = Array.from(document.querySelectorAll(
      '[itemprop="articleBody"], article, main, [role="main"], .entry-content, .post-content'
    )).filter(el => !isHidden(el));
    // Prefer article content where substantial; otherwise keep entire <main>.
    const candidates = specific.map(el => ({ el, size: plainText(el).length })).filter(x => x.size >= 160);
    const main = candidates.find(x => x.el.matches('main, [role="main"]'));
    const articles = candidates.filter(x => x.el.matches('article, [itemprop="articleBody"], .entry-content, .post-content'));
    articles.sort((a, b) => b.size - a.size);
    if (articles.length && (!main || articles[0].size >= main.size * 0.38)) return articles[0].el;
    return main?.el || document.body || document.documentElement;
  }

  function selectedMarkdown() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return '';
    const container = document.createElement('div');
    for (let i = 0; i < selection.rangeCount; i++) container.appendChild(selection.getRangeAt(i).cloneContents());
    return cleanup(toMarkdown(container));
  }

  function extract(options = {}) {
    const selecting = options.selection ?? config.selection;
    let markdown = selecting ? selectedMarkdown() : '';
    if (selecting && !markdown) throw new Error('Select some text first, or disable Selection only.');
    if (!selecting) {
      markdown = chatConversationMarkdown();
      if (!markdown) markdown = cleanup(toMarkdown(chooseRoot()));
    }
    if (!markdown) throw new Error('No readable content found on this page.');
    const title = (document.title || document.querySelector('h1')?.textContent || 'Web page')
      .replace(/\s+[-|]\s+ChatGPT\s*$/i, '').trim();
    const parts = [];
    if (config.metadata) {
      parts.push(`# ${escapeText(title)}`);
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
      const author = document.querySelector('meta[name="author"]')?.getAttribute('content')?.trim();
      const date = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content')?.trim()
        || document.querySelector('time[datetime]')?.getAttribute('datetime')?.trim();
      if (author) parts.push(`**Author:** ${escapeText(author)}`);
      if (date) parts.push(`**Date:** ${escapeText(date)}`);
      if (description && !isChatGPT) parts.push(`**Description:** ${escapeText(description)}`);
    }
    if (config.source) parts.push(`**Source:** ${location.href}`);
    let out = parts.length ? parts.join('\n\n') + '\n\n---\n\n' : '';
    if (config.outline) {
      const headingLines = markdown.split('\n').filter(x => /^#{1,6}\s/.test(x));
      if (headingLines.length) {
        const outline = headingLines.map(x => {
          const depth = x.match(/^#+/)[0].length;
          return `${'  '.repeat(depth - 1)}- ${x.replace(/^#{1,6}\s*/, '')}`;
        }).join('\n');
        out += `## Page outline\n\n${outline}\n\n---\n\n`;
      }
    }
    return cleanup(out + markdown) + '\n';
  }

  function filename() {
    const title = (document.title || 'Web page').replace(/\s+[-|]\s+ChatGPT\s*$/i, '').trim();
    const stem = title.replace(/[\\/:*?"<>|\x00-\x1f]+/g, '_')
      .replace(/\s+/g, ' ').replace(/^[. ]+|[. ]+$/g, '').slice(0, 110) || 'page';
    return stem + '.md';
  }

  function saveMarkdown(options) {
    const markdown = extract(options);
    const name = filename();
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.setAttribute('data-md-export-ignore', '');
    anchor.style.cssText = 'position:fixed;left:-9999px;top:0';
    (document.body || document.documentElement).appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Safari can still be consuming the blob after the synthetic click.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return name;
  }

  async function copyMarkdown() {
    const markdown = extract();
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(markdown); return; } catch (_) { /* Fallback */ }
    }
    const textarea = document.createElement('textarea');
    textarea.value = markdown;
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('data-md-export-ignore', '');
    textarea.style.cssText = 'position:fixed;left:-99999px;top:0;opacity:0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    if (!ok) throw new Error('Clipboard blocked by Safari. Use Save .md instead.');
  }

  // Minimal floating toolbar. Defaults to a compact bubble on the LEFT side,
  // away from ChatGPT's composer. Shadow DOM isolates all UI styles.
  const POSITION_KEY = '__safari_md_export_position_v1__';
  const host = document.createElement('div');
  host.id = UI_ID;
  host.setAttribute('data-md-export-ignore', '');
  host.style.cssText = 'all:initial;display:block;position:fixed;left:14px;top:40vh;width:43px;height:43px;z-index:2147483646;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; color-scheme: light; }
    *, *::before, *::after { box-sizing: border-box; }
    [hidden] { display: none !important; }
    button { -webkit-appearance:none; appearance:none; border:0; cursor:pointer;
      color:#1a2939; font:600 12px/1.3 -apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif; }
    button:focus-visible { outline:2px solid #2878c4; outline-offset:2px; }
    .bubble { display:flex; align-items:center; justify-content:center; width:43px;height:43px;
      border-radius:50%;border:1px solid #b3c3d5;box-shadow:0 3px 13px #0003;
      background:#173b65;color:#fff;cursor:grab;touch-action:none;user-select:none;
      -webkit-user-select:none;letter-spacing:.2px; }
    .bubble:hover { background:#245988; }
    .bar { position:absolute;left:0;top:0;display:flex;align-items:center;gap:4px;padding:5px;
      width:max-content;max-width:calc(100vw - 16px);flex-wrap:wrap;
      border:1px solid #c9d3e0;border-radius:13px;background:#fff;
      box-shadow:0 5px 20px #0003;white-space:nowrap; }
    .bar button { padding:8px 10px;border-radius:8px;background:#eff2f6; }
    .bar button:hover { background:#dde5ee; }
    .bar .primary { background:#173b65;color:#fff; }
    .bar .primary:hover { background:#245988; }
    .bar .grip { padding:8px 7px;min-width:22px;color:#647487;
      font-size:15px;background:transparent;cursor:grab;touch-action:none;user-select:none;
      -webkit-user-select:none; }
    .grip:active, .bubble:active { cursor:grabbing; }
    .bar .compact { padding:8px 7px;min-width:26px; }
    .bar .close { background:#fff;color:#536170; }
    .bar .close:hover { background:#fbe7e7;color:#a82c2c; }
    .panel { position:absolute;left:0;top:calc(100% + 8px);width:235px;
      border:1px solid #c9d3e0;border-radius:12px;background:#fff;color:#17212d;
      box-shadow:0 6px 24px #0003;padding:12px;overflow-y:auto;
      font:12px/1.4 -apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif; }
    .panel.above { top:auto;bottom:calc(100% + 8px); }
    .panel.right { left:auto;right:0; }
    .heading { font-weight:700;margin:0 0 8px;font-size:12px; }
    label { display:flex;align-items:center;gap:8px;margin:8px 0;cursor:pointer;white-space:nowrap; }
    input { accent-color:#183c65;width:15px;height:15px;margin:0; }
    .hint { margin:9px 0 0;color:#596674;font-size:11px; }
    .toast { position:absolute;left:0;bottom:calc(100% + 8px);min-width:190px;
      max-width:min(310px,90vw);color:#fff;background:#17212d;border-radius:8px;
      padding:9px 12px;box-shadow:0 4px 16px #0003;
      font:12px/1.4 -apple-system,sans-serif;overflow-wrap:anywhere; }
    .toast.below { bottom:auto;top:calc(100% + 8px); }
  `;
  shadow.appendChild(style);

  const bubble = document.createElement('button');
  bubble.className = 'bubble';
  bubble.type = 'button';
  bubble.textContent = 'MD';
  bubble.setAttribute('aria-label', 'Open Markdown exporter; drag to move');
  bubble.title = 'Click to open. Drag to move. Option + Shift + E to show/hide.';

  const bar = document.createElement('div');
  bar.className = 'bar';
  bar.hidden = true;
  function actionButton(label, title, className = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.textContent = label;
    btn.title = title;
    btn.setAttribute('aria-label', title);
    return btn;
  }
  const grip = actionButton('⋮⋮', 'Drag toolbar to move', 'grip');
  const saveBtn = actionButton('↓ Save .md', 'Download Markdown (Option + Shift + M); Shift-click for selection', 'primary');
  const copyBtn = actionButton('Copy', 'Copy Markdown to clipboard');
  const optionsBtn = actionButton('⚙', 'Export options', 'compact');
  const minimizeBtn = actionButton('−', 'Minimize to MD bubble', 'compact');
  const closeBtn = actionButton('×', 'Dismiss widget (Option + Shift + E to restore)', 'compact close');
  bar.append(grip, saveBtn, copyBtn, optionsBtn, minimizeBtn, closeBtn);

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.hidden = true;
  const heading = document.createElement('div');
  heading.className = 'heading';
  heading.textContent = 'Markdown export';
  panel.appendChild(heading);
  const options = [
    ['images', 'Keep images'],
    ['links', 'Keep links'],
    ['metadata', 'Page title / metadata'],
    ['source', 'Source URL'],
    ['outline', 'Heading outline'],
    ['selection', 'Selection only']
  ];
  for (const [key, labelText] of options) {
    const row = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = config[key];
    input.addEventListener('change', () => {
      config[key] = input.checked;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch (_) { }
    });
    const label = document.createElement('span');
    label.textContent = labelText;
    row.append(input, label);
    panel.appendChild(row);
  }
  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = 'Exports content currently loaded in this tab. Everything stays on your device.';
  panel.appendChild(hint);
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  shadow.append(bubble, bar, panel, toast);
  (document.body || document.documentElement).appendChild(host);

  let expanded = false;
  let dismissed = false;
  let position = { x: 14, y: Math.round(window.innerHeight * 0.40) };
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || 'null');
    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
      position = { x: saved.x, y: saved.y };
    }
  } catch (_) { /* No persistent storage needed. */ }
  const clamp = (value, low, high) => Math.max(low, Math.min(value, Math.max(low, high)));
  const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

  // Protect the ChatGPT composer Send/Submit button from overlay.
  function sendButtonRects() {
    if (!isChatGPT) return [];
    const selectors = [
      '#composer-submit-button',
      '[data-testid="send-button"]',
      '[data-testid="composer-send-button"]',
      '[data-testid="composer-submit-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="Send message"]',
      'button[aria-label="Send"]',
      'form button[type="submit"]'
    ];
    const rects = [];
    for (const el of document.querySelectorAll(selectors.join(','))) {
      if (el.closest('#' + UI_ID)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 12 || r.height < 12 || getComputedStyle(el).display === 'none') continue;
      rects.push({ left: r.left - 14, right: r.right + 14, top: r.top - 14, bottom: r.bottom + 14 });
    }
    return rects;
  }
  // The host is ALWAYS exactly 43x43, regardless of whether the menu is open.
  // position is the FAB's top-left anchor, never the expanded menu's top-left.
  // This prevents the compact bubble from drifting when the wider menu closes.
  const FAB_SIZE = 43;
  function safePosition(rawX, rawY) {
    const w = FAB_SIZE;
    const h = FAB_SIZE;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = clamp(rawX, 8, vw - w - 8);
    let y = clamp(rawY, 8, vh - h - 8);
    for (const reserved of sendButtonRects()) {
      const a = { left: x, right: x + w, top: y, bottom: y + h };
      if (!intersects(a, reserved)) continue;
      const candidates = [
        [x, reserved.top - h - 8],
        [reserved.left - w - 8, y],
        [reserved.right + 8, y],
        [x, reserved.bottom + 8]
      ].filter(([cx, cy]) => cx >= 8 && cy >= 8 && cx + w <= vw - 8 && cy + h <= vh - 8);
      const free = candidates.filter(([cx, cy]) =>
        !intersects({ left:cx, right:cx+w, top:cy, bottom:cy+h }, reserved));
      if (free.length) {
        free.sort((p, q) => Math.hypot(p[0] - x, p[1] - y) - Math.hypot(q[0] - x, q[1] - y));
        [x, y] = free[0];
      } else {
        x = 12;
        y = clamp(vh * 0.4, 8, vh - h - 8);
      }
    }
    return { x, y };
  }

  // Only the flyout moves to fit the viewport. The FAB anchor NEVER moves as
  // a consequence of opening/closing the menu or its settings panel.
  function layoutFlyout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let menuX = position.x;
    let menuY = position.y;
    let menuWidth = FAB_SIZE;
    let menuHeight = FAB_SIZE;
    if (expanded) {
      menuWidth = bar.offsetWidth || FAB_SIZE;
      menuHeight = bar.offsetHeight || FAB_SIZE;
      const xLeft = position.x;
      const xRight = position.x + FAB_SIZE - menuWidth;
      const ySame = position.y;
      const yBottom = position.y + FAB_SIZE - menuHeight;
      const yAbove = position.y - menuHeight - 8;
      const yBelow = position.y + FAB_SIZE + 8;
      const xs = position.x + FAB_SIZE / 2 > vw / 2 ? [xRight, xLeft] : [xLeft, xRight];
      const ys = [ySame, yBottom, yAbove, yBelow];
      const buttons = sendButtonRects();
      const candidates = [];
      for (const candidateX of xs) {
        for (const candidateY of ys) {
          const x = clamp(candidateX, 8, vw - menuWidth - 8);
          const y = clamp(candidateY, 8, vh - menuHeight - 8);
          if (candidates.some(c => c.x === x && c.y === y)) continue;
          const rect = { left:x, right:x + menuWidth, top:y, bottom:y + menuHeight };
          const collisions = buttons.filter(button => intersects(rect, button)).length;
          candidates.push({ x, y, collisions });
        }
      }
      // Candidates preserve the FAB's preferred side unless a collision with
      // the composer Send button or viewport makes another placement safer.
      const best = candidates.find(c => c.collisions === 0) || candidates[0];
      if (best) { menuX = best.x; menuY = best.y; }
      bar.style.left = Math.round(menuX - position.x) + 'px';
      bar.style.top = Math.round(menuY - position.y) + 'px';
    }

    // The options panel is anchored to the visible toolbar, not to the fixed
    // 43px FAB box. Its position never feeds back into the FAB anchor.
    const panelW = 235;
    const panelLeft = clamp(menuX, 8, vw - panelW - 8);
    const belowY = menuY + menuHeight + 8;
    const aboveRoom = menuY - 8;
    const belowRoom = vh - belowY - 8;
    const showAbove = belowRoom < 255 && aboveRoom > belowRoom;
    panel.classList.remove('above', 'right');
    panel.style.left = Math.round(panelLeft - position.x) + 'px';
    panel.style.right = 'auto';
    panel.style.top = showAbove ? 'auto' : Math.round(belowY - position.y) + 'px';
    panel.style.bottom = showAbove ? Math.round(position.y + FAB_SIZE - (menuY - 8)) + 'px' : 'auto';
    panel.style.maxHeight = Math.max(40, showAbove ? aboveRoom - 8 : belowRoom) + 'px';

    const toastW = Math.min(310, Math.max(190, toast.offsetWidth || 190));
    const toastLeft = clamp(position.x, 8, vw - toastW - 8);
    toast.style.left = Math.round(toastLeft - position.x) + 'px';
    toast.classList.toggle('below', position.y < 60);
  }
  function place(x, y, persist = false) {
    position = safePosition(x, y);
    host.style.left = position.x + 'px';
    host.style.top = position.y + 'px';
    if (persist) {
      try { localStorage.setItem(POSITION_KEY, JSON.stringify(position)); } catch (_) { }
    }
    layoutFlyout();
  }
  function setExpanded(value) {
    expanded = value;
    bubble.hidden = value;
    bar.hidden = !value;
    if (!value) panel.hidden = true;
    layoutFlyout(); // Never re-clamp/mutate the FAB anchor on toggle.
  }
  function setDismissed(value) {
    dismissed = value;
    host.style.display = value ? 'none' : 'block';
    if (!value) {
      setExpanded(false);
      layoutFlyout();
    }
  }

  // Pointer capture makes dragging reliable even when the cursor exits the handle.
  function makeDraggable(handle, clickWhenStill = null) {
    let drag = null;
    handle.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      drag = { id:event.pointerId, startX:event.clientX, startY:event.clientY,
        x:position.x, y:position.y, moved:false };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.hypot(dx, dy) > 4) drag.moved = true;
      if (drag.moved) place(drag.x + dx, drag.y + dy);
    });
    handle.addEventListener('pointerup', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const wasMoved = drag.moved;
      drag = null;
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      if (wasMoved) place(position.x, position.y, true);
      else if (clickWhenStill) clickWhenStill();
    });
    handle.addEventListener('pointercancel', () => { drag = null; });
    // Keyboard activation is a synthetic click without pointer interaction.
    if (clickWhenStill) handle.addEventListener('click', event => {
      if (event.detail === 0) clickWhenStill();
    });
  }
  makeDraggable(bubble, () => setExpanded(true));
  makeDraggable(grip);
  minimizeBtn.addEventListener('click', () => setExpanded(false));
  closeBtn.addEventListener('click', () => setDismissed(true));
  optionsBtn.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) layoutFlyout();
  });
  document.addEventListener('pointerdown', event => {
    if (!panel.hidden && !event.composedPath().includes(host)) panel.hidden = true;
  });
  window.addEventListener('resize', () => place(position.x, position.y));
  place(position.x, position.y);

  let toastTimer = null;
  function notify(message) {
    toast.textContent = message;
    toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3800);
  }
  function runSave(selection = undefined) {
    try {
      const name = saveMarkdown({ selection });
      if (expanded) setExpanded(false);
      if (!dismissed) notify('Download requested: ' + name);
    } catch (error) { if (!dismissed) notify(error?.message || String(error)); }
  }
  saveBtn.addEventListener('click', event => runSave(event.shiftKey ? true : undefined));
  copyBtn.addEventListener('click', () => {
    copyMarkdown().then(() => {
      if (expanded) setExpanded(false);
      if (!dismissed) notify('Markdown copied to clipboard.');
    }).catch(error => { if (!dismissed) notify(error?.message || String(error)); });
  });
  document.addEventListener('keydown', event => {
    if (!(event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey)) return;
    if (event.repeat) return;
    const active = document.activeElement;
    if (active?.matches('input, textarea, select, [contenteditable], [role="textbox"]') || active?.isContentEditable) return;
    if (event.code === 'KeyE') {
      event.preventDefault();
      setDismissed(!dismissed);
    } else if (event.code === 'KeyM') {
      event.preventDefault();
      runSave();
    }
  });
})();
