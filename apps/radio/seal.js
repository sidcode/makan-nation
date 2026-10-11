import { searchSongs, sealCapsule } from "./capsules.js";

const $ = (sel) => document.querySelector(sel);

const YEARS = [
  [2030, "2030"],
  [2040, "2040"],
  [2050, "2050"],
  [2065, "2065 (SG100)"],
];

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...kids.filter((k) => k != null && k !== false));
  return el;
}

export function initSealer({ onSealed, onOpenChange }) {
  const dialog = $("#sealer");
  const search = $("#sealSearch");
  const results = $("#sealResults");
  const note = $("#sealNote");
  const name = $("#sealName");
  const error = $("#sealError");
  const go = $("#sealGo");

  let chosen = null;
  let openYear = 2065;
  let timer = 0;
  let asked = "";
  const preview = new Audio();
  preview.addEventListener("ended", () => renderResults(lastSongs));
  let playing = null;
  let lastSongs = [];

  const open = () => {
    dialog.showModal();
    onOpenChange?.(true);
    search.focus();
  };
  const close = () => {
    preview.pause();
    playing = null;
    dialog.close();
  };
  dialog.addEventListener("close", () => {
    preview.pause();
    playing = null;
    onOpenChange?.(false);
  });
  $("#sealOpen").addEventListener("click", open);
  $("#sealClose").addEventListener("click", close);
  dialog.addEventListener("click", (e) => e.target === dialog && close());

  $("#sealYears").replaceChildren(
    ...YEARS.map(([year, label]) =>
      h(
        "label",
        { class: "years__chip" },
        h("input", {
          type: "radio",
          name: "openYear",
          value: String(year),
          checked: year === openYear,
          onchange: () => (openYear = year),
        }),
        h("span", { text: label }),
      ),
    ),
  );

  note.addEventListener("input", () => ($("#sealCount").textContent = `${note.value.length} / 200`));

  function status(text) {
    results.replaceChildren(h("li", { class: "results__status", text }));
  }

  function renderResults(songs) {
    lastSongs = songs;
    if (!songs.length) return status("Nothing yet. Try the artist's name.");
    results.replaceChildren(
      ...songs.map((s) => {
        const isChosen = chosen?.id === s.id;
        const isPlaying = playing === s.id && !preview.paused;
        return h(
          "li",
          { class: `song${isChosen ? " is-chosen" : ""}` },
          h(
            "button",
            {
              type: "button",
              class: "song__pick",
              "aria-pressed": String(isChosen),
              onclick: () => {
                chosen = s;
                error.textContent = "";
                renderResults(songs);
              },
            },
            h("img", { src: s.artwork, alt: "", loading: "lazy" }),
            h(
              "span",
              { class: "song__text" },
              h("strong", { text: s.title }),
              h("span", { text: [s.artist, s.year].filter(Boolean).join(" · ") }),
            ),
          ),
          h("button", {
            type: "button",
            class: "song__play",
            "aria-label": isPlaying ? `Stop ${s.title}` : `Play a bit of ${s.title}`,
            text: isPlaying ? "■" : "▶",
            onclick: () => {
              if (isPlaying) {
                preview.pause();
                playing = null;
              } else {
                preview.src = s.preview;
                preview.play().catch(() => {});
                playing = s.id;
              }
              renderResults(songs);
            },
          }),
        );
      }),
    );
  }

  search.addEventListener("input", () => {
    clearTimeout(timer);
    const q = search.value.trim();
    if (q.length < 2) return results.replaceChildren();
    timer = setTimeout(async () => {
      asked = q;
      status("Digging through the crates...");
      try {
        const songs = await searchSongs(q);
        if (asked !== q) return;
        renderResults(songs);
      } catch {
        status("The song shop is not answering.");
      }
    }, 250);
  });

  $("#sealForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!chosen) return (error.textContent = "Pick a song first.");
    if (!note.value.trim()) return (error.textContent = "Leave a note for the future.");
    go.disabled = true;
    go.textContent = "Sealing...";
    try {
      const body = await sealCapsule({ song: chosen, note: note.value, name: name.value, openYear });
      close();
      chosen = null;
      search.value = note.value = "";
      $("#sealCount").textContent = "0 / 200";
      results.replaceChildren();
      onSealed(body);
    } catch (err) {
      error.textContent = err.message;
    } finally {
      go.disabled = false;
      go.textContent = "Into the tin";
    }
  });
}
