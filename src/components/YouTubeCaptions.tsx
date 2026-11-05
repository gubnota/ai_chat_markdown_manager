import { useCallback, useEffect, useRef, useState } from "react";
import {
  currentVideoId,
  discoverCaptionTracks,
  fetchCaptions,
  type CaptionTracks,
} from "../youtube/captions";
import {
  cuesToText,
  cuesToVtt,
  parseTimedtext,
  type CaptionCue,
} from "../youtube/timedtext";
import { download, safeFilename } from "../operations/export";
export function YouTubeCaptions({ ru }: { ru: boolean }) {
  const [info, setInfo] = useState<CaptionTracks>();
  const [track, setTrack] = useState("0");
  const [language, setLanguage] = useState("");
  const [input, setInput] = useState("");
  const [importName, setImportName] = useState("captions");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef<AbortController | undefined>(undefined);
  const t = (en: string, r: string) => (ru ? r : en);
  const job = useCallback(
    async (work: (signal: AbortSignal) => Promise<void>, replace = false) => {
      if (active.current && !replace) return;
      if (replace) active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      setBusy(true);
      setMessage("");
      try {
        await work(controller.signal);
      } catch (e) {
        if (!controller.signal.aborted)
          setMessage(e instanceof Error ? e.message : String(e));
      } finally {
        if (active.current === controller) {
          active.current = undefined;
          setBusy(false);
        }
      }
    },
    [],
  );
  const load = useCallback(
    () =>
      job(async (signal) => {
        setInfo(undefined);
        const result = await discoverCaptionTracks(signal);
        signal.throwIfAborted();
        setInfo(result);
        setTrack("0");
        setLanguage("");
      }, true),
    [job],
  );
  useEffect(() => {
    let previous: string | undefined;
    const refresh = () => {
      const id = currentVideoId();
      if (id === previous) return;
      previous = id;
      active.current?.abort();
      setInfo(undefined);
      if (id) void load();
    };
    refresh();
    document.addEventListener("yt-navigate-finish", refresh);
    window.addEventListener("popstate", refresh);
    return () => {
      document.removeEventListener("yt-navigate-finish", refresh);
      window.removeEventListener("popstate", refresh);
      active.current?.abort();
    };
  }, [load]);
  const save = (cues: CaptionCue[], name: string, format: "txt" | "vtt") => {
    download(
      format === "txt" ? cuesToText(cues) : cuesToVtt(cues),
      `${safeFilename(name)}.${format}`,
      format === "txt" ? "text/plain;charset=utf-8" : "text/vtt;charset=utf-8",
    );
    setMessage(t("Caption file downloaded.", "Субтитры сохранены."));
  };
  return (
    <div className="detail-body scroll-area captions-body">
      <h2>{t("YouTube timedtext", "Субтитры YouTube")}</h2>
      <p className="hint">
        {t(
          "Captions are detected automatically from this video. Choose a language and download TXT or WebVTT directly—no source file needed. Requests go directly to YouTube; captions must be available.",
          "Субтитры текущего видео определяются автоматически. Выберите язык и скачайте TXT или WebVTT — исходный файл не нужен. Запросы идут напрямую в YouTube; субтитры должны быть доступны.",
        )}
      </p>
      <button disabled={busy} onClick={() => void load()}>
        {t("Load caption languages", "Загрузить языки субтитров")}
      </button>
      {info && (
        <>
          <p>{info.title}</p>
          <label>
            {t("Caption track", "Дорожка субтитров")}
            <select
              aria-label="Caption track"
              value={track}
              disabled={busy}
              onChange={(e) => {
                setTrack(e.target.value);
                setLanguage("");
              }}
            >
              {info.tracks.map((item, i) => (
                <option key={i} value={i}>
                  {item.name} · {item.languageCode}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Translate to", "Перевести на")}
            <select
              aria-label="Translate captions to"
              value={language}
              disabled={busy || !info.tracks[+track]?.translatable}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="">
                {t("Original language", "Исходный язык")}
              </option>
              {info.translations.map((item) => (
                <option key={item.languageCode} value={item.languageCode}>
                  {item.name} · {item.languageCode}
                </option>
              ))}
            </select>
          </label>
          <div className="button-row">
            {(["txt", "vtt"] as const).map((format) => (
              <button
                key={format}
                disabled={busy}
                onClick={() =>
                  void job(async (signal) => {
                    const source = info.tracks[+track];
                    const cues = await fetchCaptions(
                      info,
                      source,
                      language || undefined,
                      signal,
                    );
                    save(
                      cues,
                      `${info.title}-${info.videoId}-${language || source.languageCode}`,
                      format,
                    );
                  })
                }
              >
                {t("Download", "Скачать")} {format.toUpperCase()}
              </button>
            ))}
          </div>
        </>
      )}
      <details>
        <summary>
          {t(
            "Import saved timedtext (optional)",
            "Импорт субтитров (необязательно)",
          )}
        </summary>
        <p className="hint">
          {t(
            "Import or paste JSON3 (events/segs), YouTube XML or VTT. This also works when direct caption access is blocked. Files stay in this tab.",
            "Вставьте или откройте JSON3 (events/segs), XML YouTube или VTT. Работает и при блокировке прямой загрузки. Файлы остаются в этой вкладке.",
          )}
        </p>
        <input
          aria-label="Import timedtext file"
          type="file"
          accept=".json,.json3,.xml,.vtt,.txt"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void job(async () => {
              if (file.size > 5 * 1024 * 1024)
                throw new Error("Caption file exceeds the 5 MiB limit.");
              setInput(await file.text());
              setImportName(file.name.replace(/\.[^.]+$/, ""));
            });
          }}
        />
        <textarea
          aria-label="Timedtext response"
          rows={5}
          value={input}
          disabled={busy}
          placeholder='{"events":[{"tStartMs":0,"dDurationMs":1000,"segs":[{"utf8":"Hello"}]}]}'
          onChange={(e) => {
            setInput(e.target.value);
            setImportName("captions");
          }}
        />
        <div className="button-row">
          {(["txt", "vtt"] as const).map((format) => (
            <button
              key={format}
              disabled={busy || !input.trim()}
              onClick={() => {
                try {
                  if (input.length > 5 * 1024 * 1024)
                    throw new Error(
                      "Caption response exceeds the 5 MiB limit.",
                    );
                  save(parseTimedtext(input), importName, format);
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              {t("Convert to", "Преобразовать в")} {format.toUpperCase()}
            </button>
          ))}
        </div>
      </details>
      {busy && (
        <button onClick={() => active.current?.abort()}>
          {t("Cancel caption request", "Отменить запрос")}
        </button>
      )}
      <p role="status" aria-live="polite">
        {busy ? t("Loading captions…", "Загрузка субтитров…") : message}
      </p>
    </div>
  );
}
