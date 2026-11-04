import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Download,
  Copy,
  MousePointer2,
  Files,
  Archive,
  ListChecks,
  Settings2,
  ChevronDown,
  ArrowLeft,
  FileDown,
  ShieldCheck,
  X,
  Activity,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type {
  Conversation,
  OperationKind,
  OperationProgress,
  PlatformAdapter,
} from "../types";
import { conversationKey } from "../types";
import { defaults, loadSettings, read, recordHistory, write } from "../storage";
import {
  panelPosition,
  safePosition,
  sendRects,
  type Point,
} from "../utils/position";
import { conversationDocument, extractMarkdown } from "../markdown/legacy";
import {
  copyMarkdown,
  download,
  filename,
  makeZip,
  uniqueFilename,
} from "../operations/export";
import { BatchRunner, idleProgress } from "../operations/batch";
import { ActionRow, Dialog, IconButton } from "../components/primitives";
import { Settings } from "../components/Settings";
import { Conversations } from "../components/Conversations";
type Screen =
  "home" | "conversations" | "export" | "archive" | "settings" | "activity";
interface Confirmation {
  kind: OperationKind;
  items: Conversation[];
  all: boolean;
}
function initialPosition(): Point {
  let old: Point | undefined;
  try {
    old = JSON.parse(
      localStorage.getItem("__safari_md_export_position_v1__") ?? "null",
    ) as Point;
  } catch {}
  const saved = read<Point>("position", old ?? { x: 14, y: innerHeight * 0.4 });
  return safePosition(
    saved ?? { x: 14, y: innerHeight * 0.4 },
    innerWidth,
    innerHeight,
    44,
    sendRects(),
  );
}
function initialSelection(): Set<string> {
  const raw = read<unknown>("selection", []);
  return new Set(
    Array.isArray(raw)
      ? raw.filter((v): v is string => typeof v === "string").slice(0, 10000)
      : [],
  );
}
export function App({
  adapter,
  host,
}: {
  adapter: PlatformAdapter;
  host: HTMLElement;
}) {
  const [settings, setSettings] = useState(loadSettings);
  const [position, setPosition] = useState(initialPosition);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState(initialSelection);
  const [progress, setProgress] = useState<OperationProgress>(idleProgress);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [preview, setPreview] = useState<{ title: string; text: string }>();
  const [confirm, setConfirm] = useState<Confirmation>();
  const [phrase, setPhrase] = useState("");
  const [systemDark, setSystemDark] = useState(
    matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [panelSize, setPanelSize] = useState({ width: 354, height: 550 });
  const [history, setHistory] = useState(() =>
    read<OperationProgress[]>("history", []),
  );
  const panel = useRef<HTMLDivElement>(null);
  const fab = useRef<HTMLButtonElement>(null);
  const runner = useMemo(() => new BatchRunner(), []);
  const drag = useRef<
    | { pointer: number; x: number; y: number; anchor: Point; moved: boolean }
    | undefined
  >(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scanning = useRef(false);
  const ru = settings.language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);
  const notify = useCallback((text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 6500);
  }, []);
  const scan = useCallback(async () => {
    if (scanning.current || runner.running) return;
    scanning.current = true;
    setProgress((p) =>
      p.state === "idle" || p.state === "ready"
        ? { ...p, state: "scanning" }
        : p,
    );
    try {
      setItems(await adapter.discoverConversations());
      setProgress((p) =>
        p.state === "idle" || p.state === "scanning"
          ? { ...p, state: "ready" }
          : p,
      );
    } catch (e) {
      setProgress((p) =>
        p.state === "scanning" ? { ...p, state: "failed" } : p,
      );
      notify(String(e));
    } finally {
      scanning.current = false;
    }
  }, [adapter, notify, runner]);
  useEffect(() => {
    void scan();
    return adapter.observe?.(() => void scan());
  }, [scan, adapter]);
  useEffect(() => {
    if (!write("settings", settings))
      notify(
        t(
          "Local storage is blocked. Preferences last for this tab only.",
          "Хранилище недоступно. Настройки действуют только в этой вкладке.",
        ),
      );
  }, [settings, notify]);
  useEffect(() => {
    write("selection", [...selected]);
  }, [selected]);
  useEffect(() => {
    write("position", position);
  }, [position]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const change = () => setSystemDark(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    let frame = 0;
    const adjust = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setPosition((p) => {
          const next = safePosition(
            p,
            innerWidth,
            innerHeight,
            settings.fabSize,
            sendRects(),
          );
          return next.x === p.x && next.y === p.y ? p : next;
        }),
      );
    };
    window.addEventListener("resize", adjust);
    window.visualViewport?.addEventListener("resize", adjust);
    window.addEventListener("scroll", adjust, { passive: true });
    const observer = new MutationObserver(adjust);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"],
    });
    adjust();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", adjust);
      window.removeEventListener("scroll", adjust);
      window.visualViewport?.removeEventListener("resize", adjust);
    };
  }, [settings.fabSize]);
  useLayoutEffect(() => {
    if (!panel.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setPanelSize({
        width: entry.target.getBoundingClientRect().width,
        height: entry.target.getBoundingClientRect().height,
      });
    });
    observer.observe(panel.current);
    return () => observer.disconnect();
  }, [open, screen]);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (
        settings.autoMinimize &&
        !confirm &&
        !preview &&
        !runner.running &&
        !e.composedPath().includes(host)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [host, settings.autoMinimize, confirm, preview, runner]);
  const currentDocument = useCallback(
    async (selection = false) => {
      const list = await adapter.discoverConversations();
      const current = list.find((c) => c.current);
      if (!current) throw new Error("Current page is unavailable.");
      const body = selection
        ? extractMarkdown({
            ...settings.export,
            metadata: false,
            source: false,
            selection: true,
          })
        : await adapter.exportConversation(current, settings.export);
      return {
        text: conversationDocument(body, current, settings.export),
        current,
      };
    },
    [adapter, settings.export],
  );
  const quick = useCallback(
    async (mode: "save" | "copy" | "selection") => {
      if (runner.running) return;
      try {
        const { text, current } = await currentDocument(
          mode === "selection" || settings.export.selection,
        );
        if (mode === "copy") {
          await copyMarkdown(text);
          notify(t("Markdown copied.", "Markdown скопирован."));
        } else {
          download(text, filename(current, settings.export.filename));
          notify(
            t(
              "Markdown downloaded. Loaded content may be partial.",
              "Markdown сохранён. Доступное содержимое может быть частичным.",
            ),
          );
        }
        await scan();
      } catch (e) {
        notify(e instanceof Error ? e.message : String(e));
      }
    },
    [currentDocument, runner, settings.export, notify, ru, scan],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirm && !preview) {
        setOpen(false);
        fab.current?.focus();
      }
      if (
        !settings.shortcuts ||
        !e.altKey ||
        !e.shiftKey ||
        e.ctrlKey ||
        e.metaKey
      )
        return;
      if (e.code === "KeyE") {
        e.preventDefault();
        setHidden(false);
        setOpen((v) => !v);
      } else if (e.code === "KeyM") {
        e.preventDefault();
        void quick("save");
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [settings.shortcuts, quick, confirm, preview]);
  const execute = async (kind: OperationKind, targets: Conversation[]) => {
    if (runner.running || busy || !targets.length) return;
    if (kind !== "export" && adapter.capabilities[kind] !== "supported") {
      notify(
        `Native ${kind}: ${adapter.capabilities[kind]}. No conversations changed.`,
      );
      return;
    }
    setBusy(true);
    setOpen(true);
    setScreen("activity");
    const files = new Map<string, string>();
    const used = new Set<string>();
    try {
      // Backups must finish successfully before any native mutation is attempted.
      if (
        kind !== "export" &&
        (kind === "archive" ? settings.backupArchive : settings.backupDelete)
      ) {
        const backup = await runner.run(
          {
            kind: "export",
            conversations: targets,
            stopOnError: true,
            delayMs: settings.delayMs,
            batchSize: settings.batchSize,
          },
          async (c, signal) => {
            const body = await adapter.exportConversation(
              c,
              settings.export,
              signal,
            );
            files.set(
              uniqueFilename(filename(c, settings.export.filename), used),
              conversationDocument(body, c, settings.export),
            );
          },
          setProgress,
        );
        if (backup.state !== "completed")
          throw new Error(
            "Backup did not finish. No native action was started.",
          );
        download(
          makeZip(files, { operation: "backup", results: backup.results }),
          `chat-backup-${Date.now()}.zip`,
          "application/zip",
        );
        files.clear();
        used.clear();
      }
      const result = await runner.run(
        {
          kind,
          conversations: [...targets],
          stopOnError: settings.stopOnError,
          delayMs: settings.delayMs,
          batchSize: settings.batchSize,
        },
        async (c, signal) => {
          if (kind === "export") {
            const body = await adapter.exportConversation(
              c,
              settings.export,
              signal,
            );
            files.set(
              uniqueFilename(filename(c, settings.export.filename), used),
              conversationDocument(body, c, settings.export),
            );
          } else if (kind === "archive")
            await adapter.archiveConversation(c, signal);
          else await adapter.deleteConversation(c, signal);
        },
        setProgress,
      );
      if (kind === "export" && files.size)
        download(
          makeZip(
            files,
            settings.export.manifest
              ? {
                  version: "2.0.0",
                  scope: "discovered DOM only; partial",
                  createdAt: new Date().toISOString(),
                  state: result.state,
                  total: result.total,
                  completed: result.completed,
                  failed: result.failed,
                  skipped: result.skipped,
                  results: result.results,
                }
              : undefined,
          ),
          `chat-markdown-${Date.now()}.zip`,
          "application/zip",
        );
      if (settings.history) {
        recordHistory(result);
        setHistory(read("history", []));
      }
      await scan();
    } catch (e) {
      setProgress((p) => ({ ...p, state: "failed", current: undefined }));
      notify(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const requestAction = (
    kind: OperationKind,
    targets: Conversation[],
    all = false,
  ) => {
    if (kind === "export") {
      void execute(kind, targets);
      return;
    }
    setPhrase("");
    setConfirm({ kind, items: [...targets], all });
  };
  const previewConversation = async (c: Conversation) => {
    try {
      const body = await adapter.exportConversation(c, settings.export);
      setPreview({
        title: c.title,
        text: conversationDocument(body, c, settings.export),
      });
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e));
    }
  };
  const place = panelPosition(
    position,
    panelSize.width,
    panelSize.height,
    settings.fabSize,
  );
  const dark =
    settings.theme === "dark" || (settings.theme === "system" && systemDark);
  const titles: Record<Screen, string> = {
    home: "Markdown Manager",
    conversations: t("Conversations", "Беседы"),
    export: t("Export Markdown", "Экспорт Markdown"),
    archive: t("Archive conversations", "Архив бесед"),
    settings: t("Settings", "Настройки"),
    activity: t("Activity", "Операции"),
  };
  const exportPicked = items.filter((c) => selected.has(conversationKey(c)));
  const done = progress.completed + progress.failed + progress.skipped;
  const pct = progress.total ? Math.round((done / progress.total) * 100) : 0;
  const reset = () => {
    setSettings(structuredClone(defaults));
    setSelected(new Set());
    write("history", []);
    setHistory([]);
    setPosition(
      safePosition(
        { x: 14, y: innerHeight * 0.4 },
        innerWidth,
        innerHeight,
        44,
        sendRects(),
      ),
    );
    notify(t("Local preferences reset.", "Локальные настройки сброшены."));
  };
  return (
    <div
      className={`manager-root ${dark ? "dark" : ""} ${settings.reducedMotion ? "reduced-motion" : ""}`}
      style={
        {
          "--ui-scale": settings.scale,
          "--panel-opacity": settings.opacity,
        } as CSSProperties
      }
    >
      {!hidden && (
        <button
          ref={fab}
          className={`fab ${open ? "active" : ""}`}
          aria-label={t(
            open ? "Minimize Markdown Manager" : "Open Markdown Manager",
            open ? "Свернуть Markdown Manager" : "Открыть Markdown Manager",
          )}
          aria-expanded={open}
          style={{
            left: position.x,
            top: position.y,
            width: settings.fabSize,
            height: settings.fabSize,
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = {
              pointer: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              anchor: position,
              moved: false,
            };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || settings.dragLock) return;
            const dx = e.clientX - d.x,
              dy = e.clientY - d.y;
            if (Math.hypot(dx, dy) > 4) d.moved = true;
            if (d.moved)
              setPosition(
                safePosition(
                  { x: d.anchor.x + dx, y: d.anchor.y + dy },
                  innerWidth,
                  innerHeight,
                  settings.fabSize,
                  sendRects(),
                ),
              );
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            if (!d || d.pointer !== e.pointerId) return;
            drag.current = undefined;
            if (!d.moved) setOpen((v) => !v);
          }}
          onPointerCancel={() => {
            drag.current = undefined;
          }}
          onClick={(e) => {
            if (e.detail === 0) setOpen((v) => !v);
          }}
        >
          <FileDown size={21} />
        </button>
      )}
      {!hidden && open && (
        <div
          ref={panel}
          role="region"
          aria-label="Markdown Manager panel"
          className={`panel panel-${screen}`}
          style={{ left: place.x, top: place.y }}
        >
          <header className="panel-header">
            {screen === "home" ? (
              <span className="brand-icon">
                <FileDown size={21} />
              </span>
            ) : (
              <IconButton
                label={t("Back", "Назад")}
                onClick={() => setScreen("home")}
              >
                <ArrowLeft size={17} />
              </IconButton>
            )}
            <div>
              <h1>{titles[screen]}</h1>
              <small>
                {screen === "conversations"
                  ? `${items.length} ${t("discovered", "обнаружено")} · `
                  : ""}
                {adapter.name} · {location.hostname}
              </small>
            </div>
            <IconButton
              label={t("Minimize", "Свернуть")}
              onClick={() => setOpen(false)}
            >
              <ChevronDown size={17} />
            </IconButton>
          </header>
          {screen === "home" && (
            <>
              <div className="menu-body">
                <h3>{t("This chat", "Текущая беседа")}</h3>
                <ActionRow
                  icon={Download}
                  title={t(
                    "Save current chat as Markdown",
                    "Сохранить беседу в Markdown",
                  )}
                  description={t(
                    "Download the loaded conversation",
                    "Скачать загруженную беседу",
                  )}
                  shortcut="⌥⇧ M"
                  disabled={busy}
                  onClick={(e) => void quick(e.shiftKey ? "selection" : "save")}
                />
                <ActionRow
                  icon={Copy}
                  title={t("Copy Markdown", "Копировать Markdown")}
                  description={t(
                    "Copy to your clipboard",
                    "Копировать в буфер обмена",
                  )}
                  disabled={busy}
                  onClick={() => void quick("copy")}
                />
                <ActionRow
                  icon={MousePointer2}
                  title={t(
                    "Export selected content",
                    "Экспорт выделенного текста",
                  )}
                  description={t(
                    "Only the text highlighted on this page",
                    "Только выделенный текст страницы",
                  )}
                  disabled={busy}
                  onClick={() => void quick("selection")}
                />
                <h3>{t("Library", "Библиотека")}</h3>
                <ActionRow
                  icon={Files}
                  title={t("Export all conversations", "Экспорт бесед")}
                  description={t(
                    "ZIP backup of discovered, loaded content",
                    "ZIP-копия доступного содержимого",
                  )}
                  onClick={() => setScreen("export")}
                />
                <ActionRow
                  icon={Archive}
                  title={t("Archive all conversations", "Архивация бесед")}
                  description={t(
                    "Native archive capabilities and backups",
                    "Поддержка архива и резервные копии",
                  )}
                  onClick={() => setScreen("archive")}
                />
                <ActionRow
                  icon={ListChecks}
                  title={t("Manage conversations", "Управление беседами")}
                  description={t(
                    "Search, select and review conversations",
                    "Поиск, выбор и просмотр бесед",
                  )}
                  onClick={() => {
                    setScreen("conversations");
                    void scan();
                  }}
                />
                <ActionRow
                  icon={Settings2}
                  title={t("Settings", "Настройки")}
                  description={t(
                    "Appearance, exports and privacy",
                    "Оформление, экспорт и приватность",
                  )}
                  onClick={() => setScreen("settings")}
                />
              </div>
              <footer>
                <span className="local-badge">
                  <ShieldCheck size={12} />
                  {t(
                    "Local only — nothing leaves your browser",
                    "Локально — без отправки данных",
                  )}
                </span>
                <div className="footer-actions">
                  <button onClick={() => setScreen("activity")}>
                    <Activity size={13} />
                    {t("Activity", "Операции")}
                  </button>
                  <button
                    onClick={() => {
                      setHidden(true);
                      setOpen(false);
                      notify(
                        t(
                          "Hidden. Restore with Alt + Shift + E or reload the page.",
                          "Скрыто. Alt + Shift + E или обновите страницу.",
                        ),
                      );
                    }}
                  >
                    <X size={13} />
                    {t("Hide overlay", "Скрыть")}
                  </button>
                </div>
              </footer>
            </>
          )}
          {screen === "conversations" && (
            <Conversations
              items={items}
              selected={selected}
              onSelection={setSelected}
              onPreview={(c) => void previewConversation(c)}
              onAction={requestAction}
              onScan={() => void scan()}
              capabilities={adapter.capabilities}
              busy={busy}
              ru={ru}
            />
          )}
          {screen === "settings" && (
            <Settings
              value={settings}
              onChange={setSettings}
              onPosition={(side) =>
                setPosition((p) =>
                  safePosition(
                    {
                      ...p,
                      x:
                        side === "left"
                          ? 14
                          : innerWidth - settings.fabSize - 14,
                    },
                    innerWidth,
                    innerHeight,
                    settings.fabSize,
                    sendRects(),
                  ),
                )
              }
              onReset={reset}
            />
          )}
          {(screen === "export" || screen === "archive") && (
            <div className="detail-body scroll-area">
              <span className="hero-icon">
                {screen === "export" ? (
                  <Files size={28} />
                ) : (
                  <Archive size={28} />
                )}
              </span>
              <h2>
                {screen === "export"
                  ? t(
                      "Your conversations, in Markdown",
                      "Ваши беседы в Markdown",
                    )
                  : t("Back up or archive", "Копия или архив")}
              </h2>
              <p>
                {t(
                  "Discovery covers sidebar entries seen in this tab. Export each loaded conversation to retain an in-tab snapshot (up to 20 / 8 MiB). ZIP combines the current page and matching snapshots. Unloaded entries are failures; no full-account coverage is claimed.",
                  "Обнаруживаются записи боковой панели этой вкладки. Экспорт каждой загруженной беседы сохраняет снимок в памяти (до 20 / 8 МиБ). ZIP объединяет текущую страницу и снимки с теми же настройками. Незагруженные записи отмечаются ошибкой; полнота аккаунта не гарантируется.",
                )}
              </p>
              <div className="summary-grid">
                <div>
                  <strong>{items.length}</strong>
                  <small>{t("discovered", "обнаружено")}</small>
                </div>
                <div>
                  <strong>{exportPicked.length}</strong>
                  <small>{t("selected", "выбрано")}</small>
                </div>
                <div>
                  <strong>
                    {items.filter((c) => c.current || c.cached).length}
                  </strong>
                  <small>{t("available in tab", "доступно во вкладке")}</small>
                </div>
              </div>
              <button
                className="primary wide"
                disabled={busy || !items.length}
                onClick={() => requestAction("export", items, true)}
              >
                <Download size={16} />
                {t("Download discovered as ZIP", "Скачать обнаруженные в ZIP")}
              </button>
              <button
                className="wide"
                disabled={busy || !exportPicked.length}
                onClick={() => requestAction("export", exportPicked)}
              >
                {t("Export selected as ZIP", "Выбранные в ZIP")}
              </button>
              <button
                className="wide"
                onClick={() => setScreen("conversations")}
              >
                {t("Choose conversations", "Выбрать беседы")}
              </button>
              {screen === "archive" && (
                <div className="notice">
                  <strong>
                    {t("Native archive", "Архив платформы")}:{" "}
                    {adapter.capabilities.archive}
                  </strong>
                  <p>
                    {t(
                      "A ZIP is a local backup. It does not change the platform’s archive state. Native archiving has no verified adapter in this release.",
                      "ZIP — локальная копия. Он не меняет статус на платформе. В этом выпуске нет проверенного адаптера архивации.",
                    )}
                  </p>
                  <button
                    disabled={
                      busy ||
                      adapter.capabilities.archive !== "supported" ||
                      !exportPicked.length
                    }
                    onClick={() => requestAction("archive", exportPicked)}
                  >
                    {t(
                      "Archive selected on platform",
                      "Архивировать выбранные",
                    )}
                  </button>
                </div>
              )}
              <div className="capabilities">
                <h3>{t("Platform capabilities", "Возможности платформы")}</h3>
                {Object.entries(adapter.capabilities).map(([key, value]) => (
                  <div key={key}>
                    <span>{key}</span>
                    <span className={`capability ${value}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {screen === "activity" && (
            <div className="detail-body scroll-area">
              <div className="operation-heading">
                {progress.state === "completed" ? (
                  <CheckCircle2 size={22} />
                ) : (
                  <Activity size={22} />
                )}
                <h2 aria-live="polite">
                  {progress.state.replaceAll("_", " ")}
                </h2>
              </div>
              {progress.kind && (
                <p>
                  {progress.kind} ·{" "}
                  {progress.current || t("Operation summary", "Итоги операции")}
                </p>
              )}
              <progress max="100" value={pct} />
              <div className="counts">
                {pct}% · {progress.completed} {t("completed", "выполнено")} ·{" "}
                {progress.failed} {t("failed", "ошибок")} · {progress.skipped}{" "}
                {t("skipped", "пропущено")} / {progress.total}
              </div>
              {busy && (
                <button className="wide" onClick={() => runner.cancel()}>
                  {t("Cancel remaining work", "Отменить оставшиеся")}
                </button>
              )}
              <div className="button-row">
                <button
                  disabled={!progress.kind || busy}
                  onClick={() =>
                    download(
                      JSON.stringify(progress, null, 2),
                      "operation-report.json",
                      "application/json",
                    )
                  }
                >
                  {t("Export report", "Скачать отчёт")}
                </button>
                <button
                  disabled={
                    busy || progress.kind !== "export" || !progress.failed
                  }
                  onClick={() => {
                    const failed = new Set(
                      progress.results
                        .filter((r) => r.status === "failed")
                        .map((r) => r.key),
                    );
                    void execute(
                      "export",
                      items.filter((c) => failed.has(conversationKey(c))),
                    );
                  }}
                >
                  {t("Retry failed exports", "Повторить ошибки экспорта")}
                </button>
              </div>
              <p className="hint">
                {t(
                  "Cancellation stops queued work. Completed native actions are not rolled back. Reports contain IDs and errors; review before sharing.",
                  "Отмена останавливает очередь. Выполненные действия не откатываются. Отчёт содержит ID и ошибки; проверяйте перед отправкой.",
                )}
              </p>
              <ul className="results">
                {progress.results.map((r, i) => (
                  <li key={`${r.key}-${i}`}>
                    <span className={r.status}>{r.status}</span>{" "}
                    <code>{r.key}</code>
                    {r.error && <small>{r.error}</small>}
                  </li>
                ))}
              </ul>
              <h3>{t("Recent local activity", "Локальная история")}</h3>
              {Array.isArray(history) &&
                history.slice(0, 10).map((p, i) => (
                  <p className="history-entry" key={i}>
                    {p.kind} · {p.state} · {p.completed}/{p.total} ·{" "}
                    {p.startedAt?.slice(0, 16)}
                  </p>
                ))}
              {!history.length && (
                <p className="hint">
                  {t(
                    "No completed operations recorded.",
                    "Нет записанных операций.",
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <AlertCircle size={16} />
          <span>{toast}</span>
          <IconButton label="Dismiss notification" onClick={() => setToast("")}>
            <X size={14} />
          </IconButton>
        </div>
      )}
      {preview && (
        <Dialog
          title={t("Markdown preview", "Предпросмотр Markdown")}
          onClose={() => setPreview(undefined)}
        >
          <p>{preview.title}</p>
          <pre className="preview" tabIndex={0}>
            {preview.text}
          </pre>
          <button
            className="primary"
            onClick={() => {
              download(preview.text, "preview.md");
            }}
          >
            {t("Download Markdown", "Скачать Markdown")}
          </button>
        </Dialog>
      )}
      {confirm && (
        <Dialog
          title={
            confirm.kind === "delete"
              ? t("Delete conversations?", "Удалить беседы?")
              : t("Archive conversations?", "Архивировать беседы?")
          }
          onClose={() => {
            if (!busy) setConfirm(undefined);
          }}
        >
          <p>
            {t(
              "This changes conversations on the platform. Review every selected identity below.",
              "Это изменяет беседы на платформе. Проверьте каждую выбранную запись.",
            )}
          </p>
          <ul className="confirm-list">
            {confirm.items.map((c) => (
              <li key={conversationKey(c)}>
                <strong>{c.title}</strong>
                <small>
                  {c.platform} · {c.id}
                </small>
              </li>
            ))}
          </ul>
          {confirm.all && (
            <p className="notice">
              {t(
                "ALL means all discovered entries, not your entire account.",
                "ВСЕ означает только обнаруженные записи, а не весь аккаунт.",
              )}
            </p>
          )}
          {confirm.kind === "delete" && (
            <>
              <p className="danger-text">
                {t(
                  "Deletion may be irreversible. A local backup cannot restore platform history.",
                  "Удаление может быть необратимым. Локальная копия не восстанавливает историю платформы.",
                )}
              </p>
              <label>
                {t("Type", "Введите")}{" "}
                <strong>{confirm.all ? "DELETE ALL" : "DELETE"}</strong>
                <input
                  autoComplete="off"
                  aria-label="Deletion confirmation"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                />
              </label>
            </>
          )}
          <div className="button-row">
            <button onClick={() => setConfirm(undefined)}>
              {t("Cancel", "Отмена")}
            </button>
            <button
              className="danger"
              disabled={
                busy ||
                (confirm.kind === "delete" &&
                  phrase !== (confirm.all ? "DELETE ALL" : "DELETE"))
              }
              onClick={() => {
                const action = confirm;
                setConfirm(undefined);
                void execute(action.kind, action.items);
              }}
            >
              {confirm.kind === "delete" ? (
                <Trash2 size={14} />
              ) : (
                <Archive size={14} />
              )}{" "}
              {t("Confirm", "Подтвердить")} ({confirm.items.length})
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
