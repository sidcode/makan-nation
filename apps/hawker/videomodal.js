// A YouTube video in a dialog, from youtube-nocookie.com, with its title, channel and a link to YouTube.
// Nothing loads from YouTube until someone presses play. The list is in apps/hawker/media/videos.json.

const ID = /^[A-Za-z0-9_-]{11}$/;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

let dialog = null;
let frame = null;
let title = null;
let meta = null;
let out = null;

function build() {
  dialog = el("dialog", "vmodal");
  dialog.setAttribute("aria-label", "Video");
  const head = el("div", "vmodal__head");
  title = el("h2", "vmodal__title");
  meta = el("p", "vmodal__meta");
  const close = el("button", "vmodal__close", "Close");
  close.type = "button";
  close.addEventListener("click", () => dialog.close());
  head.append(el("div", "", null), close);
  head.firstChild.append(title, meta);
  const box = el("div", "vmodal__frame");
  frame = el("iframe");
  frame.title = "YouTube video";
  frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  box.append(frame);
  out = el("a", "vmodal__out", "Watch on YouTube");
  out.target = "_blank";
  out.rel = "noopener";
  dialog.append(head, box, out);
  dialog.addEventListener("click", (e) => e.target === dialog && dialog.close());
  dialog.addEventListener("close", () => {
    frame.src = "about:blank";
    onClose?.();
  });
  document.body.append(dialog);
}

let onClose = null;

// v: { id, title, channel, year?, minutes? } from videos.json. done: called when it closes.
export function playVideo(v, done = null) {
  if (!v || !ID.test(v.id)) return;
  if (!dialog) build();
  onClose = done;
  // The video's own title, with any long dashes turned into commas for the page's style.
  title.textContent = String(v.title).replace(/\s*[\u2013\u2014]\s*/g, ", ");
  meta.textContent = [v.channel, v.year, v.minutes ? `${Math.round(v.minutes)} min` : null].filter(Boolean).join(" · ");
  out.href = `https://www.youtube.com/watch?v=${v.id}`;
  frame.src = `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`;
  dialog.showModal();
}

export const videoOpen = () => Boolean(dialog?.open);

// A small button that plays a video, for cards and sheets.
export function videoButton(v, text = null, done = null) {
  const b = el("button", "vbtn");
  b.type = "button";
  b.append(el("span", "vbtn__play", "▶"), el("span", "vbtn__text", text ?? v.title));
  b.title = `${String(v.title).replace(/\s*[\u2013\u2014]\s*/g, ", ")} (${v.channel})`;
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    playVideo(v, done);
  });
  return b;
}
