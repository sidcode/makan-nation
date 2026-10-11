// A map of Singapore with every NEA hawker centre on it, for picking one in the customer mode. The base map
// is OneMap's (Singapore Land Authority), loaded from OneMap; under it are URA's planning areas from our own
// data, so the island's shape still shows offline. Leaflet draws it, and this module is loaded only when
// someone opens the map.

import L from "leaflet";
import landData from "../../data/hawker-singapore.json";

const ONEMAP = "https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png";
const ATTRIBUTION = '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener">OneMap</a> &copy; contributors | <a href="https://www.sla.gov.sg/" target="_blank" rel="noopener">Singapore Land Authority</a> | Planning areas: URA Master Plan 2019';
const COLOUR = { famous: "#f2b632", hdb: "#23303a", other: "#c8553d" };

export class CentreMap {
  // onPick(centre): someone clicked a centre's dot.
  constructor({ onPick }) {
    this.onPick = onPick;
    this.el = document.createElement("div");
    this.el.className = "cmap";
    this.markers = new Map();
    this.picked = null;
    this.map = null;
  }

  // Draws the map the first time it is in the page (Leaflet needs a size to start from).
  start() {
    if (this.map) {
      requestAnimationFrame(() => this.map.invalidateSize());
      return;
    }
    const sg = L.latLngBounds([1.15, 103.58], [1.48, 104.1]);
    this.map = L.map(this.el, { center: [1.3521, 103.8198], zoom: 11, minZoom: 11, maxZoom: 18, maxBounds: sg.pad(0.15), zoomSnap: 0.5, attributionControl: true });
    this.map.attributionControl.setPrefix(false);
    // Our own planning areas first: faint lines over the tiles, and the land itself when the tiles fail.
    this.land = L.layerGroup(
      (landData.areas ?? []).map((a) =>
        L.polygon(
          a.rings.map((r) => r.map(([lng, lat]) => [lat, lng])),
          { color: "#b9a888", weight: 0.6, fill: false, interactive: false },
        ),
      ),
    ).addTo(this.map);
    // Offline means no tile has loaded at all; tiles over open sea, outside OneMap's cover, fail anyway.
    let failed = 0;
    let loaded = 0;
    this.tiles = L.tileLayer(ONEMAP, { attribution: ATTRIBUTION, minZoom: 11, maxZoom: 19, detectRetina: true, bounds: L.latLngBounds([1.13, 103.55], [1.5, 104.12]) })
      .on("tileload", () => loaded++)
      .on("tileerror", () => {
        if (!loaded && ++failed === 6) {
          this.el.classList.add("is-offline");
          this.land.eachLayer((p) => p.setStyle({ fill: true, fillColor: "#f6ead2", fillOpacity: 1, color: "#2b1b12", weight: 0.8 }));
        }
      })
      .addTo(this.map);
    this.layer = L.layerGroup().addTo(this.map);
    requestAnimationFrame(() => this.map.invalidateSize());
  }

  // centres: [{ c, tag: "famous" | "hdb" | "other", name }]; picked: the chosen NEA record.
  show(centres, picked) {
    if (!this.map) return;
    const key = centres.map((x) => x.c.id).join(",");
    if (key !== this.shownKey) {
      this.shownKey = key;
      this.layer.clearLayers();
      this.markers.clear();
      for (const { c, tag, name } of centres) {
        if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
        const m = L.circleMarker([c.lat, c.lng], { radius: 6, color: "#fffaf0", weight: 1.5, fillColor: COLOUR[tag] ?? COLOUR.other, fillOpacity: 0.95 });
        m.bindTooltip(name, { direction: "top", offset: [0, -6] });
        m.on("click", () => this.onPick(c));
        m.addTo(this.layer);
        this.markers.set(c.id, m);
      }
    }
    this.pick(picked);
  }

  pick(c) {
    const was = this.picked && this.markers.get(this.picked.id);
    was?.setStyle({ radius: 6, color: "#fffaf0", weight: 1.5 });
    this.picked = c;
    const m = c && this.markers.get(c.id);
    if (!m) return;
    m.setStyle({ radius: 10, color: "#2b1b12", weight: 3 });
    m.bringToFront();
    if (!this.map.getBounds().pad(-0.1).contains(m.getLatLng())) this.map.panTo(m.getLatLng(), { animate: true });
  }
}

export const MAP_KEY = [
  ["famous", "Famous, looks like itself"],
  ["hdb", "HDB block"],
  ["other", "Other centres"],
].map(([k, t]) => ({ colour: COLOUR[k], text: t }));
