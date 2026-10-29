/* The exact Google tag snippet is installed once in index.html <head>.
 * This file only manages the local opt-out preference and allowlisted events.
 * No loader, config call or manual page_view is duplicated here.
 */
(() => {
  "use strict";
  const ID = "G-Z6WH0VTYBB";
  const KEY = "omochi-touch-analytics-consent";
  const URL_CANONICAL = "https://djnaoyaman.github.io/omochi-touch/";
  const status = document.getElementById("analyticsStatus");
  const yes = document.getElementById("allowAnalytics");
  const no = document.getElementById("denyAnalytics");
  let choice = "yes";
  try {
    if (localStorage.getItem(KEY) === "no") choice = "no";
  } catch {}
  window["ga-disable-" + ID] = choice === "no";
  function ui() {
    yes.setAttribute("aria-pressed", String(choice === "yes"));
    no.setAttribute("aria-pressed", String(choice === "no"));
    status.textContent =
      choice === "yes"
        ? "アクセス計測 ON（Googleタグ設置済み）"
        : "アクセス計測 OFF（このブラウザでは停止）";
  }
  function set(value) {
    choice = value;
    window["ga-disable-" + ID] = value === "no";
    try {
      localStorage.setItem(KEY, value);
    } catch {}
    ui();
  }
  yes.onclick = () => set("yes");
  no.onclick = () => set("no");
  function send(name, params = {}) {
    if (
      choice === "no" ||
      window["ga-disable-" + ID] ||
      typeof window.gtag !== "function"
    )
      return;
    window.gtag("event", name, {
      ...params,
      send_to: ID,
      page_location: URL_CANONICAL,
      page_referrer: "",
    });
  }
  const ints = {
    art_select: ["art_id", 0, 23],
    palette_select: ["palette_id", 0, 7],
    photo_add: ["asset_id", 0, 99],
    export_generated: ["item_count", 0, 60],
  };
  document.addEventListener("omochi-action", (event) => {
    const d = event.detail || {},
      rule = ints[d.name];
    if (rule) {
      const v = d[rule[0]];
      if (Number.isInteger(v) && v >= rule[1] && v <= rule[2])
        send(d.name, { [rule[0]]: v });
      return;
    }
    if (["text_add", "text_update", "layer_duplicate"].includes(d.name))
      send(d.name);
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "track")
      send("music_select", { selection_method: "list" });
  });
  document.addEventListener("click", (event) => {
    const b = event.target.closest("button");
    if (b && !b.disabled) {
      if (b.closest("#musicSites"))
        send("music_select", { selection_method: "collection" });
      else if (["nextTrack", "prevTrack"].includes(b.id))
        send("music_select", {
          selection_method: b.id === "nextTrack" ? "next" : "previous",
        });
      else if (["stopTrack", "muteTrack"].includes(b.id))
        send("music_control", {
          control: b.id === "stopTrack" ? "stop_request" : "mute_request",
        });
      else if (b.id === "sfxToggle")
        send("sound_toggle", {
          enabled: b.getAttribute("aria-pressed") === "true" ? 1 : 0,
        });
    }
    const a = event.target.closest("a");
    if (!a) return;
    const category =
      { youtubeLink: "youtube", recordLink: "record", siteLink: "music_site" }[
        a.id
      ] || (a.classList.contains("credit-link") ? "credit" : null);
    if (category) send("outbound_link", { destination: category });
    if (a.id === "downloadLink") send("png_download_click");
    if (a.id === "openImage") send("png_open_click");
  });
  ui();
})();
