// Short silent loops of the gesture behind a dish (apps/hawker/media/loops.json, cut by
// scripts/make-dish-loops.ts from openly licensed footage, each credited). They play like GIFs: muted, round
// and round, but only while on screen, never for someone who asks for less motion until they tap, and a tap
// pauses or plays one.

import { manifest, mediaUrl } from "./media.js";

const reduce = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

let list = null;
// Loads the list once; resolves to { dish: loop } (empty when there is none).
export function loadLoops() {
  list ??= manifest("loops").then((m) => m?.loops ?? {});
  return list;
}

let seen = null;
function watch(video) {
  if (typeof IntersectionObserver !== "function") return;
  seen ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target;
        if (e.isIntersecting && !v.dataset.paused && !reduce.matches) v.play().catch(() => {});
        else v.pause();
      }
    },
    { rootMargin: "80px" },
  );
  seen.observe(video);
}

// A figure with the loop and its credit. h: the page's element helper. size: "card" | "strip".
export function loopFigure(h, loop, { size = "card", label = null } = {}) {
  if (!loop) return null;
  // VP9 for most browsers, H.264 for Safari.
  const video = h(
    "video",
    {
      class: "loop__video",
      poster: mediaUrl(`loops/${loop.poster}`),
      muted: true,
      loop: true,
      playsinline: true,
      preload: "none",
      "aria-label": loop.shows,
      width: 480,
      height: 360,
    },
    h("source", { src: mediaUrl(`loops/${loop.file.replace(/\.mp4$/, ".webm")}`), type: "video/webm" }),
    h("source", { src: mediaUrl(`loops/${loop.file}`), type: "video/mp4" }),
  );
  // Some browsers only honour muted as a property, and only then allow playing without a tap.
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute("muted", "");
  const toggle = () => {
    if (video.paused) {
      delete video.dataset.paused;
      video.play().catch(() => {});
    } else {
      video.dataset.paused = "1";
      video.pause();
    }
    fig.classList.toggle("is-paused", video.paused);
  };
  video.addEventListener("click", toggle);
  const s = loop.source;
  // CC BY asks us to say what we changed. Our own footage has no page to link to.
  const credit = `Video: ${[s.author, s.licence, /^CC BY/.test(s.licence ?? "") && s.site !== "own" ? "cropped and looped" : null].filter(Boolean).join(", ")}`;
  const fig = h(
    "figure",
    { class: `loop loop--${size}${reduce.matches ? " is-paused" : ""}` },
    video,
    h("button", { class: "loop__play", type: "button", "aria-label": "Play or pause the loop", onclick: toggle }),
    h(
      "figcaption",
      {},
      label ? h("strong", { text: `${label} ` }) : null,
      `${loop.shows} `,
      s.page ? h("a", { href: s.page, target: "_blank", rel: "noopener", text: credit }) : credit,
      s.filmedAt ? `. Filmed in ${s.filmedAt}.` : "",
    ),
  );
  watch(video);
  return fig;
}
