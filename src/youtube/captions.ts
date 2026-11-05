import { parseTimedtext, type CaptionCue } from "./timedtext";
export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name: string;
  translatable: boolean;
}
export interface CaptionLanguage {
  languageCode: string;
  name: string;
}
export interface CaptionTracks {
  videoId: string;
  title: string;
  tracks: CaptionTrack[];
  translations: CaptionLanguage[];
}
interface Label {
  simpleText?: string;
  runs?: { text: string }[];
}
interface Player {
  videoDetails?: { videoId?: string; title?: string };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: {
        baseUrl: string;
        languageCode: string;
        name: Label;
        kind?: string;
        isTranslatable?: boolean;
      }[];
      translationLanguages?: { languageCode: string; languageName: Label }[];
    };
  };
}
const label = (name?: Label) =>
  name?.simpleText ?? name?.runs?.map((r) => r.text).join("") ?? "";
export function currentVideoId(): string | undefined {
  if (!/^(www\.|m\.)?youtube\.com$/.test(location.hostname)) return;
  return (
    new URL(location.href).searchParams.get("v") ??
    location.pathname.match(/^\/(?:shorts|live)\/([\w-]+)/)?.[1]
  );
}
export function timedtextUrl(
  raw: string,
  videoId: string,
  language?: string,
  json = true,
): URL {
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    ![
      "www.youtube.com",
      "youtube.com",
      "m.youtube.com",
      "video.google.com",
    ].includes(url.hostname) ||
    !["/api/timedtext", "/timedtext"].includes(url.pathname) ||
    url.searchParams.get("v") !== videoId ||
    url.username ||
    url.password ||
    url.port
  )
    throw new Error("Expected a YouTube timedtext URL for the current video.");
  if (language) {
    if (!/^[a-zA-Z0-9-]{2,35}$/.test(language))
      throw new Error("Invalid caption language.");
    url.searchParams.set("tlang", language);
  }
  if (json) url.searchParams.set("fmt", "json3");
  return url;
}
/** Prefer the video's actual caption request, which can carry fresh signed parameters. */
export function capturedTimedtextUrl(
  baseUrl: string,
  videoId: string,
  language?: string,
  resources = performance
    .getEntriesByType("resource")
    .map((entry) => entry.name),
): string {
  const base = timedtextUrl(baseUrl, videoId, undefined, false);
  for (const raw of [...resources].reverse()) {
    try {
      const captured = timedtextUrl(raw, videoId, undefined, false);
      if (
        ["lang", "kind", "name"].every(
          (key) =>
            captured.searchParams.get(key) === base.searchParams.get(key),
        ) &&
        (!captured.searchParams.has("tlang") ||
          captured.searchParams.get("tlang") === language)
      ) {
        const originalFormat = base.searchParams.get("fmt");
        if (originalFormat) captured.searchParams.set("fmt", originalFormat);
        else captured.searchParams.delete("fmt");
        return captured.href;
      }
    } catch {
      // Resource timing also contains unrelated requests; never use them.
    }
  }
  return base.href;
}
export function parsePlayerData(
  source: string,
  videoId: string,
): CaptionTracks {
  // Extract balanced JSON without executing host scripts or accepting another video's stale SPA data.
  const starts = [
    ...source.matchAll(
      /(?:ytInitialPlayerResponse\s*=\s*|["']ytInitialPlayerResponse["']\s*:\s*)\{/g,
    ),
  ];
  for (const match of starts) {
    const start = match.index! + match[0].length - 1;
    let depth = 0,
      quoted = false,
      escaped = false;
    for (let i = start; i < source.length; i++) {
      const char = source[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
        continue;
      }
      if (char === '"') quoted = true;
      else if (char === "{") depth++;
      else if (char === "}" && --depth === 0) {
        try {
          const player = JSON.parse(source.slice(start, i + 1)) as Player;
          if (player.videoDetails?.videoId !== videoId) break;
          const renderer = player.captions?.playerCaptionsTracklistRenderer;
          const tracks = (renderer?.captionTracks ?? []).flatMap((track) => {
            try {
              timedtextUrl(track.baseUrl, videoId);
              return [
                {
                  baseUrl: track.baseUrl,
                  languageCode: track.languageCode,
                  name: `${label(track.name) || track.languageCode}${track.kind === "asr" ? " (auto)" : ""}`,
                  translatable: !!track.isTranslatable,
                },
              ];
            } catch {
              return [];
            }
          });
          return {
            videoId,
            title: player.videoDetails.title || videoId,
            tracks,
            translations: (renderer?.translationLanguages ?? []).map(
              (lang) => ({
                languageCode: lang.languageCode,
                name: label(lang.languageName) || lang.languageCode,
              }),
            ),
          };
        } catch {
          break;
        }
      }
    }
  }
  throw new Error(
    "Current video's caption tracks are unavailable. Open a YouTube video with captions and reload the tracks, or import timedtext below.",
  );
}
async function fetchText(url: URL, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.throwIfAborted();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new Error("Caption request timed out.")),
    20000,
  );
  try {
    const response = await fetch(url, {
      credentials: url.origin === location.origin ? "same-origin" : "omit",
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok)
      throw new Error(`Caption request failed (${response.status}).`);
    if (!response.body) throw new Error("Caption response is empty.");
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 5 * 1024 * 1024) {
        await reader.cancel();
        throw new Error("Caption response exceeds the 5 MiB limit.");
      }
      chunks.push(value);
    }
    const decoder = new TextDecoder();
    return (
      chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join("") +
      decoder.decode()
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export async function discoverCaptionTracks(
  signal?: AbortSignal,
): Promise<CaptionTracks> {
  const id = currentVideoId();
  if (!id)
    throw new Error(
      "Open a YouTube watch, shorts or live video to load caption languages, or import a saved response below.",
    );
  let result: CaptionTracks | undefined;
  try {
    result = parsePlayerData(
      [...document.scripts].map((s) => s.textContent).join("\n"),
      id,
    );
  } catch {
    /* SPA pages may retain the initial video's scripts. */
  }
  if (!result?.tracks.length)
    result = parsePlayerData(
      await fetchText(
        new URL(`/watch?v=${encodeURIComponent(id)}`, location.origin),
        signal,
      ),
      id,
    );
  if (currentVideoId() !== id)
    throw new Error(
      "Video changed while loading tracks. Reload the languages.",
    );
  if (!result.tracks.length)
    throw new Error(
      "This video does not expose caption tracks. You can still import a saved timedtext response below.",
    );
  return result;
}
export async function fetchCaptions(
  info: CaptionTracks,
  track: CaptionTrack,
  language?: string,
  signal?: AbortSignal,
): Promise<CaptionCue[]> {
  if (currentVideoId() !== info.videoId)
    throw new Error("Video changed. Reload caption tracks before downloading.");
  if (
    language &&
    (!track.translatable ||
      !info.translations.some((l) => l.languageCode === language))
  )
    throw new Error("Translation is unavailable for this track/language.");
  let last: unknown;
  const baseUrl = capturedTimedtextUrl(track.baseUrl, info.videoId, language);
  for (const json of [true, false]) {
    try {
      const cues = parseTimedtext(
        await fetchText(
          timedtextUrl(baseUrl, info.videoId, language, json),
          signal,
        ),
      );
      if (currentVideoId() !== info.videoId)
        throw new Error(
          "Video changed during download. Reload caption tracks.",
        );
      return cues;
    } catch (e) {
      signal?.throwIfAborted();
      last = e;
    }
  }
  throw new Error(
    `${last instanceof Error ? last.message : "Captions unavailable."} If YouTube blocks direct access, open captions on the video and try again, or import its timedtext response below.`,
  );
}
