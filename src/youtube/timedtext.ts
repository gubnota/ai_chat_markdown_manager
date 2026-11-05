export interface CaptionCue {
  startMs: number;
  durationMs: number;
  text: string;
}
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
function normalize(cues: CaptionCue[]): CaptionCue[] {
  const valid = cues
    .filter((c) => finite(c.startMs) && finite(c.durationMs) && c.text.trim())
    .map((c) => ({ ...c, text: c.text.trim() }));
  if (!valid.length)
    throw new Error(
      "No caption text found. Supply a non-empty YouTube timedtext response (JSON3 or XML), or a VTT file.",
    );
  return valid.sort((a, b) => a.startMs - b.startMs);
}
export function parseTimedtext(input: string): CaptionCue[] {
  const source = input.replace(/^\uFEFF/, "").trim();
  if (!source)
    throw new Error(
      "The caption response is empty. Try opening the video's captions, then reload the tracks, or import a saved response.",
    );
  if (source.startsWith("{")) {
    let json: {
      events?: {
        tStartMs?: unknown;
        dDurationMs?: unknown;
        segs?: { utf8?: unknown }[];
      }[];
    };
    try {
      json = JSON.parse(source);
    } catch {
      throw new Error("Invalid timedtext JSON.");
    }
    if (!Array.isArray(json.events))
      throw new Error("Expected YouTube JSON3 with an events array.");
    return normalize(
      json.events
        .filter((e) => e && Array.isArray(e.segs) && finite(e.tStartMs))
        .map((e) => ({
          startMs: e.tStartMs as number,
          durationMs:
            e.dDurationMs === undefined ? 1000 : (e.dDurationMs as number),
          text: e
            .segs!.map((s) => (typeof s?.utf8 === "string" ? s.utf8 : ""))
            .join(""),
        })),
    );
  }
  if (source.startsWith("WEBVTT")) {
    const cues: CaptionCue[] = [];
    const time = (v: string) =>
      v.split(":").reduce((n, part) => n * 60 + Number(part), 0) * 1000;
    for (const block of source.replace(/\r/g, "").split(/\n\s*\n/)) {
      const lines = block.split("\n");
      const i = lines.findIndex((line) =>
        /^(?:\d+:)?\d{2}:\d{2}\.\d{3}\s+-->/.test(line),
      );
      if (i < 0) continue;
      const m = lines[i].match(
        /((?:\d+:)?\d{2}:\d{2}\.\d{3})\s+-->\s+((?:\d+:)?\d{2}:\d{2}\.\d{3})/,
      )!;
      const raw = lines
        .slice(i + 1)
        .join("\n")
        .replace(/<[^>]*>/g, "");
      const doc = new DOMParser().parseFromString(
        `<text>${raw}</text>`,
        "application/xml",
      );
      cues.push({
        startMs: time(m[1]),
        durationMs: time(m[2]) - time(m[1]),
        text: doc.querySelector("parsererror")
          ? raw
          : (doc.documentElement.textContent ?? ""),
      });
    }
    return normalize(cues);
  }
  const xml = new DOMParser().parseFromString(source, "application/xml");
  if (
    xml.querySelector("parsererror") ||
    !["transcript", "timedtext"].includes(xml.documentElement.tagName)
  )
    throw new Error(
      "Unsupported caption response. Expected JSON3, YouTube XML or WEBVTT.",
    );
  return normalize(
    [...xml.querySelectorAll("text, body > p")].map((node) => {
      const ms = node.tagName === "p";
      const start = node.getAttribute(ms ? "t" : "start");
      const duration = node.getAttribute(ms ? "d" : "dur");
      return {
        startMs: start === null ? NaN : Number(start) * (ms ? 1 : 1000),
        durationMs:
          duration === null ? 1000 : Number(duration) * (ms ? 1 : 1000),
        text: node.textContent ?? "",
      };
    }),
  );
}
export function cuesToText(cues: CaptionCue[]): string {
  return (
    normalize(cues)
      .map((c) => c.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim() + "\n"
  );
}
function timestamp(ms: number): string {
  const value = Math.round(ms);
  const hours = Math.floor(value / 3600000),
    minutes = Math.floor(value / 60000) % 60,
    seconds = Math.floor(value / 1000) % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(value % 1000).padStart(3, "0")}`;
}
export function cuesToVtt(cues: CaptionCue[]): string {
  return (
    "WEBVTT\n\n" +
    normalize(cues)
      .map(
        (c, i) =>
          `${i + 1}\n${timestamp(c.startMs)} --> ${timestamp(c.startMs + c.durationMs)}\n${c.text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\r/g, "")
            .replace(/\n\s*\n/g, "\n")}\n`,
      )
      .join("\n")
  );
}
