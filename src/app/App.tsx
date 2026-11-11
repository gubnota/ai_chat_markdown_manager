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
  ExportOptions,
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
import { extractMarkdown } from "../markdown/legacy";
import { embedMarkdownMedia } from "../markdown/media";
import { exportDocument, exportMime } from "../operations/document";
import {
  copyMarkdown,
  download,
  filename,
  makeZip,
  uniqueFilename,
} from "../operations/export";
import { BatchRunner, idleProgress } from "../operations/batch";
import {
  ActionRow,
  Dialog,
  IconButton,
  Toggle,
} from "../components/primitives";
import { Settings } from "../components/Settings";
import { Conversations } from "../components/Conversations";
import { YouTubeCaptions } from "../components/YouTubeCaptions";
type Screen =
  | "home"
  | "conversations"
  | "export"
  | "archive"
  | "settings"
  | "activity"
  | "youtube";
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
  const [backedUp, setBackedUp] = useState<Conversation[]>([]);
  const [backupChecked, setBackupChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [preview, setPreview] = useState<{
    conversation: Conversation;
    options: ExportOptions;
    text: string;
    name: string;
    error?: string;
  }>();
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
  const operationLock = useRef(false);
  const operationAbort = useRef<AbortController | undefined>(undefined);
  const ru = settings.language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);
  const notify = useCallback((text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 6500);
  }, []);
  const scan = useCallback(async () => {
    if (scanning.current || runner.running || operationLock.current) return;
    scanning.current = true;
    setProgress((p) =>
      p.state === "idle" || p.state === "ready"
        ? { ...p, state: "scanning" }
        : p,
    );
    try {
      const discovered = await adapter.discoverConversations();
      setItems(discovered);
      const available = new Set(discovered.map(conversationKey));
      setSelected((previous) => {
        const next = new Set(
          [...previous].filter(
            (key) =>
              !key.startsWith(`${adapter.id}:page:`) || available.has(key),
          ),
        );
        return next.size === previous.size ? previous : next;
      });
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
    async (
      selection = false,
      signal?: AbortSignal,
      options = settings.export,
    ) => {
      const list = await adapter.discoverConversations();
      const current = list.find((c) => c.current);
      if (!current) throw new Error("Current page is unavailable.");
      const body = selection
        ? await embedMarkdownMedia(
            extractMarkdown({
              ...options,
              metadata: false,
              source: false,
              selection: true,
            }),
            [document.querySelector("main") || document.body],
            options,
            signal,
          )
        : await adapter.exportConversation(current, options, signal);
      return {
        text: exportDocument(body, current, options),
        current,
      };
    },
    [adapter, settings.export],
  );
  const quick = useCallback(
    async (
      mode: "save" | "copy" | "selection",
      format = settings.export.format,
    ) => {
      if (runner.running || busy || operationLock.current) return;
      operationLock.current = true;
      const controller = new AbortController();
      operationAbort.current = controller;
      setBusy(true);
      const options = { ...settings.export, format };
      try {
        const { text, current } = await currentDocument(
          mode === "selection" || settings.export.selection,
          controller.signal,
          options,
        );
        if (mode === "copy") {
          await copyMarkdown(text);
          notify(
            format === "html"
              ? t("HTML copied.", "HTML скопирован.")
              : t("Markdown copied.", "Markdown скопирован."),
          );
        } else {
          download(
            text,
            filename(current, options.filename, format),
            exportMime(format),
          );
          notify(
            t(
              `${format === "html" ? "HTML" : "Markdown"} downloaded. Loaded content may be partial.`,
              `${format === "html" ? "HTML" : "Markdown"} сохранён. Доступное содержимое может быть частичным.`,
            ),
          );
        }
        await scan();
      } catch (e) {
        notify(e instanceof Error ? e.message : String(e));
      } finally {
        operationAbort.current = undefined;
        operationLock.current = false;
        setBusy(false);
      }
    },
    [currentDocument, runner, settings.export, notify, ru, scan, busy],
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
    if (runner.running || busy || operationLock.current || !targets.length)
      return;
    if (kind !== "export" && adapter.capabilities[kind] !== "supported") {
      notify(
        `Native ${kind}: ${adapter.capabilities[kind]}. No conversations changed.`,
      );
      return;
    }
    operationLock.current = true;
    setBackedUp([]);
    setBackupChecked(false);
    const controller = new AbortController();
    operationAbort.current = controller;
    setBusy(true);
    setOpen(true);
    setScreen("activity");
    const files = new Map<string, string>();
    const used = new Set<string>();
    const restore = adapter.beginExportSession?.();
    let needsRestore = kind === "export";
    try {
      // Backups must finish successfully before any native mutation is attempted.
      if (
        kind !== "export" &&
        (kind === "archive" ? settings.backupArchive : settings.backupDelete)
      ) {
        needsRestore = true;
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
              uniqueFilename(
                filename(c, settings.export.filename, settings.export.format),
                used,
              ),
              exportDocument(body, c, settings.export),
            );
          },
          setProgress,
        );
        if (backup.state !== "completed")
          throw new Error(
            "Backup did not finish. No native action was started.",
          );
        download(
          makeZip(files, {
            operation: "backup",
            format: settings.export.format,
            embeddedMedia:
              settings.export.format === "html" || settings.export.embedMedia,
            results: backup.results,
          }),
          `chat-backup-${Date.now()}.zip`,
          "application/zip",
        );
        files.clear();
        used.clear();
        // Restore before mutation; a deleted or archived starting chat cannot be restored later.
        await restore?.();
        needsRestore = false;
      }
      controller.signal.throwIfAborted();
      const result = await runner.run(
        {
          kind,
          conversations: [...targets],
          stopOnError: settings.stopOnError,
          delayMs: settings.delayMs,
          batchSize: settings.batchSize,
        },
        async (c, signal) => {
          controller.signal.throwIfAborted();
          if (kind === "export") {
            const body = await adapter.exportConversation(
              c,
              settings.export,
              signal,
            );
            files.set(
              uniqueFilename(
                filename(c, settings.export.filename, settings.export.format),
                used,
              ),
              exportDocument(body, c, settings.export),
            );
          } else if (kind === "archive")
            await adapter.archiveConversation(c, signal);
          else await adapter.deleteConversation(c, signal);
        },
        setProgress,
      );
      if (kind === "export" && files.size) {
        download(
          makeZip(
            files,
            settings.export.manifest
              ? {
                  version: "2.3.1",
                  format: settings.export.format,
                  embeddedMedia:
                    settings.export.format === "html" ||
                    settings.export.embedMedia,
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
          `chat-${settings.export.format}-${Date.now()}.zip`,
          "application/zip",
        );
        const successful = new Set(
          result.results
            .filter((r) => r.status === "success")
            .map((r) => r.key),
        );
        setBackedUp(targets.filter((c) => successful.has(conversationKey(c))));
      }
      if (kind !== "export") {
        const successful = new Set(
          result.results
            .filter((r) => r.status === "success")
            .map((r) => r.key),
        );
        setSelected(
          (previous) =>
            new Set([...previous].filter((key) => !successful.has(key))),
        );
      }
      if (settings.history) {
        recordHistory(result);
        setHistory(read("history", []));
      }
      await scan();
    } catch (e) {
      setProgress((p) => ({
        ...p,
        state: controller.signal.aborted ? "cancelled" : "failed",
        current: undefined,
      }));
      notify(e instanceof Error ? e.message : String(e));
    } finally {
      try {
        if (needsRestore) await restore?.();
      } catch (e) {
        notify(
          `Export finished; returning to the starting chat failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      operationAbort.current = undefined;
      operationLock.current = false;
      setBusy(false);
      await scan();
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
    if (busy || operationLock.current || !targets.length) return;
    setPhrase("");
    setConfirm({ kind, items: targets.map((c) => ({ ...c })), all });
  };
  const previewConversation = async (
    c: Conversation,
    options = settings.export,
  ) => {
    if (busy || runner.running || operationLock.current) return;
    operationLock.current = true;
    const controller = new AbortController();
    operationAbort.current = controller;
    setBusy(true);
    setToast("");
    const pending = {
      conversation: c,
      options,
      text: "",
      name: filename(c, options.filename, options.format),
    };
    setPreview(pending);
    const restore = adapter.beginExportSession?.();
    try {
      const body = await adapter.exportConversation(
        c,
        options,
        controller.signal,
      );
      const text = exportDocument(body, c, options);
      if (!controller.signal.aborted) setPreview({ ...pending, text });
    } catch (e) {
      if (!controller.signal.aborted) {
        const error = e instanceof Error ? e.message : String(e);
        setPreview({ ...pending, error });
        notify(error);
      }
    } finally {
      try {
        await restore?.();
      } catch (e) {
        notify(String(e));
      }
      operationAbort.current = undefined;
      operationLock.current = false;
      setBusy(false);
      await scan();
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
    export: t("Export conversations", "Экспорт бесед"),
    archive: t("Archive conversations", "Архив бесед"),
    settings: t("Settings", "Настройки"),
    activity: t("Activity", "Операции"),
    youtube: t("YouTube captions", "Субтитры YouTube"),
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
                <ActionRow
                  icon={FileDown}
                  title={t("YouTube timedtext", "Субтитры YouTube")}
                  description={t(
                    "Caption languages · TXT / VTT · import",
                    "Языки субтитров · TXT / VTT · импорт",
                  )}
                  onClick={() => setScreen("youtube")}
                />
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
                  shortcut={
                    settings.export.format === "markdown" ? "⌥⇧ M" : undefined
                  }
                  disabled={busy}
                  onClick={(e) =>
                    void quick(e.shiftKey ? "selection" : "save", "markdown")
                  }
                />
                <ActionRow
                  icon={FileDown}
                  title={t(
                    "Save current chat as HTML",
                    "Сохранить беседу в HTML",
                  )}
                  description={t(
                    "Offline document with embedded media and input files",
                    "Офлайн-документ со встроенными медиа и файлами",
                  )}
                  shortcut={
                    settings.export.format === "html" ? "⌥⇧ M" : undefined
                  }
                  disabled={busy}
                  onClick={(e) =>
                    void quick(e.shiftKey ? "selection" : "save", "html")
                  }
                />
                <ActionRow
                  icon={Copy}
                  title={t(
                    `Copy ${settings.export.format === "html" ? "HTML" : "Markdown"}`,
                    "Копировать экспорт",
                  )}
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
                    "Local downloads · no uploads",
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
          {screen === "youtube" && <YouTubeCaptions ru={ru} />}
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
                      `Your conversations, in ${settings.export.format === "html" ? "HTML" : "Markdown"}`,
                      `Ваши беседы в ${settings.export.format === "html" ? "HTML" : "Markdown"}`,
                    )
                  : t("Back up or archive", "Копия или архив")}
              </h2>
              <p>
                {t(
                  "ChatGPT, Gemini and Claude exports open selected chats sequentially, wait for messages, and return to the starting chat. Keep this tab open until finished. Loading may mark chats read. Discovery and loaded message history can be partial; unavailable chats are listed in the report.",
                  "Экспорт ChatGPT, Gemini и Claude по очереди открывает выбранные беседы, ждёт сообщения и возвращается к исходной. Держите вкладку открытой до завершения. Беседы могут помечаться прочитанными. История может быть частичной; недоступные беседы указаны в отчёте.",
                )}
              </p>
              <label>
                {t("File format", "Формат файла")}
                <select
                  aria-label="File format"
                  disabled={busy}
                  value={settings.export.format}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      export: {
                        ...s.export,
                        format: e.target.value as "markdown" | "html",
                      },
                    }))
                  }
                >
                  <option value="markdown">Markdown (.md)</option>
                  <option value="html">HTML · offline (.html)</option>
                </select>
              </label>
              <Toggle
                label={t(
                  "Embed media and input files",
                  "Встраивать медиа и входные файлы",
                )}
                checked={
                  settings.export.embedMedia ||
                  settings.export.format === "html"
                }
                disabled={busy || settings.export.format === "html"}
                onChange={(embedMedia) =>
                  setSettings((s) => ({
                    ...s,
                    export: { ...s.export, embedMedia },
                  }))
                }
              />
              <p className="hint">
                {t(
                  "HTML embeds enabled media automatically. Inaccessible files fail that chat’s backup and exclude it from cleanup. Only loaded content is included.",
                  "HTML автоматически встраивает включённые медиа. Недоступный файл прерывает копирование беседы и исключает её из очистки. Включается только загруженное содержимое.",
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
                      "ChatGPT archive moves discovered chats out of the sidebar. You can restore them from ChatGPT Settings → Data controls → Archived chats. Gemini has no native archive control: download its offline ZIP here, verify it, then delete successfully backed-up chats from the review screen.",
                      "Архивация ChatGPT убирает беседы из боковой панели. Восстановить их можно в настройках ChatGPT → Управление данными → Архивированные чаты. В Gemini нет нативного архива: скачайте ZIP, проверьте его и удалите успешно скопированные беседы через список проверки.",
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
                <button
                  className="wide"
                  onClick={() => {
                    operationAbort.current?.abort();
                    runner.cancel();
                  }}
                >
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
              {!busy && backedUp.length > 0 && (
                <details className="backup-review">
                  <summary>
                    {t(
                      "Review backed-up chats",
                      "Проверить сохранённые беседы",
                    )}{" "}
                    ({backedUp.length})
                  </summary>
                  <p className="hint">
                    {t(
                      "Open the downloaded ZIP and check these exported files before deleting anything. Exports can be partial. A ZIP backup does not remove chats from the website.",
                      "Откройте скачанный ZIP и проверьте экспортированные файлы перед удалением. Экспорт может быть частичным. ZIP-копия не удаляет беседы с сайта.",
                    )}
                  </p>
                  {adapter.capabilities.archive === "supported" ||
                  adapter.capabilities.delete === "supported" ? (
                    <>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={backupChecked}
                          onChange={(e) => setBackupChecked(e.target.checked)}
                        />
                        {t(
                          "I opened the ZIP and checked these files",
                          "Я открыл ZIP и проверил эти файлы",
                        )}
                      </label>
                      <div className="button-row">
                        {adapter.capabilities.archive === "supported" && (
                          <button
                            disabled={!backupChecked}
                            onClick={() => requestAction("archive", backedUp)}
                          >
                            {t(
                              "Archive backed-up chats",
                              "Архивировать сохранённые беседы",
                            )}
                          </button>
                        )}
                        {adapter.capabilities.delete === "supported" && (
                          <button
                            className="danger"
                            disabled={!backupChecked}
                            onClick={() => requestAction("delete", backedUp)}
                          >
                            {t(
                              "Delete backed-up chats",
                              "Удалить сохранённые беседы",
                            )}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="hint">
                      {adapter.id === "gemini"
                        ? t(
                            "To delete a backed-up chat, find it in Gemini’s sidebar, open its More menu and choose Delete. Native controls are not available in this view. Work or school accounts may not allow deletion.",
                            "Для удаления сохранённой беседы найдите её в боковой панели Gemini, откройте меню «Ещё» и выберите «Удалить». В этом виде элементы управления недоступны. Рабочие и учебные аккаунты могут запрещать удаление.",
                          )
                        : t(
                            "Open a backed-up chat and use the website’s own controls. Native controls are not available in this view.",
                            "Откройте сохранённую беседу и используйте меню сайта. В этом виде элементы управления недоступны.",
                          )}
                    </p>
                  )}
                  {adapter.id === "gemini" && (
                    <a
                      href="https://support.google.com/gemini/answer/13666746"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t(
                        "Gemini deletion help",
                        "Справка об удалении в Gemini",
                      )}
                    </a>
                  )}
                  <ul className="results">
                    {backedUp.map((c) => (
                      <li key={conversationKey(c)}>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {c.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
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
          title={t(
            `${preview.options.format === "html" ? "HTML source" : "Markdown"} preview`,
            "Предпросмотр экспорта",
          )}
          onClose={() => {
            operationAbort.current?.abort();
            setPreview(undefined);
          }}
        >
          <p>{preview.conversation.title}</p>
          <label>
            {t("File format", "Формат файла")}
            <select
              aria-label="File format"
              value={preview.options.format}
              disabled={busy}
              onChange={(e) =>
                void previewConversation(preview.conversation, {
                  ...preview.options,
                  format: e.target.value as "markdown" | "html",
                })
              }
            >
              <option value="markdown">Markdown (.md)</option>
              <option value="html">HTML · offline (.html)</option>
            </select>
          </label>
          <Toggle
            label={t(
              "Embed media and input files",
              "Встроить медиа и входные файлы",
            )}
            checked={
              preview.options.embedMedia || preview.options.format === "html"
            }
            disabled={busy || preview.options.format === "html"}
            onChange={(embedMedia) =>
              void previewConversation(preview.conversation, {
                ...preview.options,
                embedMedia,
              })
            }
          />
          {(
            [
              ["images", "Include images", "Включить изображения"],
              [
                "links",
                "Include links and input files",
                "Включить ссылки и входные файлы",
              ],
            ] as const
          ).map(([key, en, rus]) => (
            <Toggle
              key={key}
              label={t(en, rus)}
              checked={preview.options[key]}
              disabled={busy}
              onChange={(value) =>
                void previewConversation(preview.conversation, {
                  ...preview.options,
                  [key]: value,
                })
              }
            />
          ))}
          <p className="hint">
            {t(
              "HTML embeds enabled media for offline use. Markdown embedding requires a viewer that supports data URLs. Changing options refreshes this preview from the chat.",
              "HTML встраивает включённые медиа для офлайн-просмотра. Для Markdown нужен просмотрщик с поддержкой data URL. Изменение настроек обновляет предпросмотр из беседы.",
            )}
          </p>
          {busy && (
            <p role="status">
              {t("Preparing export…", "Подготовка экспорта…")}
            </p>
          )}
          {preview.error && <p role="alert">{preview.error}</p>}
          <pre className="preview" tabIndex={0}>
            {preview.text}
          </pre>
          {preview.error && (
            <button
              disabled={busy}
              onClick={() =>
                void previewConversation(preview.conversation, preview.options)
              }
            >
              {t("Retry preview", "Повторить предпросмотр")}
            </button>
          )}
          <button
            className="primary"
            disabled={busy || !preview.text || !!preview.error}
            onClick={() => {
              download(
                preview.text,
                preview.name,
                exportMime(preview.options.format),
              );
            }}
          >
            {t(
              `Download ${preview.options.format === "html" ? "HTML" : "Markdown"}`,
              `Скачать ${preview.options.format === "html" ? "HTML" : "Markdown"}`,
            )}
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
