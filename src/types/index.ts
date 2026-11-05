// SPDX-License-Identifier: MIT OR Apache-2.0
export type Capability =
  "supported" | "unsupported" | "unknown" | "requires_permission";
export interface PlatformCapabilities {
  discover: Capability;
  export: Capability;
  archive: Capability;
  delete: Capability;
}
export interface ConversationIdentifier {
  platform: string;
  id: string;
}
export interface Conversation extends ConversationIdentifier {
  title: string;
  url: string;
  status: "active" | "archived" | "unknown";
  updatedAt?: string;
  current: boolean;
  cached?: boolean;
  completeness: "partial" | "complete";
}
export type ConversationSelection = Set<string>;
export const conversationKey = (c: ConversationIdentifier): string =>
  `${c.platform}:${c.id}`;
export interface ExportOptions {
  images: boolean;
  links: boolean;
  metadata: boolean;
  source: boolean;
  outline: boolean;
  selection: boolean;
  title: boolean;
  timestamps: boolean;
  manifest: boolean;
  filename: string;
}
export interface PlatformAdapter {
  id: string;
  name: string;
  capabilities: PlatformCapabilities;
  discoverConversations(): Promise<Conversation[]>;
  getConversation(
    id: ConversationIdentifier,
    signal?: AbortSignal,
  ): Promise<Conversation>;
  exportConversation(
    id: ConversationIdentifier,
    options: ExportOptions,
    signal?: AbortSignal,
  ): Promise<string>;
  archiveConversation(
    id: ConversationIdentifier,
    signal?: AbortSignal,
  ): Promise<void>;
  deleteConversation(
    id: ConversationIdentifier,
    signal?: AbortSignal,
  ): Promise<void>;
  beginExportSession?(): () => Promise<void>;
  observe?(onChange: () => void): () => void;
}
export type OperationState =
  | "idle"
  | "scanning"
  | "ready"
  | "exporting"
  | "archiving"
  | "deleting"
  | "completed"
  | "partially_completed"
  | "failed"
  | "cancelled";
export type OperationKind = "export" | "archive" | "delete";
export interface BulkOperation {
  kind: OperationKind;
  conversations: Conversation[];
  stopOnError: boolean;
  delayMs: number;
  batchSize?: number;
}
export interface OperationResult {
  key: string;
  status: "success" | "failed" | "skipped";
  error?: string;
}
export interface OperationProgress {
  state: OperationState;
  kind?: OperationKind;
  current?: string;
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  results: OperationResult[];
  startedAt?: string;
}
