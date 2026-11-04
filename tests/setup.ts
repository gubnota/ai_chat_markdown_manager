import { JSDOM } from "jsdom";
// Node 26 exposes a non-browser localStorage global. Use a real origin-scoped
// jsdom Storage instance so tests exercise browser semantics and denied access.
const storage = new JSDOM("", { url: "http://localhost/" }).window.localStorage;
Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
});
Object.defineProperty(globalThis, "Storage", {
  value: Object.getPrototypeOf(storage).constructor,
  configurable: true,
});
