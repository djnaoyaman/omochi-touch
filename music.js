/* One visible YouTube player. Continuous playback starts only after user playback. */
(() => {
  "use strict";
  if (!window.MUSIC?.length) return;
  const byId = (id) => document.getElementById(id);
  let site = 0,
    muted = false,
    player = null,
    ready = false;
  let playIntent = false,
    switching = false,
    frame = null;
  const track = () => MUSIC[site].tracks[+byId("track").value || 0];
  const status = (text) => {
    byId("musicStatus").textContent = text;
  };
  function links() {
    const t = track();
    byId("musicTitle").textContent = t.title;
    byId("musicArtist").textContent = t.artist;
    byId("musicPosition").textContent =
      String((+byId("track").value || 0) + 1).padStart(2, "0") +
      " / " +
      MUSIC[site].tracks.length;
    byId("recordLink").href = t.url;
    byId("youtubeLink").href = "https://www.youtube.com/watch?v=" + t.youtubeId;
    byId("siteLink").href = MUSIC[site].url;
    byId("siteLink").textContent = MUSIC[site].name + " ↗";
    if (frame) frame.title = t.artist + " — " + t.title;
  }
  function blocked() {
    switching = false;
    byId("playTrack").hidden = false;
    byId("playTrack").textContent = "▶ 再生を続ける";
    status(
      "ブラウザが自動再生を止めました。「再生を続ける」か動画の ▶ をタップしてください。",
    );
  }
  function selectTrack() {
    links();
    if (!ready) {
      // The native image remains playable if the optional API cannot load.
      frame.src = embedURL();
      status(
        "画像の ▶ で再生。一度再生すると、選曲・次の曲も続けて流れます。",
      );
      return;
    }
    switching = true;
    byId("playTrack").hidden = true;
    if (playIntent) {
      player.loadVideoById(track().youtubeId);
      status("曲を切り替えています…");
    } else {
      player.cueVideoById(track().youtubeId);
      status(
        "画像の ▶ をタップして再生。停止中は曲を変えても自動再生しません。",
      );
    }
  }
  function advance(delta) {
    const count = MUSIC[site].tracks.length;
    byId("track").value = String(
      ((+byId("track").value || 0) + delta + count) % count,
    );
    selectTrack();
  }
  function stateChanged(event) {
    if (event.data === 1) {
      playIntent = true;
      switching = false;
      byId("playTrack").hidden = true;
      status(
        "連続再生中。選曲・次へ・前へも再生を続けます。動画の一時停止または「停止」で解除。",
      );
    } else if (event.data === 2) {
      playIntent = false;
      switching = false;
      status("一時停止中。画像の ▶ で連続再生を再開できます。");
    } else if (event.data === 5) {
      switching = false;
    } else if (event.data === 0 && playIntent && !switching) {
      advance(1);
    }
  }
  function stop() {
    playIntent = false;
    switching = false;
    byId("playTrack").hidden = true;
    if (ready) player.stopVideo();
    else frame.src = embedURL();
    status(
      "停止しました。次の選曲も停止したままです。画像の ▶ で再開できます。",
    );
  }
  function render() {
    byId("track").replaceChildren();
    MUSIC[site].tracks.forEach((t, i) => {
      const o = document.createElement("option");
      o.value = i;
      o.textContent =
        String(i + 1).padStart(2, "0") + " / " + t.artist + " — " + t.title;
      byId("track").append(o);
    });
    byId("track").value = "0";
    [...byId("musicSites").children].forEach((b, i) =>
      b.setAttribute("aria-pressed", i === site),
    );
    selectTrack();
  }
  function embedURL() {
    return (
      "https://www.youtube-nocookie.com/embed/" +
      track().youtubeId +
      "?autoplay=0&controls=1&playsinline=1&enablejsapi=1&rel=0&origin=" +
      encodeURIComponent(location.origin)
    );
  }
  frame = document.createElement("iframe");
  frame.id = "omochi-youtube-player";
  frame.src = embedURL();
  frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.allowFullscreen = true;
  byId("player").replaceChildren(frame);
  MUSIC.forEach((s, i) => {
    const b = document.createElement("button");
    b.textContent = s.name + " / 10 SELECTIONS";
    b.onclick = () => {
      site = i;
      render();
    };
    byId("musicSites").append(b);
  });
  byId("track").onchange = selectTrack;
  byId("nextTrack").onclick = () => advance(1);
  byId("prevTrack").onclick = () => advance(-1);
  byId("stopTrack").disabled = false;
  byId("stopTrack").onclick = stop;
  byId("youtubeLink").onclick = stop;
  byId("playTrack").onclick = () => {
    if (ready) {
      playIntent = true;
      switching = false;
      player.playVideo();
    } else
      status(
        "動画画像の ▶ をタップしてください。連続再生機能は読み込み待ちです。",
      );
  };
  byId("muteTrack").disabled = false;
  byId("muteTrack").onclick = () => {
    muted = !muted;
    if (ready) player[muted ? "mute" : "unMute"]();
    else
      frame.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: muted ? "mute" : "unMute",
          args: [],
        }),
        "https://www.youtube-nocookie.com",
      );
    byId("muteTrack").textContent = muted ? "音声 ON" : "音声 OFF";
    byId("muteTrack").setAttribute("aria-pressed", String(muted));
  };
  byId("dismissNote").onclick = () => {
    byId("premiumNote").hidden = true;
    try {
      sessionStorage.setItem("omochi-premium-note", "1");
    } catch {}
  };
  render();
  function connectPlayer() {
    if (player || !window.YT?.Player) return;
    player = new YT.Player(frame, {
      events: {
        onReady: (event) => {
          player = event.target;
          ready = true;
          if (muted) player.mute();
          // Binding an already-playing native iframe must not interrupt its playback.
          if (player.getPlayerState() === 1) stateChanged({ data: 1 });
        },
        onStateChange: stateChanged,
        onAutoplayBlocked: blocked,
        onError: () => {
          switching = false;
          byId("playTrack").hidden = false;
          status(
            "この曲を再生できません。次の曲を選ぶかYouTubeで開いてください。",
          );
        },
      },
    });
  }
  window.onYouTubeIframeAPIReady = connectPlayer;
  if (window.YT?.Player) connectPlayer();
  else {
    const api = document.createElement("script");
    api.id = "omochi-youtube-api";
    api.src = "https://www.youtube.com/iframe_api";
    api.async = true;
    api.onerror = () =>
      status(
        "動画の直接再生は使えますが、連続再生機能を読み込めませんでした。再読み込みをお試しください。",
      );
    document.head.append(api);
  }
  let seen = false;
  try {
    seen = sessionStorage.getItem("omochi-premium-note");
  } catch {}
  if (!seen) {
    byId("premiumNote").hidden = false;
    setTimeout(() => {
      byId("premiumNote").hidden = true;
      try {
        sessionStorage.setItem("omochi-premium-note", "1");
      } catch {}
    }, 14000);
  }
})();
