import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
const original = readFileSync("Save-Page-as-Markdown-Safari.user.js", "utf8");
const matches = original
  .split("\n")
  .filter((line) => line.startsWith("// @match"));
for (const line of matches) {
  if (!/^\/\/ @match\s+\*:\/\/(?:\*\.)?[a-z0-9.-]+\/[^\s]*$/.test(line))
    throw new Error(`Invalid userscript match: ${line}`);
}
const youtubeMatches = ["youtube.com", "www.youtube.com", "m.youtube.com"].map(
  (host) => `// @match        *://${host}/*`,
);
const banner = [
  "// ==UserScript==",
  "// @name         AI Chat Markdown Manager",
  "// @namespace    https://github.com/gubnota/ai_chat_markdown_manager",
  "// @version      2.3.0",
  "// @description  Offline HTML/Markdown export and conversation management. Native operations require verified capabilities.",
  "// @author       gubnota (repository owner); inherited converter: Adem Kouki",
  "// @license      MIT OR Apache-2.0",
  ...matches,
  ...youtubeMatches,
  "// @run-at       document-idle",
  "// @grant        none",
  "// @inject-into  content",
  "// @noframes",
  "// ==/UserScript==",
].join("\n");
// Add metadata after minification: ordinary line comments are otherwise removed.
export default defineConfig(({ command }) => ({
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      command === "build" ? "production" : "development",
    ),
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "userscript-metadata",
      enforce: "post",
      generateBundle(_options, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === "chunk")
            chunk.code =
              banner +
              "\n" +
              chunk.code +
              "\n/*!\n" +
              readFileSync("THIRD-PARTY-NOTICES.md", "utf8").replaceAll(
                "*/",
                "* /",
              ) +
              "\n*/\n";
        }
      },
    },
  ],
  build: {
    lib: {
      entry: "src/main.tsx",
      formats: ["iife"],
      name: "AIChatMarkdownManager",
      fileName: () => "AI-Chat-Markdown-Manager.user.js",
    },
    target: "es2022",
    sourcemap: false,
    minify: true,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts"],
    restoreMocks: true,
  },
  server: { port: 5173, strictPort: true },
}));
