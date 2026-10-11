// Street-level views of a hawker centre for the customer mode's picker: the nearest KartaView photo
// (data/hawker-streetview.json, made by scripts/fetch-hawker-streetview.ts; CC BY-SA 4.0, shown from
// KartaView's servers with its photographer and date), as a 360-degree view you drag to look round, and
// Google Street View, which loads from Google only when someone presses its button.

import { Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, SphereGeometry, SRGBColorSpace, TextureLoader, WebGLRenderer } from "three";

let data = null;
export function loadStreetView() {
  data ??= import("../../data/hawker-streetview.json").then((m) => m.default ?? m).catch(() => ({ centres: {} }));
  return data;
}

const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// A panorama on the inside of a sphere: drag to look round, wheel or pinch to zoom, turning slowly by
// itself until someone touches it.
class Panorama {
  // yaw: where to look first, in the camera's own terms (see facing()).
  constructor(url, yaw = -Math.PI / 2) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "pano__canvas";
    this.yaw = yaw;
    this.pitch = 0;
    this.fov = 75;
    this.idle = true;
    this.live = true;
    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    this.camera = new PerspectiveCamera(this.fov, 2, 0.1, 100);
    this.scene = new Scene();
    const geo = new SphereGeometry(10, 48, 32);
    geo.scale(-1, 1, 1);
    this.mesh = new Mesh(geo, new MeshBasicMaterial({ color: 0x666666 }));
    this.scene.add(this.mesh);
    this.ready = new Promise((resolve, reject) => {
      new TextureLoader().setCrossOrigin("anonymous").load(
        url,
        (tex) => {
          tex.colorSpace = SRGBColorSpace;
          this.mesh.material.dispose();
          this.mesh.material = new MeshBasicMaterial({ map: tex });
          resolve();
        },
        undefined,
        reject,
      );
    });
    this.wire();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  wire() {
    const c = this.canvas;
    let drag = null;
    c.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch };
      this.idle = false;
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const k = (this.fov / 75) * 0.005;
      this.yaw = drag.yaw - (e.clientX - drag.x) * k;
      this.pitch = Math.max(-1.3, Math.min(1.3, drag.pitch + (e.clientY - drag.y) * k));
    });
    const end = () => (drag = null);
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
    c.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.idle = false;
        this.fov = Math.max(35, Math.min(95, this.fov + Math.sign(e.deltaY) * 5));
      },
      { passive: false },
    );
  }

  loop(t) {
    if (!this.live) return;
    const c = this.canvas;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (w && h && !document.hidden) {
      if (c.width !== Math.round(w * this.renderer.getPixelRatio())) {
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
      }
      if (this.idle && !reduce) this.yaw += 0.0012;
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
      const x = Math.cos(this.pitch) * Math.sin(this.yaw);
      const y = Math.sin(this.pitch);
      const z = Math.cos(this.pitch) * Math.cos(this.yaw);
      this.camera.lookAt(x, y, z);
      this.renderer.render(this.scene, this.camera);
    }
    requestAnimationFrame(this.loop);
  }

  destroy() {
    this.live = false;
    this.mesh.material.map?.dispose();
    this.mesh.material.dispose();
    this.mesh.geometry.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
  }
}

// Which way to look first: at the centre. The middle of a KartaView panorama faces the camera's heading;
// a point `rel` degrees clockwise of that sits that far to the right in the picture, which on this sphere
// is a yaw of -90 degrees minus rel.
function facing(p, centre) {
  if (p.heading == null || !Number.isFinite(centre.lat)) return -Math.PI / 2;
  const toRad = Math.PI / 180;
  const dx = (centre.lng - p.lng) * Math.cos(p.lat * toRad);
  const dy = centre.lat - p.lat;
  const bearing = Math.atan2(dx, dy) / toRad;
  return -Math.PI / 2 - (bearing - p.heading) * toRad;
}

// Google's own embed, as its "Share, embed a map" makes it; nothing loads until the button is pressed.
const googleEmbed = (lat, lng) => `https://www.google.com/maps/embed?pb=!6m6!1m5!2m2!1d${lat}!2d${lng}!4f-0!5f1`;
const googleLink = (lat, lng) => `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;

// The street view block for one centre. h: the page's element helper. Returns { el, destroy }.
export function streetView(h, centre, photos = []) {
  let pano = null;
  let shown = 0;
  const stage = h("div", { class: "sview__stage" });
  const cap = h("figcaption", {});
  const g = h("div", { class: "sview__google" });

  function showPhoto(i) {
    pano?.destroy();
    pano = null;
    const p = photos[i];
    if (!p) return;
    shown = i;
    if (p.pano && p.image) {
      pano = new Panorama(p.image, facing(p, centre));
      stage.replaceChildren(pano.canvas, h("span", { class: "sview__hint", text: "Drag to look round" }));
      pano.ready.catch(() => stage.replaceChildren(h("p", { class: "cnote", text: "The photo did not load. KartaView's pictures need the internet." })));
    } else {
      stage.replaceChildren(h("img", { src: p.image, alt: `Street-level photo near ${centre.name}`, loading: "lazy", referrerpolicy: "no-referrer" }));
    }
    cap.replaceChildren(
      `${p.pano ? "360-degree photo" : "Photo"} about ${p.metres} m from the centre, ${p.shot}${p.by ? `, by ${p.by}` : ""}. `,
      h("a", { href: p.page, target: "_blank", rel: "noopener", text: "KartaView, CC BY-SA 4.0" }),
      photos.length > 1 ? " · " : "",
      photos.length > 1 ? h("button", { class: "link link--inline", type: "button", text: `Another (${i + 1} of ${photos.length})`, onclick: () => showPhoto((shown + 1) % photos.length) }) : "",
      p.full ? " · " : "",
      p.full ? h("a", { href: p.full, target: "_blank", rel: "noopener", text: "full size" }) : "",
    );
  }

  g.replaceChildren(
    h("button", {
      class: "ghost sview__gbtn",
      type: "button",
      text: "Show Google Street View here",
      onclick: () =>
        g.replaceChildren(
          h("iframe", { class: "sview__frame", src: googleEmbed(centre.lat, centre.lng), title: `Google Street View near ${centre.name}`, loading: "lazy", allowfullscreen: true, referrerpolicy: "no-referrer-when-downgrade" }),
          h("p", { class: "cnote" }, "Google Street View, from Google. ", h("a", { href: googleLink(centre.lat, centre.lng), target: "_blank", rel: "noopener", text: "Open in Google Maps" })),
        ),
    }),
    h("span", { class: "cnote" }, " Loads from Google when pressed. ", h("a", { href: googleLink(centre.lat, centre.lng), target: "_blank", rel: "noopener", text: "Open in Google Maps" })),
  );

  const el = h(
    "figure",
    { class: "sview" },
    h("p", { class: "sview__head", text: "From the street" }),
    photos.length ? stage : h("p", { class: "cnote", text: "No open street-level photo on KartaView near this centre yet." }),
    photos.length ? cap : null,
    g,
  );
  if (photos.length) showPhoto(0);
  return { el, destroy: () => pano?.destroy() };
}
