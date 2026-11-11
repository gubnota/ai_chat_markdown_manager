import { useEffect, useRef, useState } from "react";
import {
  Search,
  MoreHorizontal,
  Download,
  Archive,
  Trash2,
  Eye,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  conversationKey,
  type Conversation,
  type PlatformCapabilities,
  type OperationKind,
} from "../types";
import {
  filterConversations,
  toggleSelection,
  type Filters,
} from "../utils/selection";
import { IconButton } from "./primitives";
import { Dropdown } from "./FormatSelect";
export function Conversations({
  items,
  selected,
  onSelection,
  onPreview,
  onAction,
  onScan,
  capabilities,
  busy,
  ru,
}: {
  items: Conversation[];
  selected: Set<string>;
  onSelection: (v: Set<string>) => void;
  onPreview: (c: Conversation) => void;
  onAction: (kind: OperationKind, items: Conversation[], all?: boolean) => void;
  onScan: () => void;
  capabilities: PlatformCapabilities;
  busy: boolean;
  ru: boolean;
}) {
  const [filters, setFilters] = useState<Filters>({
    query: "",
    platform: "all",
    status: "all",
    days: 0,
    sort: "newest",
  });
  const [limit, setLimit] = useState(24);
  const list = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<string>();
  const filtered = filterConversations(items, filters);
  const visible = filtered.slice(0, limit);
  useEffect(() => {
    if (!sentinel.current || !list.current || !globalThis.IntersectionObserver)
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting)
          setLimit((n) => Math.min(Math.max(n, limit + 24), filtered.length));
      },
      { root: list.current, rootMargin: "0px 0px 120px 0px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [limit, filtered.length]);
  const picked = items.filter((c) => selected.has(conversationKey(c)));
  const t = (en: string, r: string) => (ru ? r : en);
  const field = <Key extends keyof Filters>(key: Key, value: Filters[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setLimit(24);
  };
  return (
    <>
      <div className="conversation-tools">
        <div className="search">
          <Search size={15} />
          <input
            aria-label="Search conversations"
            placeholder={t("Search conversations…", "Поиск бесед…")}
            value={filters.query}
            onChange={(e) => field("query", e.target.value)}
          />
          <IconButton label="Rescan sidebar" onClick={onScan} disabled={busy}>
            <RefreshCw size={14} />
          </IconButton>
        </div>
        <div className="filters">
          <Dropdown
            label={t("Platform filter", "Фильтр платформ")}
            value={filters.platform}
            choices={[
              { value: "all", label: t("All platforms", "Все платформы") },
              ...[...new Set(items.map((c) => c.platform))].map((platform) => ({
                value: platform,
                label: platform,
              })),
            ]}
            onChange={(platform) => field("platform", platform)}
          />
          <Dropdown
            label={t("Status filter", "Фильтр статусов")}
            value={filters.status}
            choices={[
              { value: "all", label: t("All statuses", "Все статусы") },
              { value: "active", label: t("Active", "Активные") },
              { value: "archived", label: t("Archived", "Архивные") },
              { value: "unknown", label: t("Unknown", "Неизвестно") },
            ]}
            onChange={(status) => field("status", status)}
          />
          <Dropdown
            label={t("Date filter", "Фильтр по дате")}
            value={filters.days}
            choices={[
              { value: 0, label: t("Any date", "Любая дата") },
              { value: 7, label: t("7 days", "7 дней") },
              { value: 30, label: t("30 days", "30 дней") },
            ]}
            onChange={(days) => field("days", days)}
          />
          <Dropdown
            label={t("Sort conversations", "Сортировка бесед")}
            value={filters.sort}
            choices={[
              { value: "newest", label: t("Newest", "Новые") },
              { value: "oldest", label: t("Oldest", "Старые") },
              { value: "title", label: t("Title A–Z", "По названию") },
            ]}
            onChange={(sort) => field("sort", sort)}
          />
        </div>
        <div className="selection-tools">
          <button
            onClick={() =>
              onSelection(toggleSelection(selected, filtered, "add"))
            }
          >
            {t("Select all matching", "Выбрать найденные")}
          </button>
          <button
            onClick={() =>
              onSelection(toggleSelection(selected, visible, "add"))
            }
          >
            {t("Select visible", "Видимые")}
          </button>
          <button
            onClick={() =>
              onSelection(toggleSelection(selected, filtered, "invert"))
            }
          >
            {t("Invert", "Инверсия")}
          </button>
          <button onClick={() => onSelection(new Set())}>
            {t("Clear", "Сброс")}
          </button>
        </div>
        <p className="counts" aria-live="polite">
          {selected.size} {t("selected", "выбрано")} · {filtered.length}{" "}
          {t("matching", "найдено")} · {visible.length} {t("shown", "показано")}{" "}
          · {items.length} {t("discovered", "обнаружено")}
        </p>
        <p className="hint">
          {t(
            "Partial sidebar discovery. Scroll the website’s history to discover more. Unknown dates and archive states stay unknown.",
            "Обнаружение частичное. Прокрутите историю сайта для новых записей. Неизвестные даты и статусы не угадываются.",
          )}
        </p>
      </div>
      <div
        className="conversation-list scroll-area"
        ref={list}
        onScroll={(e) => {
          const node = e.currentTarget;
          if (node.scrollHeight - node.scrollTop - node.clientHeight < 120)
            setLimit((n) => Math.min(Math.max(n, limit + 24), filtered.length));
        }}
      >
        {!filtered.length && (
          <div className="empty">
            {t(
              "No matching conversations. Try another filter or rescan the sidebar.",
              "Нет подходящих бесед. Измените фильтр или повторите поиск.",
            )}
          </div>
        )}
        {visible.map((c) => {
          const key = conversationKey(c);
          return (
            <div
              key={key}
              className={`conversation ${selected.has(key) ? "selected" : ""}`}
            >
              <input
                type="checkbox"
                aria-label={`Select ${c.title}`}
                checked={selected.has(key)}
                onChange={() =>
                  onSelection(toggleSelection(selected, [c], "invert"))
                }
              />
              <span className={`platform-mark ${c.platform}`}>
                {c.platform.slice(0, 1).toUpperCase()}
              </span>
              <div className="conversation-copy">
                <strong title={c.title}>{c.title}</strong>
                <small>
                  {c.platform} ·{" "}
                  {c.current
                    ? t("Current · loaded DOM", "Текущая · загружена")
                    : c.cached
                      ? t(
                          "Exported snapshot · this tab",
                          "Снимок экспорта · эта вкладка",
                        )
                      : t("Content not loaded", "Содержимое не загружено")}
                </small>
                <span className="badge">
                  {c.status} · {t("partial", "частично")}
                </span>
              </div>
              <IconButton
                label={`Actions for ${c.title}`}
                onClick={() => setMenu(menu === key ? undefined : key)}
              >
                <MoreHorizontal size={18} />
              </IconButton>
              {menu === key && (
                <div className="context-menu">
                  <button
                    disabled={busy}
                    onClick={() => {
                      setMenu(undefined);
                      onPreview(c);
                    }}
                  >
                    <Eye size={14} />
                    {t("Preview / export", "Предпросмотр / экспорт")}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setMenu(undefined);
                      onAction("export", [c]);
                    }}
                  >
                    <Download size={14} />
                    {t("Export", "Экспорт")}
                  </button>
                  <a href={c.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} />
                    {t("Open conversation", "Открыть беседу")}
                  </a>
                  <button
                    disabled={busy || capabilities.archive !== "supported"}
                    onClick={() => {
                      setMenu(undefined);
                      onAction("archive", [c]);
                    }}
                  >
                    <Archive size={14} />
                    {t("Native archive", "Архивировать")}
                  </button>
                  <button
                    disabled={busy || capabilities.delete !== "supported"}
                    onClick={() => {
                      setMenu(undefined);
                      onAction("delete", [c]);
                    }}
                  >
                    <Trash2 size={14} />
                    {t("Delete", "Удалить")}
                  </button>
                  <button
                    onClick={() => {
                      onSelection(new Set([key]));
                      setMenu(undefined);
                    }}
                  >
                    {t("Select only this", "Выбрать только эту")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {visible.length < filtered.length && (
          <div ref={sentinel} className="load-more" role="status">
            {t("Scroll to load more", "Прокрутите для загрузки")}
          </div>
        )}
      </div>
      <div className="bulk-toolbar">
        <div className="button-row">
          <button
            className="primary"
            disabled={!picked.length || busy}
            onClick={() => onAction("export", picked)}
          >
            <Download size={14} />
            {t("Export selected", "Экспорт выбранных")}
          </button>
          <button
            title={`Native archive: ${capabilities.archive}`}
            disabled={
              !picked.length || busy || capabilities.archive !== "supported"
            }
            onClick={() => onAction("archive", picked)}
          >
            <Archive size={14} />
            {t("Archive", "В архив")}
          </button>
          <button
            className="danger-text"
            title={`Native delete: ${capabilities.delete}`}
            disabled={
              !picked.length || busy || capabilities.delete !== "supported"
            }
            onClick={() => onAction("delete", picked)}
          >
            <Trash2 size={14} />
            {t("Delete", "Удалить")}
          </button>
        </div>
        <div className="button-row">
          <button
            disabled={!items.length || busy}
            onClick={() => onAction("export", items, true)}
          >
            {t("Export All", "Экспорт всех")}
          </button>
          <button
            disabled={
              !items.length || busy || capabilities.archive !== "supported"
            }
            onClick={() => onAction("archive", items, true)}
          >
            {t("Archive all", "Всё в архив")}
          </button>
          <button
            className="danger-text"
            disabled={
              !items.length || busy || capabilities.delete !== "supported"
            }
            onClick={() => onAction("delete", items, true)}
          >
            {t("Delete all", "Удалить всё")}
          </button>
        </div>
      </div>
    </>
  );
}
