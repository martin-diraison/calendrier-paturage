/* Carte SVG : fond satellite + paddocks colorés (transparents) + troupeaux.
   Toucher une parcelle zoome dessus ; toucher un paddock (dans la parcelle zoomée) le choisit. */
import { GEO } from "./geo.js";
import { esc } from "./util.js";

export function mapHTML(o) {
  const { ctx, parcel, selId, look, markers = [], height = 360, showNames = true } = o;
  const width = Math.max(280, Math.min(window.innerWidth, 760) - 32);
  let vb;
  if (parcel && GEO.parcelById[parcel]) {
    const b = GEO.parcelById[parcel].bbox, w = b[2] - b[0], h = b[3] - b[1];
    vb = [b[0] - w * 0.08, b[1] - h * 0.08, w * 1.16, h * 1.16];
  } else {
    const e = GEO.extent, w = e[2] - e[0], h = e[3] - e[1];
    vb = [e[0] - w * 0.02, e[1] - h * 0.02, w * 1.04, h * 1.04];
  }
  const sc = Math.min(width / vb[2], height / vb[3]);
  const fs = (px) => (px / sc).toFixed(2);
  const R = GEO.raster;
  let s = `<div class="map" style="height:${height}px"><svg viewBox="${vb.map((v) => v.toFixed(1)).join(" ")}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Carte des paddocks">`;
  s += `<image href="${esc(R.img)}" x="0" y="0" width="${R.w}" height="${R.h}" preserveAspectRatio="none"></image>`;
  for (const p of GEO.parcels) s += `<path class="parcel-hit" d="${p.path}" data-a="${ctx}-parcel" data-id="${esc(p.id)}"></path>`;
  let selPath = "";
  for (const p of GEO.pads) {
    const lk = look(p.id);
    const dim = parcel && p.parcel !== parcel;
    const el = `<path class="pad c-${lk.cls}${dim ? " dim" : ""}${p.id === selId ? " sel" : ""}"${lk.fill ? ` style="fill:${lk.fill}"` : ""} d="${p.path}" data-a="${ctx}-pad" data-id="${esc(p.id)}"><title>${esc(lk.title || p.id)}</title></path>`;
    if (p.id === selId) selPath = el; else s += el;
  }
  s += selPath;
  for (const p of GEO.parcels) s += `<path class="parcel-line${parcel === p.id ? " on" : ""}" d="${p.path}"></path>`;
  if (parcel) {
    for (const p of GEO.pads) {
      if (p.parcel !== parcel) continue;
      const size = Math.min(p.bbox[2] - p.bbox[0], p.bbox[3] - p.bbox[1]) * sc;
      if (size < 18 && p.id !== selId) continue;
      s += `<text x="${p.c[0].toFixed(1)}" y="${p.c[1].toFixed(1)}" font-size="${fs(14)}" stroke-width="${fs(3)}" text-anchor="middle" dominant-baseline="central">${esc(p.num)}</text>`;
    }
  } else {
    for (const p of GEO.parcels) {
      const cx = (p.bbox[0] + p.bbox[2]) / 2, cy = (p.bbox[1] + p.bbox[3]) / 2;
      s += `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-size="${fs(12)}" stroke-width="${fs(3)}" text-anchor="middle" dominant-baseline="central" opacity=".9">${esc(p.label)}</text>`;
    }
  }
  /* troupeaux : un point coloré (+ nom) sur leur paddock */
  const byPad = {};
  for (const m of markers) (byPad[m.padId] = byPad[m.padId] || []).push(m);
  for (const pid in byPad) {
    const p = GEO.byId[pid]; if (!p) continue;
    const list = byPad[pid], gap = 16 / sc, y = p.c[1] - (parcel ? 14 / sc : 0);
    list.forEach((m, i) => {
      const x = p.c[0] + (i - (list.length - 1) / 2) * gap;
      s += `<circle class="mk" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${fs(7)}" fill="${esc(m.color)}"></circle>`;
    });
    if (showNames) s += `<text x="${p.c[0].toFixed(1)}" y="${(y + 16 / sc).toFixed(1)}" font-size="${fs(12)}" stroke-width="${fs(3)}" text-anchor="middle" dominant-baseline="central">${esc(list.map((m) => m.name).join(" · "))}</text>`;
  }
  s += `</svg>`;
  if (parcel) s += `<button type="button" class="zoomout" data-a="${ctx}-unzoom">‹ Toute la ferme</button>`;
  s += `</div>`;
  return s;
}
