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
  Maximize2,
  Minimize2,
  ArrowLeft,
  FileDown,
  ShieldCheck,
  X,
  Activity,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { version } from "../../package.json";
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
import { exportMime } from "../operations/document";
import {
  copyMarkdown,
  download,
  filename,
  makeZip,
  uniqueFilename,
  safeFilename,
} from "../operations/export";
import { BatchRunner, idleProgress } from "../operations/batch";
import {
  ActionRow,
  Dialog,
  IconButton,
  Toggle,
} from "../components/primitives";
import { FormatSelect, ExportProgress } from "../components/FormatSelect";
import {
  prepareDocument,
  renamedDocument,
  type PreparedDocument,
  type ExportFiles,
} from "../operations/package";
import { Settings } from "../components/Settings";
import { Conversations } from "../components/Conversations";
import { YouTubeCaptions } from "../components/YouTubeCaptions";
type Screen =
  | "home"
  | "conversations"
  | "archive"
  | "settings"
  | "activity"
  | "youtube";
interface Confirmation {
  kind: OperationKind;
  items: Conversation[];
  all: boolean;
}
type ExportScope = "selected" | "all" | "retry";
type ExportChoice = {
  options: ExportOptions;
  error?: string;
} & (
  | { kind: "current"; selection: boolean }
  | { kind: "batch"; targets: Conversation[]; scope: ExportScope }
);
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
  const [panelMode, setPanelMode] = useState<"closed" | "compact" | "expanded">("closed");
  const open = panelMode !== "closed";
  const expanded = panelMode === "expanded";
  const [hidden, setHidden] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState(initialSelection);
  const [progress, setProgress] = useState<OperationProgress>(idleProgress);
  const [backedUp, setBackedUp] = useState<Conversation[]>([]);
  const [backupChecked, setBackupChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exportStage, setExportStage] = useState("");
  const [toast, setToast] = useState("");
  const [preview, setPreview] = useState<{
    conversation: Conversation;
    options: ExportOptions;
    text: string;
    name: string;
    bundle?: PreparedDocument;
    error?: string;
  }>();
  const [exportChoice, setExportChoice] = useState<ExportChoice>();
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
  const lastExportOptions = useRef<ExportOptions | undefined>(undefined);
  const ru = settings.language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);
  const dismissPanel = useCallback(() => {
    setPanelMode("closed");
    fab.current?.focus();
  }, []);
  const togglePanel = () =>
    setPanelMode((mode) => (mode === "closed" ? "compact" : "closed"));
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
    if (!panel.current || expanded) return;
    const observer = new ResizeObserver(([entry]) => {
      setPanelSize({
        width: entry.target.getBoundingClientRect().width,
        height: entry.target.getBoundingClientRect().height,
      });
    });
    observer.observe(panel.current);
    return () => observer.disconnect();
  }, [open, expanded, screen]);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (
        settings.autoMinimize &&
        !confirm &&
        !preview &&
        !exportChoice &&
        !runner.running &&
        !e.composedPath().includes(host)
      )
        setPanelMode("closed");
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [host, settings.autoMinimize, confirm, preview, exportChoice, runner]);
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
        ...prepareDocument(
          body,
          current,
          options,
          filename(current, options.filename, options.format),
        ),
        current,
      };
    },
    [adapter, settings.export],
  );
  const quick = useCallback(
    async (mode: "save" | "copy" | "selection", options = settings.export) => {
      if (runner.running || busy || operationLock.current)
        return { ok: false, error: "Another operation is running." };
      operationLock.current = true;
      const controller = new AbortController();
      operationAbort.current = controller;
      setBusy(true);
      setExportStage(
        t(
          "Capturing messages, images and input files…",
          "Сохраняем сообщения, изображения и файлы…",
        ),
      );
      const { format } = options;
      try {
        const prepared = await currentDocument(
          mode === "selection" || options.selection,
          controller.signal,
          mode === "copy"
            ? {
                ...options,
                mediaFiles: false,
                embedMedia: options.mediaFiles || options.embedMedia,
              }
            : options,
        );
        controller.signal.throwIfAborted();
        setExportStage(t("Preparing download…", "Подготавливаем загрузку…"));
        await new Promise((resolve) => setTimeout(resolve, 0));
        controller.signal.throwIfAborted();
        if (mode === "copy") {
          await copyMarkdown(prepared.text);
          notify(
            format === "html"
              ? t("HTML copied.", "HTML скопирован.")
              : t("Markdown copied.", "Markdown скопирован."),
          );
        } else {
          download(
            options.mediaFiles
              ? makeZip(
                  prepared.files,
                  options.manifest ? { format, mediaFiles: true } : undefined,
                )
              : prepared.text,
            options.mediaFiles
              ? prepared.name.replace(/\.(md|html)$/i, ".zip")
              : prepared.name,
            options.mediaFiles ? "application/zip" : exportMime(format),
          );
          notify(
            t(
              `${format === "html" ? "HTML" : "Markdown"} downloaded. Loaded content may be partial.`,
              `${format === "html" ? "HTML" : "Markdown"} сохранён. Доступное содержимое может быть частичным.`,
            ),
          );
        }
        await scan();
        return { ok: true };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        notify(error);
        return { ok: false, error };
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
      if (e.key === "Escape" && open && !confirm && !preview && !exportChoice)
        dismissPanel();
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
        setPanelMode((mode) => (mode === "closed" ? "compact" : "closed"));
      } else if (e.code === "KeyM" && !confirm && !preview && !exportChoice) {
        e.preventDefault();
        void quick("save");
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [settings.shortcuts, quick, confirm, preview, exportChoice, open, dismissPanel]);
  const execute = async (
    kind: OperationKind,
    targets: Conversation[],
    options = settings.export,
  ) => {
    if (runner.running || busy || operationLock.current || !targets.length)
      return;
    if (kind !== "export" && adapter.capabilities[kind] !== "supported") {
      notify(
        `Native ${kind}: ${adapter.capabilities[kind]}. No conversations changed.`,
      );
      return;
    }
    operationLock.current = true;
    if (kind === "export") lastExportOptions.current = options;
    setBackedUp([]);
    setBackupChecked(false);
    const controller = new AbortController();
    operationAbort.current = controller;
    setBusy(true);
    setPanelMode((mode) => (mode === "closed" ? "compact" : mode));
    setScreen("activity");
    const files: ExportFiles = new Map();
    const used = new Set<string>();
    const addDocument = async (
      c: Conversation,
      exportOptions: ExportOptions,
      signal: AbortSignal,
    ) => {
      const body = await adapter.exportConversation(c, exportOptions, signal);
      const name = uniqueFilename(
        filename(c, exportOptions.filename, exportOptions.format),
        used,
      );
      const prepared = prepareDocument(body, c, exportOptions, name);
      for (const [path, data] of prepared.files) files.set(path, data);
    };
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
          (c, signal) => addDocument(c, settings.export, signal),
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
            embeddedMedia: settings.export.embedMedia,
            mediaFiles: settings.export.mediaFiles,
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
          if (kind === "export") await addDocument(c, options, signal);
          else if (kind === "archive")
            await adapter.archiveConversation(c, signal);
          else await adapter.deleteConversation(c, signal);
        },
        setProgress,
      );
      if (kind === "export" && files.size) {
        download(
          makeZip(
            files,
            options.manifest
              ? {
                  version,
                  format: options.format,
                  embeddedMedia: !options.mediaFiles && options.embedMedia,
                  mediaFiles: options.mediaFiles,
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
          `chat-${options.format}-${Date.now()}.zip`,
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
  const requestExport = (
    targets: Conversation[],
    scope: ExportScope,
    options = { ...settings.export, embedMedia: true },
  ) => {
    if (busy || operationLock.current || !targets.length) return;
    setExportChoice({
      kind: "batch",
      targets: targets.map((c) => ({ ...c })),
      scope,
      options: { ...options, embedMedia: !options.mediaFiles && options.embedMedia },
    });
  };
  const requestAction = (
    kind: OperationKind,
    targets: Conversation[],
    all = false,
  ) => {
    if (kind === "export") {
      requestExport(targets, all ? "all" : "selected");
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
    setExportStage(
      t(
        "Capturing messages, images and input files…",
        "Сохраняем сообщения, изображения и файлы…",
      ),
    );
    const pending = {
      conversation: c,
      options,
      text: "",
      name:
        preview && conversationKey(preview.conversation) === conversationKey(c)
          ? preview.name.replace(/\.(md|html)$/i, "") +
            (options.format === "html" ? ".html" : ".md")
          : filename(c, options.filename, options.format),
    };
    setPreview(pending);
    const restore = adapter.beginExportSession?.();
    try {
      const body = await adapter.exportConversation(
        c,
        options,
        controller.signal,
      );
      setExportStage(t("Preparing preview…", "Подготавливаем предпросмотр…"));
      const bundle = prepareDocument(body, c, options, pending.name);
      if (!controller.signal.aborted)
        setPreview({ ...pending, text: bundle.text, bundle });
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
  function currentOptions(): ExportOptions {
    const current = items.find((item) => item.current);
    const { format } = settings.export;
    return {
      ...settings.export,
      format,
      embedMedia:
        !settings.export.mediaFiles &&
        (format === "html" || settings.export.embedMedia),
      filename: current
        ? filename(current, settings.export.filename, format).replace(
            /\.(html|md)$/i,
            "",
          )
        : settings.export.filename,
    };
  }
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
            if (!d.moved) togglePanel();
          }}
          onPointerCancel={() => {
            drag.current = undefined;
          }}
          onClick={(e) => {
            if (e.detail === 0) togglePanel();
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
          className={`panel panel-${screen}${expanded ? " panel-expanded" : ""}`}
          style={expanded ? undefined : { left: place.x, top: place.y }}
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
                {screen === "home" && ` · v${version}`}
              </small>
            </div>
            <IconButton
              label={expanded ? t("Restore window", "Восстановить окно") : t("Expand window", "На весь экран")}
              onClick={() => setPanelMode(expanded ? "compact" : "expanded")}
            >
              {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </IconButton>
            <IconButton
              label={expanded ? t("Close window", "Закрыть окно") : t("Minimize", "Свернуть")}
              onClick={dismissPanel}
            >
              {expanded ? <X size={17} /> : <ChevronDown size={17} />}
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
                  title={t("Save Current Chat", "Сохранить текущую беседу")}
                  description={t(
                    "Choose the format and how to include files",
                    "Выберите формат и способ сохранения файлов",
                  )}
                  shortcut="⌥⇧ M"
                  disabled={busy}
                  onClick={(e) =>
                    setExportChoice({
                      kind: "current",
                      selection: e.shiftKey,
                      options: currentOptions(),
                    })
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
                  onClick={() =>
                    setExportChoice({
                      kind: "current",
                      selection: true,
                      options: currentOptions(),
                    })
                  }
                />
                <h3>{t("Library", "Библиотека")}</h3>
                <ActionRow
                  icon={Files}
                  title={t("Export All", "Экспорт всех")}
                  description={t(
                    "ZIP backup of discovered, loaded content",
                    "ZIP-копия доступного содержимого",
                  )}
                  disabled={busy || !items.length}
                  onClick={() => requestExport(items, "all")}
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
                      setPanelMode("closed");
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
          {screen === "archive" && (
            <div className="detail-body scroll-area">
              <span className="hero-icon">
                <Archive size={28} />
              </span>
              <h2>{t("Back up or archive", "Копия или архив")}</h2>
              <p>
                {t(
                  "ChatGPT, Gemini and Claude exports open selected chats sequentially, wait for messages, and return to the starting chat. Keep this tab open until finished. Loading may mark chats read. Discovery and loaded message history can be partial; unavailable chats are listed in the report.",
                  "Экспорт ChatGPT, Gemini и Claude по очереди открывает выбранные беседы, ждёт сообщения и возвращается к исходной. Держите вкладку открытой до завершения. Беседы могут помечаться прочитанными. История может быть частичной; недоступные беседы указаны в отчёте.",
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
                onClick={() => requestExport(items, "all")}
              >
                <Download size={16} />
                {t("Export All", "Экспорт всех")}
              </button>
              <button
                className="wide"
                disabled={busy || !exportPicked.length}
                onClick={() => requestExport(exportPicked, "selected")}
              >
                {t("Export selected", "Экспорт выбранных")}
              </button>
              <button
                className="wide"
                onClick={() => setScreen("conversations")}
              >
                {t("Choose conversations", "Выбрать беседы")}
              </button>
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
                    requestExport(
                      items.filter((c) => failed.has(conversationKey(c))),
                      "retry",
                      lastExportOptions.current,
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
      {exportChoice && (
        <Dialog
          title={
            exportChoice.kind === "current"
              ? t("Export options", "Настройки экспорта")
              : {
                  all: t("Export All", "Экспорт всех"),
                  selected: t("Export selected", "Экспорт выбранных"),
                  retry: t("Retry failed exports", "Повторить ошибки экспорта"),
                }[exportChoice.scope]
          }
          onClose={() => {
            operationAbort.current?.abort();
            setExportChoice(undefined);
          }}
        >
          <div className="export-options">
            <div>
              {t("File format", "Формат файла")}
              <FormatSelect
                label={t("File format", "Формат файла")}
                value={exportChoice.options.format}
                disabled={busy}
                onChange={(format) => {
                  const { options } = exportChoice;
                  setExportChoice({
                    ...exportChoice,
                    error: undefined,
                    options: {
                      ...options,
                      format,
                      embedMedia:
                        options.embedMedia ||
                        (exportChoice.kind === "current" &&
                          format === "html" &&
                          !options.mediaFiles),
                    },
                  });
                }}
              />
            </div>
            {(
              [
                [
                  "mediaFiles",
                  "Save ZIP with separate media and input files",
                  "Сохранить ZIP с медиа и входными файлами",
                ],
                [
                  "embedMedia",
                  "Embed media and input files",
                  "Встроить медиа и входные файлы",
                ],
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
                checked={exportChoice.options[key]}
                disabled={busy}
                onChange={(value) => {
                  const options = { ...exportChoice.options, [key]: value };
                  if (value && key === "mediaFiles") options.embedMedia = false;
                  if (value && key === "embedMedia") options.mediaFiles = false;
                  setExportChoice({ ...exportChoice, error: undefined, options });
                }}
              />
            ))}
          </div>
          {exportChoice.kind === "batch" && (
            <>
              <p>
                {exportChoice.scope === "all"
                  ? t(
                      `${exportChoice.targets.length} discovered chats. Discovery and loaded history may be partial.`,
                      `Обнаружено бесед: ${exportChoice.targets.length}. Список и загруженная история могут быть неполными.`,
                    )
                  : t(
                      `Chats to export: ${exportChoice.targets.length}.`,
                      `Бесед для экспорта: ${exportChoice.targets.length}.`,
                    )}
              </p>
              <p className="hint">
                {t(
                  "Keep this tab open. Loading chats for export may mark them read.",
                  "Держите вкладку открытой. Загруженные для экспорта беседы могут помечаться прочитанными.",
                )}
              </p>
            </>
          )}
          <p className="hint">
            {exportChoice.options.mediaFiles
              ? t(
                  "Extract the whole ZIP before opening a document so it can load its assets. Source links still need internet.",
                  "Распакуйте весь ZIP перед открытием документа, чтобы он мог загрузить файлы. Для внешних ссылок нужен интернет.",
                )
              : exportChoice.options.embedMedia
                ? t(
                    "Media and input files will be embedded for offline use. Markdown viewers must support data URLs.",
                    "Медиа и входные файлы будут встроены для офлайн-просмотра. Просмотрщик Markdown должен поддерживать data URL.",
                  )
                : t(
                    "Media and input files remain external links: internet and access to the originals may be required; links may expire.",
                    "Медиа и входные файлы останутся внешними ссылками: может потребоваться интернет и доступ к оригиналам; ссылки могут истечь.",
                  )}
          </p>
          {busy && <ExportProgress label={exportStage} />}
          {exportChoice.kind === "current" && (
            <label>
              {t("Filename", "Имя файла")}
              <input
                aria-label="Filename"
                disabled={busy}
                value={exportChoice.options.filename}
                onChange={(e) =>
                  setExportChoice({
                    ...exportChoice,
                    options: {
                      ...exportChoice.options,
                      filename: e.target.value.replace(/\.(html|md|zip)$/i, ""),
                    },
                  })
                }
              />
              <small>
                .
                {exportChoice.options.mediaFiles
                  ? "zip"
                  : exportChoice.options.format === "html"
                    ? "html"
                    : "md"}
              </small>
            </label>
          )}
          {exportChoice.error && <p role="alert">{exportChoice.error}</p>}
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              if (exportChoice.kind === "batch") {
                setExportChoice(undefined);
                void execute("export", exportChoice.targets, exportChoice.options);
                return;
              }
              const result = await quick(
                exportChoice.selection ? "selection" : "save",
                exportChoice.options,
              );
              if (result.ok) setExportChoice(undefined);
              else
                setExportChoice(
                  (current) => current && { ...current, error: result.error },
                );
            }}
          >
            {exportChoice.kind === "batch" || exportChoice.options.mediaFiles
              ? t("Download ZIP", "Скачать ZIP")
              : exportChoice.options.format === "html"
                ? t("Download HTML", "Скачать HTML")
                : t("Download Markdown", "Скачать Markdown")}
          </button>
        </Dialog>
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
            <FormatSelect
              value={preview.options.format}
              disabled={busy}
              onChange={(format) =>
                void previewConversation(preview.conversation, {
                  ...preview.options,
                  format: format,
                  embedMedia: format === "html" || preview.options.embedMedia,
                })
              }
            />
          </label>
          <Toggle
            label={t(
              "Save ZIP with separate media and input files",
              "Сохранить ZIP с медиа и входными файлами",
            )}
            checked={preview.options.mediaFiles}
            disabled={busy}
            onChange={(mediaFiles) =>
              void previewConversation(preview.conversation, {
                ...preview.options,
                mediaFiles,
              })
            }
          />
          <Toggle
            label={t(
              "Embed media and input files",
              "Встроить медиа и входные файлы",
            )}
            checked={!preview.options.mediaFiles && preview.options.embedMedia}
            disabled={busy || preview.options.mediaFiles}
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
            {preview.options.mediaFiles
              ? t(
                  "Unpack the whole ZIP before opening the document. Media and input files use local relative links; external citations still need internet. Changing options refreshes this preview.",
                  "Распакуйте весь ZIP перед открытием документа. Медиа и файлы используют локальные ссылки; внешним источникам нужен интернет. Настройки обновляют предпросмотр.",
                )
              : t(
                  "Enable embedding for offline media and input files; otherwise external links need internet and may expire. Markdown embedding requires a viewer that supports data URLs. Changing options refreshes this preview.",
                  "Включите встраивание для офлайн-медиа и файлов; иначе ссылкам нужен интернет, и они могут истечь. Для Markdown нужен просмотрщик с поддержкой data URL. Настройки обновляют предпросмотр.",
                )}
          </p>
          {busy && <ExportProgress label={exportStage} />}
          <label>
            {t("Filename", "Имя файла")}
            <input
              aria-label="Filename"
              disabled={busy}
              value={preview.name.replace(/\.(md|html)$/i, "")}
              onChange={(e) =>
                setPreview({
                  ...preview,
                  name:
                    safeFilename(
                      e.target.value.replace(/\.(html|md|zip)$/i, ""),
                    ) + (preview.options.format === "html" ? ".html" : ".md"),
                })
              }
            />
            <small>
              .
              {preview.options.mediaFiles
                ? "zip"
                : preview.options.format === "html"
                  ? "html"
                  : "md"}
            </small>
          </label>
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
                preview.options.mediaFiles && preview.bundle
                  ? makeZip(
                      renamedDocument(preview.bundle, preview.name),
                      preview.options.manifest
                        ? { format: preview.options.format, mediaFiles: true }
                        : undefined,
                    )
                  : preview.text,
                preview.options.mediaFiles
                  ? preview.name.replace(/\.(md|html)$/i, ".zip")
                  : preview.name,
                preview.options.mediaFiles
                  ? "application/zip"
                  : exportMime(preview.options.format),
              );
            }}
          >
            {t(
              `Download ${preview.options.mediaFiles ? "ZIP" : preview.options.format === "html" ? "HTML" : "Markdown"}`,
              `Скачать ${preview.options.mediaFiles ? "ZIP" : preview.options.format === "html" ? "HTML" : "Markdown"}`,
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
