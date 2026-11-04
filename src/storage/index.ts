import type { ExportOptions, OperationProgress } from "../types";
export interface Settings {
  theme: "light" | "dark" | "system";
  scale: number;
  opacity: number;
  reducedMotion: boolean;
  language: "en" | "ru";
  fabSize: number;
  dragLock: boolean;
  autoMinimize: boolean;
  shortcuts: boolean;
  batchSize: number;
  delayMs: number;
  stopOnError: boolean;
  backupArchive: boolean;
  backupDelete: boolean;
  history: boolean;
  export: ExportOptions;
}
export const defaults: Settings = {
  theme: "system",
  scale: 1,
  opacity: 0.96,
  reducedMotion: false,
  language: "en",
  fabSize: 44,
  dragLock: false,
  autoMinimize: true,
  shortcuts: true,
  batchSize: 5,
  delayMs: 500,
  stopOnError: false,
  backupArchive: true,
  backupDelete: false,
  history: true,
  export: {
    images: true,
    links: true,
    metadata: true,
    source: true,
    outline: false,
    selection: false,
    title: true,
    timestamps: true,
    manifest: true,
    filename: "{platform}-{date}-{slug}",
  },
};
const prefix = "__ai_chat_md_v2__:";
export function read<T>(key: string, fallback: T): T {
  try {
    return (
      (JSON.parse(localStorage.getItem(prefix + key) ?? "null") as T) ??
      fallback
    );
  } catch {
    return fallback;
  }
}
export function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(prefix + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function loadSettings(): Settings {
  const raw = read<Partial<Settings>>("settings", {});
  const value = structuredClone(defaults);
  for (const key of Object.keys(defaults) as (keyof Settings)[]) {
    if (key === "export") continue;
    if (typeof raw[key] === typeof defaults[key])
      Object.assign(value, { [key]: raw[key] });
  }
  const old = (() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem("__safari_md_export_settings_v1__") ?? "{}",
        ) ?? {}
      );
    } catch {
      return {};
    }
  })() as Partial<ExportOptions>;
  for (const key of Object.keys(defaults.export) as (keyof ExportOptions)[]) {
    const val = raw.export?.[key] ?? old[key];
    if (typeof val === typeof defaults.export[key])
      Object.assign(value.export, { [key]: val });
  }
  value.theme = ["light", "dark", "system"].includes(value.theme)
    ? value.theme
    : "system";
  value.language = value.language === "ru" ? "ru" : "en";
  const clamp = (n: number, min: number, max: number, fallback: number) =>
    Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  value.scale = clamp(value.scale, 0.85, 1.2, 1);
  value.opacity = clamp(value.opacity, 0.65, 1, 0.96);
  value.fabSize = clamp(value.fabSize, 40, 48, 44);
  value.delayMs = clamp(value.delayMs, 0, 10000, 500);
  value.batchSize = clamp(value.batchSize, 1, 25, 5);
  return value;
}
export function recordHistory(progress: OperationProgress): void {
  // Persist only counts and states: no titles, content, URLs or conversation IDs.
  const stored = read<unknown>("history", []);
  const entries = Array.isArray(stored) ? stored : [];
  write(
    "history",
    [{ ...progress, current: undefined, results: [] }, ...entries].slice(0, 30),
  );
}
