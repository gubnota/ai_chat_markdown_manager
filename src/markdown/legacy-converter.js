/*
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

// Inherited converter kept as JavaScript to minimize changes; typed boundary in legacy.ts.
import { attachmentMarkdown, embeddedImageSource, inMessage } from "./attachments";

export function createConverter(options = {}) {
  const UI_ID = "__safari_md_export_root__";
  const config = { images:true, links:true, metadata:true, source:true, outline:false, selection:false, ...options };
  const isChatGPT = /(^|\.)(chatgpt\.com|chat\.openai\.com)$/i.test(location.hostname) || location.hostname === "127.0.0.1";
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
    const candidates = [el.getAttribute('data-src'), el.getAttribute('data-original'),
      el.currentSrc, el.getAttribute('src')];
    if (el.getAttribute('srcset')) candidates.push(el.getAttribute('srcset').split(',')[0].trim().split(/\s+/)[0]);
    const src = candidates.map(absoluteUrl).find(url => /^https?:/.test(url)) || embeddedImageSource(el);
    const alt = (el.getAttribute('alt') || el.getAttribute('aria-label') || '').replace(/[\[\]\n]/g, ' ').trim();
    if (!src) return inMessage(el) ? `Image: ${escapeText(alt || 'attachment')} — direct link unavailable.` : '';
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
    if (isHidden(el)) return '';
    if (el.matches('[data-md-export-ignore], [role="navigation"], [role="complementary"], [role="toolbar"], [role="menu"], [role="menubar"], [role="tooltip"], [role="status"], [data-testid="toast"]')) return '';
    const attachment = attachmentMarkdown(el, config, imageMarkdown);
    if (attachment !== undefined) return attachment;
    if (ignored.has(tag)) return '';
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
      if (!config.links) return '';
      const raw = el.currentSrc || el.getAttribute('src') || el.querySelector('source')?.getAttribute('src');
      const embedded = (config.format === 'html' || config.embedMedia) && /^(blob:|data:(?:audio|video)\/)/i.test(raw || '') ? raw : '';
      const url = absoluteUrl(raw) || embedded;
      return url ? `\n\n[${tag === 'VIDEO' ? 'Video' : 'Audio'}](${mdUrl(url)})\n\n` : ((config.format === 'html' || config.embedMedia) ? '\n\nAttachment: audio/video — direct link unavailable.\n\n' : '');
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


  return { extract, toMarkdown, cleanup };
}
