// SPDX-License-Identifier: MIT OR Apache-2.0
import type { ExportOptions } from "../types";
import { canvasImageSource, rasterizeImage } from "./attachments";

const mapContainers =
  '.leaflet-container, .mapboxgl-map, .maplibregl-map, .gm-style, [data-map-widget], [data-testid="map-widget"], [data-testid="map-container"]';
const mapTiles =
  "img.leaflet-tile, img.leaflet-image-layer, img.leaflet-marker-icon, img[data-map-tile]";
const mapLabel = /\b(?:maps?|karte|carte)\b|карт[аыуе]/i;
export const unavailableMapPreview = "Map preview unavailable in this export.";

/** Convert the map already visible in a message to portable Markdown media. */
export function mapWidgetMarkdown(
  widget: Element,
  { images, links }: Pick<ExportOptions, "images" | "links">,
): string | undefined {
  const container = widget.matches(mapContainers);
  const iframe = widget.matches("iframe");
  if (!container && !iframe) return undefined;
  const frame = iframe
    ? (widget as HTMLIFrameElement)
    : widget.querySelector<HTMLIFrameElement>("iframe");
  const frameUrl = frame && webUrl(frame.getAttribute("src"), frame);
  const mapFrame =
    frame &&
    (mapLabel.test(frame.title) || (frameUrl && knownMapUrl(frameUrl)));
  if (!container && !mapFrame) return undefined;
  if (!images && !links) return "";

  const label = (widget.getAttribute("aria-label") || frame?.title || "")
    .replace(/[\s\\[\]]+/g, " ")
    .trim()
    .slice(0, 120);
  const preview = images ? snapshot(widget, mapFrame ? frame : null) : "";
  const mapLink = links
    ? webUrl(widget.getAttribute("data-map-url"), widget) ||
      (mapFrame ? frameUrl : null) ||
      Array.from(widget.querySelectorAll("a[href]"), (link) =>
        webUrl(link.getAttribute("href"), link),
      ).find((url) => url && knownMapUrl(url))
    : null;
  const parts: string[] = [];
  if (preview) parts.push(`![${label ? `Map — ${label}` : "Map"}](${preview})`);
  else if (images || !mapLink) parts.push(`*${unavailableMapPreview}*`);
  if (mapLink) {
    const href = mapLink.href.replace(/[()]/g, (char) =>
      char === "(" ? "%28" : "%29",
    );
    parts.push(`[Open original map](${href})`);
  }
  return `\n\n${parts.join("\n\n")}\n\n`;
}

function webUrl(source: string | null, node: Element): URL | null {
  if (!source?.trim()) return null;
  try {
    const url = new URL(source, node.baseURI);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password
      ? url
      : null;
  } catch {
    return null;
  }
}

function knownMapUrl({ hostname, pathname }: URL): boolean {
  return (
    (/^(?:(?:www|maps)\.)?google\.(?:com|[a-z]{2}|(?:co|com)\.[a-z]{2})$/i.test(hostname) &&
      (hostname.startsWith("maps.") || /^\/maps(?:\/|$)/.test(pathname))) ||
    /^(?:[a-z0-9-]+\.)*(?:openstreetmap\.org|mapbox\.com|arcgis\.com|maps\.apple\.com)$/i.test(
      hostname,
    ) ||
    hostname === "maps.app.goo.gl"
  );
}

function snapshot(widget: Element, frame: HTMLIFrameElement | null): string {
  const root = frame?.contentDocument?.body || widget;
  const staticImage = root.querySelector<HTMLImageElement>(
    'img[data-map-preview], img[data-map-image], img[src*="staticmap"], img[src*="/static/"], img:only-child',
  );
  for (const canvas of root.querySelectorAll("canvas")) {
    const result = canvasPreview(canvas);
    if (result) return result;
  }
  const tiledMap = root.matches(mapContainers)
    ? root
    : root.querySelector(mapContainers);
  return (
    (tiledMap && tilePreview(tiledMap)) ||
    (staticImage && !staticImage.matches(mapTiles)
      ? rasterizeImage(staticImage)
      : "")
  );
}

function canvasPreview(canvas: HTMLCanvasElement): string {
  if (!canvas.width || !canvas.height || !canvas.getClientRects().length)
    return "";
  const probe = canvas.ownerDocument.createElement("canvas");
  probe.width = probe.height = 8;
  const context = probe.getContext("2d");
  if (!context) return "";
  try {
    context.drawImage(canvas, 0, 0, 8, 8);
    // WebGL can discard its drawing buffer before export, leaving transparent pixels.
    if (
      context
        .getImageData(0, 0, 8, 8)
        .data.some((value, index) => index % 4 === 3 && value)
    )
      return canvasImageSource(canvas);
  } catch {
    return "";
  }
  return "";
}

function tilePreview(widget: Element): string {
  const tiles = widget.querySelectorAll<HTMLImageElement>(mapTiles);
  const bounds = widget.getBoundingClientRect();
  if (!bounds.width || !bounds.height || !tiles.length || tiles.length > 128)
    return "";
  const scale = Math.min(1, 1536 / Math.max(bounds.width, bounds.height));
  const canvas = widget.ownerDocument.createElement("canvas");
  canvas.width = Math.ceil(bounds.width * scale);
  canvas.height = Math.ceil(bounds.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.scale(scale, scale);
  let drawn = false;
  try {
    for (const tile of tiles) {
      const rect = tile.getBoundingClientRect();
      if (
        !rect.width ||
        !rect.height ||
        rect.right <= bounds.left ||
        rect.bottom <= bounds.top ||
        rect.left >= bounds.right ||
        rect.top >= bounds.bottom
      )
        continue;
      const style = tile.ownerDocument.defaultView?.getComputedStyle(tile);
      if (style?.visibility === "hidden" || style?.opacity === "0") continue;
      if (!tile.complete || !tile.naturalWidth) return "";
      context.drawImage(
        tile,
        rect.left - bounds.left,
        rect.top - bounds.top,
        rect.width,
        rect.height,
      );
      drawn ||= !tile.classList.contains("leaflet-marker-icon");
    }
    return drawn ? canvasImageSource(canvas) : "";
  } catch {
    return "";
  }
}
