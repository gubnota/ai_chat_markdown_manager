import type { Settings as SettingsType } from "../storage";
import { Toggle } from "./primitives";
export function Settings({
  value,
  onChange,
  onPosition,
  onReset,
}: {
  value: SettingsType;
  onChange: (v: SettingsType) => void;
  onPosition: (side: "left" | "right") => void;
  onReset: () => void;
}) {
  const ru = value.language === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);
  const set = <K extends keyof SettingsType>(key: K, v: SettingsType[K]) =>
    onChange({ ...value, [key]: v });
  const exp = (key: keyof SettingsType["export"], v: boolean | string) =>
    onChange({ ...value, export: { ...value.export, [key]: v } });
  return (
    <div className="settings scroll-area">
      <section className="settings-card">
        <h3>{t("Appearance", "Оформление")}</h3>
        <label>
          {t("Theme", "Тема")}
          <select
            aria-label="Theme"
            value={value.theme}
            onChange={(e) =>
              set("theme", e.target.value as SettingsType["theme"])
            }
          >
            <option value="light">{t("Light", "Светлая")}</option>
            <option value="dark">{t("Dark", "Тёмная")}</option>
            <option value="system">{t("System", "Системная")}</option>
          </select>
        </label>
        <label>
          {t("Opacity", "Прозрачность")}{" "}
          <span>{Math.round(value.opacity * 100)}%</span>
          <input
            aria-label="Opacity"
            type="range"
            min="0.65"
            max="1"
            step="0.01"
            value={value.opacity}
            onChange={(e) => set("opacity", +e.target.value)}
          />
        </label>
        <label>
          {t("UI scale", "Масштаб")}
          <input
            aria-label="UI scale"
            type="range"
            min="0.85"
            max="1.2"
            step="0.05"
            value={value.scale}
            onChange={(e) => set("scale", +e.target.value)}
          />
        </label>
        <Toggle
          label={t("Reduced motion", "Уменьшить анимацию")}
          checked={value.reducedMotion}
          onChange={(v) => set("reducedMotion", v)}
        />
        <label>
          {t("Language", "Язык")}
          <select
            aria-label="Language"
            value={value.language}
            onChange={(e) => set("language", e.target.value as "en" | "ru")}
          >
            <option value="en">English</option>
            <option value="ru">Русский</option>
          </select>
        </label>
      </section>
      <section className="settings-card">
        <h3>{t("Floating controls", "Плавающая кнопка")}</h3>
        <label>
          {t("Button size", "Размер кнопки")}
          <select
            aria-label="Button size"
            value={value.fabSize}
            onChange={(e) => set("fabSize", +e.target.value)}
          >
            {[40, 44, 48].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <div className="button-row">
          <button onClick={() => onPosition("left")}>
            {t("Move left", "Слева")}
          </button>
          <button onClick={() => onPosition("right")}>
            {t("Move right", "Справа")}
          </button>
        </div>
        <Toggle
          label={t("Lock dragging", "Закрепить положение")}
          checked={value.dragLock}
          onChange={(v) => set("dragLock", v)}
        />
        <Toggle
          label={t(
            "Minimize on outside click",
            "Сворачивать при клике снаружи",
          )}
          checked={value.autoMinimize}
          onChange={(v) => set("autoMinimize", v)}
        />
        <Toggle
          label={t("Keyboard shortcuts", "Горячие клавиши")}
          checked={value.shortcuts}
          onChange={(v) => set("shortcuts", v)}
        />
        <small>
          Alt + Shift + E · {t("restore / toggle", "показать / свернуть")}
          <br />
          Alt + Shift + M · {t("save Markdown", "сохранить Markdown")}
        </small>
      </section>
      <section className="settings-card">
        <h3>{t("Export format", "Формат экспорта")}</h3>
        <label>
          {t("File format", "Формат файла")}
          <select
            aria-label="File format"
            value={value.export.format}
            onChange={(e) =>
              onChange({
                ...value,
                export: {
                  ...value.export,
                  format: e.target.value as "markdown" | "html",
                  embedMedia:
                    e.target.value === "html" || value.export.embedMedia,
                },
              })
            }
          >
            <option value="markdown">Markdown (.md)</option>
            <option value="html">HTML (.html)</option>
          </select>
        </label>
        <Toggle
          label={t(
            "Embed media and input files",
            "Встраивать медиа и входные файлы",
          )}
          checked={value.export.embedMedia}
          onChange={(v) => exp("embedMedia", v)}
        />
        {(
          [
            ["metadata", "Front matter", "Метаданные YAML"],
            ["title", "Title heading", "Заголовок"],
            ["source", "Source links", "Ссылка на источник"],
            ["timestamps", "Available timestamps", "Доступные даты"],
            ["images", "Image references", "Ссылки на изображения"],
            ["links", "Keep links", "Сохранять ссылки"],
            ["outline", "Heading outline", "Оглавление"],
            ["manifest", "ZIP manifest and report", "Манифест и отчёт в ZIP"],
          ] as const
        ).map(([key, en, rus]) => (
          <Toggle
            key={key}
            label={t(en, rus)}
            checked={value.export[key]}
            onChange={(v) => exp(key, v)}
          />
        ))}
        <p className="hint">
          {t(
            "HTML always embeds enabled images, audio/video and input files for offline use. Enable embedding for Markdown too (requires a data-URL-capable viewer). Inaccessible files fail that chat’s export; it is excluded from cleanup. Limits: 20 MiB/file, 64 MiB/chat, 100 resources. Only loaded content is available; turn on images and links to include all media.",
            "HTML встраивает включённые изображения, аудио/видео и файлы для офлайн-просмотра. Для Markdown включите встраивание (нужен просмотрщик с data URL). Недоступные файлы прерывают экспорт беседы и исключают её из очистки. Лимиты: 20 МиБ/файл, 64 МиБ/беседа, 100 ресурсов. Включите изображения и ссылки для всех медиа.",
          )}
        </p>
        <label>
          {t("Filename pattern", "Шаблон имени")}
          <input
            aria-label="Filename pattern"
            value={value.export.filename}
            onChange={(e) => exp("filename", e.target.value)}
          />
        </label>
        <small>{"{platform} · {date} · {slug} · {id}"}</small>
      </section>
      <section className="settings-card">
        <h3>{t("Bulk operations", "Пакетные операции")}</h3>
        <label>
          {t("Pause every N items", "Пауза каждые N записей")}
          <input
            aria-label="Batch size"
            type="number"
            min="1"
            max="25"
            value={value.batchSize}
            onChange={(e) =>
              set("batchSize", Math.min(25, Math.max(1, +e.target.value)))
            }
          />
        </label>
        <label>
          {t("Pause (milliseconds)", "Пауза (миллисекунды)")}
          <input
            aria-label="Operation delay"
            type="number"
            min="0"
            max="10000"
            value={value.delayMs}
            onChange={(e) =>
              set("delayMs", Math.min(10000, Math.max(0, +e.target.value)))
            }
          />
        </label>
        <Toggle
          label={t("Stop on first error", "Остановить при ошибке")}
          checked={value.stopOnError}
          onChange={(v) => set("stopOnError", v)}
        />
        <Toggle
          label={t("Backup before native archive", "Копия перед архивацией")}
          checked={value.backupArchive}
          onChange={(v) => set("backupArchive", v)}
        />
        <Toggle
          label={t("Backup before native deletion", "Копия перед удалением")}
          checked={value.backupDelete}
          onChange={(v) => set("backupDelete", v)}
        />
        <p className="hint">
          {t(
            "Native actions require verified platform support. Destructive confirmations are mandatory.",
            "Нужна проверенная поддержка платформы. Подтверждение удаления обязательно.",
          )}
        </p>
      </section>
      <section className="settings-card">
        <h3>{t("Privacy", "Конфиденциальность")}</h3>
        <Toggle
          label={t(
            "Keep activity counts locally",
            "Сохранять счётчики операций",
          )}
          checked={value.history}
          onChange={(v) => set("history", v)}
        />
        <p className="hint">
          {t(
            "No telemetry. Content stays in memory until you download or copy it. Preferences and selected IDs are stored on this website’s origin.",
            "Без телеметрии. Содержимое хранится в памяти до сохранения или копирования. Настройки и выбранные ID сохраняются на домене сайта.",
          )}
        </p>
        <button className="danger-text" onClick={onReset}>
          {t(
            "Reset local preferences and activity",
            "Сбросить настройки и историю",
          )}
        </button>
      </section>
    </div>
  );
}
