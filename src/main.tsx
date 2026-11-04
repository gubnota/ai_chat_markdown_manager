// SPDX-License-Identifier: MIT OR Apache-2.0
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { createAdapter } from "./adapters";
import css from "./styles/index.css?inline";
const ROOT_ID = "__safari_md_export_root__";
function mount() {
  if (document.getElementById(ROOT_ID) || window.top !== window.self) return;
  const host = document.createElement("div");
  host.id = ROOT_ID;
  host.dataset.mdExportIgnore = "";
  host.style.cssText =
    "all:initial;position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;";
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = css;
  const app = document.createElement("div");
  shadow.append(style, app);
  document.body.append(host);
  createRoot(app).render(
    <React.StrictMode>
      <App adapter={createAdapter()} host={host} />
    </React.StrictMode>,
  );
}
if (document.body) mount();
else document.addEventListener("DOMContentLoaded", mount, { once: true });
