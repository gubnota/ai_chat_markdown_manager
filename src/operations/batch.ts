import {
  conversationKey,
  type BulkOperation,
  type Conversation,
  type OperationProgress,
} from "../types";
export const idleProgress = (): OperationProgress => ({
  state: "idle",
  total: 0,
  completed: 0,
  failed: 0,
  skipped: 0,
  results: [],
});
export class BatchRunner {
  private controller?: AbortController;
  get running(): boolean {
    return !!this.controller;
  }
  cancel(): void {
    this.controller?.abort();
  }
  async run(
    operation: BulkOperation,
    work: (conversation: Conversation, signal: AbortSignal) => Promise<void>,
    update: (p: OperationProgress) => void,
  ): Promise<OperationProgress> {
    if (this.controller) throw new Error("An operation is already running.");
    this.controller = new AbortController();
    const signal = this.controller.signal;
    const p: OperationProgress = {
      ...idleProgress(),
      kind: operation.kind,
      state:
        operation.kind === "export"
          ? "exporting"
          : operation.kind === "archive"
            ? "archiving"
            : "deleting",
      total: operation.conversations.length,
      startedAt: new Date().toISOString(),
    };
    const emit = () => update({ ...p, results: [...p.results] });
    emit();
    try {
      for (const c of operation.conversations) {
        if (signal.aborted) break;
        p.current = c.title;
        emit();
        try {
          await work(c, signal);
          p.completed++;
          p.results.push({ key: conversationKey(c), status: "success" });
        } catch (error) {
          if (signal.aborted) break;
          p.failed++;
          p.results.push({
            key: conversationKey(c),
            status: "failed",
            error: error instanceof Error ? error.message : "Operation failed",
          });
          if (operation.stopOnError) break;
        }
        emit();
        if (
          operation.delayMs > 0 &&
          !signal.aborted &&
          (p.completed + p.failed) % (operation.batchSize ?? 1) === 0
        )
          await new Promise<void>((resolve) => {
            const done = () => {
              clearTimeout(timer);
              signal.removeEventListener("abort", done);
              resolve();
            };
            const timer = setTimeout(done, operation.delayMs);
            signal.addEventListener("abort", done, { once: true });
          });
      }
      const done = new Set(p.results.map((r) => r.key));
      for (const c of operation.conversations)
        if (!done.has(conversationKey(c))) {
          p.skipped++;
          p.results.push({ key: conversationKey(c), status: "skipped" });
        }
      p.state = signal.aborted
        ? "cancelled"
        : p.failed || p.skipped
          ? p.completed
            ? "partially_completed"
            : "failed"
          : "completed";
      p.current = undefined;
      emit();
      return p;
    } finally {
      this.controller = undefined;
    }
  }
}
