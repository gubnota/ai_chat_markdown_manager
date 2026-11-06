import { DOMAdapter } from "../base";
import { NativeActions } from "../base/native-actions";
import type { ConversationIdentifier } from "../../types";

export class ChatGPTAdapter extends DOMAdapter {
  private native: NativeActions;
  constructor(options: { timeoutMs?: number } = {}) {
    super({
      id: "chatgpt",
      currentPageFallback: false,
      autoLoad: true,
      name: /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
        ? "ChatGPT · local fixture"
        : "ChatGPT",
      path: /^\/c\/([\w-]+)\/?$/,
      sidebar:
        'nav a[href*="/c/"],aside a[href*="/c/"],[role="navigation"] a[href*="/c/"]',
    });
    this.native = new NativeActions(
      { platform: this.id, ...this.config, timeoutMs: options.timeoutMs },
      (id) => this.forget(id),
    );
    this.capabilities.archive = this.capabilities.delete = "unknown";
  }
  override async discoverConversations() {
    const items = await super.discoverConversations();
    this.capabilities.archive = this.capabilities.delete =
      this.native.available() ? "supported" : "unknown";
    return items;
  }
  override async archiveConversation(
    id: ConversationIdentifier,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.native.perform("archive", id, signal);
  }
  override async deleteConversation(
    id: ConversationIdentifier,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.native.perform("delete", id, signal);
  }
}
