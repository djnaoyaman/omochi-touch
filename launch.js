(() => {
  "use strict";
  const url = "https://djnaoyaman.github.io/omochi-touch/",
    status = document.querySelector("#shareStatus");
  function fallback() {
    status.textContent = "このURLを長押し・選択してコピーできます： " + url;
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = "サイトのリンクをコピーしました。";
    } catch {
      fallback();
    }
  }
  document.querySelector("#copySite").onclick = copy;
  document.querySelector("#shareSite").onclick = async () => {
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({
        title: "OMOCHI TOUCH",
        text: "写真と色と音で、自分だけのアートを。",
        url,
      });
      status.textContent = "共有メニューを開きました。";
    } catch (e) {
      if (e.name !== "AbortError") fallback();
    }
  };
  const top = document.querySelector("#backTop");
  function update() {
    top.hidden = scrollY < 500;
  }
  addEventListener("scroll", update, { passive: true });
  update();
  top.onclick = () => {
    window.scrollTo({
      top: 0,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    document.querySelector(".brand").focus({ preventScroll: true });
  };
})();
