import { DOMAdapter } from "../base";
import { NativeActions } from "../base/native-actions";
import type { ConversationIdentifier } from "../../types";
export { waitFor } from "../base/native-actions";

export class GeminiAdapter extends DOMAdapter {
  private native: NativeActions;
  constructor(
    private verification: { nativeDelete: boolean; timeoutMs?: number } = {
      nativeDelete: true,
    },
  ) {
    super({
      id: "gemini",
      currentPageFallback: false,
      autoLoad: true,
      name: "Google Gemini",
      path: /^\/app\/([\w-]+)\/?$/,
      sidebar: 'a[href*="/app/"], [role="navigation"] a[href], nav a[href]',
    });
    this.native = new NativeActions(
      { platform: this.id, ...this.config, timeoutMs: verification.timeoutMs },
      (id) => this.forget(id),
    );
    this.capabilities.delete = "unknown";
  }
  override async discoverConversations() {
    const items = await super.discoverConversations();
    this.capabilities.delete =
      this.verification.nativeDelete && this.native.available()
        ? "supported"
        : "unknown";
    return items;
  }
  override async deleteConversation(
    id: ConversationIdentifier,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!this.verification.nativeDelete)
      throw new Error("Gemini deletion is disabled for this adapter.");
    await this.native.perform("delete", id, signal);
  }
}
