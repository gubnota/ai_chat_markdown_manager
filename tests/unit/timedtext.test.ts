import { describe, expect, it } from "vitest";
import {
  cuesToText,
  cuesToVtt,
  parseTimedtext,
} from "../../src/youtube/timedtext";
import {
  capturedTimedtextUrl,
  parsePlayerData,
  timedtextUrl,
} from "../../src/youtube/captions";
const json = JSON.stringify({
  events: [
    {
      tStartMs: 1500,
      dDurationMs: 2500,
      segs: [{ utf8: "Hello " }, { utf8: "мир\n" }],
    },
    { tStartMs: 5000, segs: [{ utf8: "Second caption" }] },
    { tStartMs: 0, wWinId: 1 },
  ],
});
describe("YouTube timedtext conversion", () => {
  it("joins JSON3 segments, preserves Unicode, skips non-text events and defaults duration", () => {
    expect(parseTimedtext(json)).toEqual([
      { startMs: 1500, durationMs: 2500, text: "Hello мир" },
      { startMs: 5000, durationMs: 1000, text: "Second caption" },
    ]);
    expect(cuesToText(parseTimedtext(json))).toBe("Hello мир Second caption\n");
    expect(cuesToVtt(parseTimedtext(json))).toContain(
      "00:00:01.500 --> 00:00:04.000\nHello мир",
    );
  });
  it("reads original XML transcript seconds and decodes entities", () => {
    expect(
      parseTimedtext(
        '<transcript><text start="1.25" dur="2.5">A &amp; B</text></transcript>',
      ),
    ).toEqual([{ startMs: 1250, durationMs: 2500, text: "A & B" }]);
  });
  it("reads srv3 millisecond cues and segments", () => {
    expect(
      cuesToText(
        parseTimedtext(
          '<timedtext><body><p t="1400" d="800"><s>Hello </s><s>world</s></p></body></timedtext>',
        ),
      ),
    ).toBe("Hello world\n");
  });
  it("handles long durations without wrapping at 24 hours, escapes VTT markup", () => {
    const vtt = cuesToVtt([
      { startMs: 90000000, durationMs: 1000, text: "<b>A & B</b> --> C" },
    ]);
    expect(vtt).toContain("25:00:00.000 --> 25:00:01.000");
    expect(vtt).toContain("&lt;b&gt;A &amp; B&lt;/b&gt; --&gt; C");
    expect(cuesToText(parseTimedtext(vtt))).toContain("<b>A & B</b> --> C");
  });
  it("sorts cues and rejects empty, malformed and negative data instead of producing empty files", () => {
    for (const input of [
      "",
      '{"events":[]}',
      "{",
      "<html>Forbidden</html>",
      '{"events":[{"tStartMs":-1,"segs":[{"utf8":"bad"}]}]}',
      '{"events":[{"tStartMs":0,"dDurationMs":-2,"segs":[{"utf8":"bad"}]}]}',
    ])
      expect(() => parseTimedtext(input)).toThrow();
    expect(() => parseTimedtext('{"events":null}')).toThrow();
    expect(() =>
      parseTimedtext("WEBVTT\n\n00:00:04.000 --> 00:00:01.000\nbad"),
    ).toThrow();
  });
});
describe("caption track identity and signed URLs", () => {
  const url =
    "https://www.youtube.com/api/timedtext?v=video123&lang=en&signature=secret&pot=token&fmt=srv3";
  const player = (id = "video123") =>
    "var ytInitialPlayerResponse = " +
    JSON.stringify({
      videoDetails: { videoId: id, title: 'Escaped " } title' },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            {
              baseUrl: url,
              languageCode: "en",
              name: { runs: [{ text: "English" }] },
              isTranslatable: true,
            },
          ],
          translationLanguages: [
            { languageCode: "ru", languageName: { simpleText: "Russian" } },
          ],
        },
      },
    }) +
    ";";
  it("extracts balanced JSON without evaluating JavaScript and requires matching video", () => {
    const tracks = parsePlayerData(player(), "video123");
    expect(tracks.tracks[0].name).toBe("English");
    expect(tracks.translations[0].languageCode).toBe("ru");
    expect(() => parsePlayerData(player("stale"), "video123")).toThrow();
    expect(
      parsePlayerData(player("stale") + player(), "video123").videoId,
    ).toBe("video123");
  });
  it("preserves signature/tokens while selecting output and translation", () => {
    const target = timedtextUrl(url, "video123", "ru");
    expect(target.searchParams.get("signature")).toBe("secret");
    expect(target.searchParams.get("pot")).toBe("token");
    expect(target.searchParams.get("fmt")).toBe("json3");
    expect(target.searchParams.get("tlang")).toBe("ru");
    expect(
      timedtextUrl(url, "video123", undefined, false).searchParams.get("fmt"),
    ).toBe("srv3");
  });
  it("rejects foreign origins, credentials, endpoints and wrong video IDs", () => {
    for (const raw of [
      url.replace("www.youtube.com", "evil.example"),
      url.replace("https:", "http:"),
      url.replace("/api/timedtext", "/watch"),
      url.replace("video123", "other"),
      url.replace("https://", "https://user:pass@"),
      url.replace("www.youtube.com", "www.youtube.com.evil.example"),
    ])
      expect(() => timedtextUrl(raw, "video123")).toThrow();
  });
  it("automatically captures fresh matching video-page request parameters without mixing tracks", () => {
    const fresh = url.replace("pot=token", "pot=fresh");
    const resources = [
      fresh.replace("fmt=srv3", "fmt=json3"),
      fresh.replace("video123", "other"),
      fresh.replace("lang=en", "lang=ru"),
      fresh + "&tlang=es",
      fresh.replace("www.youtube.com", "evil.example"),
    ];
    expect(capturedTimedtextUrl(url, "video123", undefined, resources)).toBe(
      fresh,
    );
    expect(capturedTimedtextUrl(url, "video123", "es", resources)).toBe(
      fresh + "&tlang=es",
    );
    expect(capturedTimedtextUrl(url, "video123", undefined, [])).toBe(url);
  });
});
