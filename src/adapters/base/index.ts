import { captureChatGPTHistory } from "./chatgpt-history";
import { conversationTitle } from "./native-actions";
import { messageBody, messageNodes, navigateConversation } from "./navigation";
import { embedMarkdownMedia, needsEmbeddedMedia } from "../../markdown/media";
import { extractMarkdown } from "../../markdown/legacy";
import {
  type CaptureMedia,
  type Conversation,
  type ConversationIdentifier,
  type ExportOptions,
  type HistoryCapture,
  type MissingMedia,
  type PlatformAdapter,
  type PlatformCapabilities,
} from "../../types";
export interface AdapterConfig {
  id: string;
  name: string;
  path: RegExp;
  sidebar: string;
  currentPageFallback?: boolean;
  autoLoad?: boolean;
  loadTimeoutMs?: number;
}
export class DOMAdapter implements PlatformAdapter {
  readonly capabilities: PlatformCapabilities = {
    discover: "supported",
    export: "supported",
    archive: "unsupported",
    delete: "unsupported",
  };
  readonly id: string;
  readonly name: string;
  private mutated = new Set<string>();
  protected seen = new Map<string, Conversation>();
  // Explicit exports only; message snapshots never persist to storage.
  protected snapshots = new Map<string, { signature: string; body: string }>();
  protected config: AdapterConfig;
  constructor(config: AdapterConfig) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
  }
  protected identifier(url: string): string | undefined {
    try {
      const u = new URL(url, location.href);
      if (u.origin !== location.origin) return;
      return u.pathname.match(this.config.path)?.[1];
    } catch {
      return;
    }
  }
  protected currentId(): string {
    return (
      this.identifier(location.href) ??
      `page:${location.pathname}${location.search}`
    );
  }
  async discoverConversations(): Promise<Conversation[]> {
    const currentId = this.currentId();
    for (const link of document.querySelectorAll<HTMLAnchorElement>(
      this.config.sidebar,
    )) {
      const id = this.identifier(link.href);
      if (!id || this.mutated.has(id)) continue;
      const title = conversationTitle(link);
      if (!title) continue;
      this.seen.set(id, {
        platform: this.id,
        id,
        title: title.replace(/\s+/g, " ").trim(),
        url: link.href,
        status: "unknown",
        current: id === currentId,
        completeness: "partial",
      });
    }
    if (this.config.currentPageFallback === false) {
      for (const id of this.seen.keys()) {
        if (id.startsWith("page:")) {
          this.seen.delete(id);
          this.snapshots.delete(id);
        }
      }
    }
    if (
      !this.seen.has(currentId) &&
      !this.mutated.has(currentId) &&
      (this.identifier(location.href) ||
        this.config.currentPageFallback !== false)
    )
      this.seen.set(currentId, {
        platform: this.id,
        id: currentId,
        title:
          document.querySelector("main h1")?.textContent?.trim() ||
          document.title ||
          "Current conversation",
        url: location.href,
        status: "unknown",
        current: true,
        completeness: "partial",
      });
    for (const [id, c] of this.seen)
      this.seen.set(id, {
        ...c,
        current: id === currentId,
        cached: this.snapshots.has(id),
      });
    return [...this.seen.values()];
  }
  async getConversation(
    id: ConversationIdentifier,
    signal?: AbortSignal,
  ): Promise<Conversation> {
    signal?.throwIfAborted();
    if (id.platform !== this.id)
      throw new Error("Conversation belongs to another platform.");
    await this.discoverConversations();
    const c = this.seen.get(id.id);
    if (!c)
      throw new Error(
        "Conversation identity is unavailable. Rescan the sidebar.",
      );
    return c;
  }
  async exportConversation(
    id: ConversationIdentifier,
    options: ExportOptions,
    signal?: AbortSignal,
    missingMedia?: MissingMedia,
    captureMedia?: CaptureMedia,
    historyCapture?: HistoryCapture,
  ): Promise<string> {
    const c = await this.getConversation(id, signal);
    signal?.throwIfAborted();
    const signature = JSON.stringify([
      options.images,
      options.links,
      options.outline,
      needsEmbeddedMedia(options),
    ]);
    if (!c.current) {
      const snapshot = this.snapshots.get(c.id);
      if (!captureMedia && snapshot?.signature === signature) return snapshot.body;
      if (!this.config.autoLoad)
        throw new Error(
          snapshot
            ? "Export formatting changed. Open this conversation again to refresh its snapshot."
            : "Content is not loaded. Open this conversation in the current tab before exporting it.",
        );
      await navigateConversation(
        this.id,
        c.url,
        () => this.currentId() === c.id,
        signal,
        this.config.loadTimeoutMs,
      );
    }
    signal?.throwIfAborted();
    if (this.currentId() !== c.id)
      throw new Error(
        "Conversation changed before extraction. Retry the export.",
      );
    const checkConversation = () => {
      if (this.currentId() !== c.id)
        throw new Error("Conversation changed during media capture. Retry the export.");
    };
    if (captureMedia && this.id === "chatgpt") {
      const history = await captureChatGPTHistory(
        options,
        captureMedia,
        checkConversation,
        signal,
        missingMedia,
        historyCapture,
      );
      if (history !== undefined) return history;
    }
    const rawBody =
      messageBody(this.id, options) ??
      extractMarkdown({
        ...options,
        metadata: false,
        source: false,
        selection: false,
      });
    const nodes = messageNodes(this.id);
    const body = await (captureMedia ?? embedMarkdownMedia)(
      rawBody,
      nodes.length ? nodes : [document.querySelector("main") || document.body],
      options,
      signal,
      missingMedia,
    );
    checkConversation();
    if (captureMedia || missingMedia?.size) return body;
    this.snapshots.delete(c.id);
    this.snapshots.set(c.id, { signature, body });
    // Bound memory to 20 conversations and approximately 8 MiB of UTF-16 text.
    while (
      this.snapshots.size > 20 ||
      [...this.snapshots.values()].reduce((n, s) => n + s.body.length * 2, 0) >
        8 * 1024 * 1024
    ) {
      this.snapshots.delete(this.snapshots.keys().next().value!);
    }
    return body;
  }
  beginExportSession(): () => Promise<void> {
    const originalId = this.currentId();
    const originalUrl = location.href;
    return async () => {
      if (this.currentId() === originalId || !this.config.autoLoad) return;
      await navigateConversation(
        this.id,
        originalUrl,
        () => this.currentId() === originalId,
        undefined,
        this.config.loadTimeoutMs,
        !this.identifier(originalUrl),
      );
    };
  }
  async archiveConversation(
    _id: ConversationIdentifier,
    _signal?: AbortSignal,
  ): Promise<void> {
    throw new Error(
      "Native archiving is unsupported. Download a ZIP backup instead.",
    );
  }
  async deleteConversation(
    _id: ConversationIdentifier,
    _signal?: AbortSignal,
  ): Promise<void> {
    throw new Error(
      "Native deletion is unavailable until the platform controls are verified.",
    );
  }
  observe(onChange: () => void): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver((records) => {
      if (
        records.every((r) =>
          (r.target as Element).closest?.("#__safari_md_export_root__"),
        )
      )
        return;
      clearTimeout(timer);
      timer = setTimeout(onChange, 250);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "aria-current", "data-conversation-id"],
    });
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }
  forget(id: ConversationIdentifier): void {
    this.mutated.add(id.id);
    this.seen.delete(id.id);
    this.snapshots.delete(id.id);
  }
}
