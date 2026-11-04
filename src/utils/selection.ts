import { conversationKey, type Conversation } from "../types";
export interface Filters {
  query: string;
  platform: string;
  status: string;
  days: number;
  sort: string;
}
export function filterConversations(
  items: Conversation[],
  filters: Filters,
): Conversation[] {
  const cutoff = Date.now() - filters.days * 86400000;
  return items
    .filter(
      (c) =>
        (!filters.query ||
          c.title
            .toLocaleLowerCase()
            .includes(filters.query.toLocaleLowerCase())) &&
        (filters.platform === "all" || c.platform === filters.platform) &&
        (filters.status === "all" || c.status === filters.status) &&
        (!filters.days ||
          (!!c.updatedAt && new Date(c.updatedAt).getTime() >= cutoff)),
    )
    .sort((a, b) =>
      filters.sort === "title"
        ? a.title.localeCompare(b.title)
        : filters.sort === "oldest"
          ? (a.updatedAt ?? "").localeCompare(b.updatedAt ?? "")
          : (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
    );
}
export function toggleSelection(
  selected: Set<string>,
  items: Conversation[],
  mode: "add" | "invert" | "clear",
): Set<string> {
  const next = new Set(selected);
  if (mode === "clear") return new Set();
  for (const item of items) {
    const key = conversationKey(item);
    if (mode === "invert" && next.has(key)) next.delete(key);
    else next.add(key);
  }
  return next;
}
