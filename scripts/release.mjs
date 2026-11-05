import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
const file = "AI-Chat-Markdown-Manager.user.js";
const script = readFileSync(`dist/${file}`, "utf8");
if (
  !script.startsWith("// ==UserScript==") ||
  !script.includes("// @version      2.1.0")
)
  throw new Error("Invalid release metadata");
if (/(?:@require|sourceMappingURL|import\s*\(|https:\/\/cdn\.)/.test(script))
  throw new Error("Unexpected external runtime or source map");
if (readdirSync("dist").some((p) => p !== file))
  throw new Error("Distributable must be a single self-contained userscript");
const install = `AI Chat Markdown Manager v2.1.0\n\nInstall ${file} using Safari Userscripts or Tampermonkey.\n1. Enable the manager extension and allow the intended website.\n2. Userscripts: copy this file into the scripts directory configured in its app.\n   Tampermonkey: Dashboard > Create a new script; paste the entire file and save.\n3. Disable the old v1.2 script and duplicate installations; reload the chat website.\n4. Click the floating file icon. Alt+Shift+E restores it; Alt+Shift+M saves Markdown.\n\nChatGPT/Gemini/Claude ZIP exports open selected native chat links automatically,\nwait for messages and restore the starting chat. Loading may mark chats read.\nDiscovery/content remain partial; unavailable links fail per item.\nOn YouTube allow the site and reload; open YouTube timedtext for automatic caption\nlanguages and direct TXT/VTT downloads. No source-file download is needed.\nNative archive is unsupported and Gemini deletion remains disabled pending authenticated validation.\nNo server, remote code, or telemetry. Keep downloaded conversations private.\nSee https://github.com/gubnota/ai_chat_markdown_manager for full documentation.\n`;
const files = { [file]: strToU8(script), "INSTALL.txt": strToU8(install) };
for (const name of [
  "LICENSE",
  "LICENSE-MIT",
  "LICENSE-APACHE",
  "THIRD-PARTY-NOTICES.md",
])
  files[name] = strToU8(readFileSync(name, "utf8"));
const zipName = "AI-Chat-Markdown-Manager-v2.1.0.zip";
const archive = zipSync(files, { level: 6 });
writeFileSync(zipName, archive);
// Paths are relative to the repository root; dist/ remains a single script.
writeFileSync(
  "SHA256SUMS",
  [
    [createHash("sha256").update(script).digest("hex"), `dist/${file}`],
    [createHash("sha256").update(archive).digest("hex"), zipName],
  ]
    .map(([hash, path]) => `${hash}  ${path}\n`)
    .join(""),
);
console.log(
  `Packaged ${file} (${Buffer.byteLength(script)} bytes) and release ZIP.`,
);
