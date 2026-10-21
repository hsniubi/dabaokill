(function (root) {
  "use strict";

  const EXTRA_PICTURES = [
    "dabao.jpg", "dabaobeimian.png", "wanjiabeimian.jpg", "gouyu.jpg",
    "victory.png", "fail.png", "tie.png", "kill.jpg",
  ];
  const EXTRA_VOICES = [
    "background.mp3", "dabao1.mp3", "dabaokill.mp3", "victory.mp3", "fail.mp3",
  ];
  const urls = new Map();
  const decodedImages = [];
  const listeners = new Set();
  let inFlight = null;
  let ready = false;

  function manifest() {
    const { CARDS, BOSS_CARDS } = root.DabaoKill;
    return [
      ...Array.from(new Set([...CARDS.map((card) => card.image), ...BOSS_CARDS.map((card) => card.image), ...EXTRA_PICTURES]),
        (name) => `picture/${name}`),
      ...Array.from(new Set([...CARDS.map((card) => `${card.key}.mp3`), ...EXTRA_VOICES]),
        (name) => `voice/${name}`),
      "video/kill-browser.mp4",
    ];
  }

  function needsLoading() {
    return !ready && !root.DabaoAssetUrl && /^(https?:)$/.test(root.location?.protocol || "")
      && typeof root.fetch === "function" && typeof root.URL?.createObjectURL === "function"
      && typeof root.Image === "function";
  }

  function notify(done, total, failed = 0) {
    for (const listener of listeners) {
      try { listener({ done, total, failed }); } catch (_) { /* Keep loading if a view was closed. */ }
    }
  }

  async function decodeImage(url) {
    const image = new root.Image();
    image.decoding = "async";
    if (typeof image.decode === "function") {
      image.src = url;
      await image.decode();
    } else {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });
    }
    decodedImages.push(image);
  }

  async function fetchAsset(path) {
    const controller = typeof root.AbortController === "function" ? new root.AbortController() : null;
    const timer = controller ? root.setTimeout(() => controller.abort(), 45000) : null;
    try {
      const response = await root.fetch(path, { cache: "force-cache", signal: controller?.signal });
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      const url = root.URL.createObjectURL(await response.blob());
      try {
        if (path.startsWith("picture/")) await decodeImage(url);
        urls.set(path, url);
      } catch (error) {
        root.URL.revokeObjectURL(url);
        throw error;
      }
    } finally {
      if (timer !== null) root.clearTimeout(timer);
    }
  }

  async function run() {
    const all = manifest();
    const remaining = all.filter((path) => !urls.has(path));
    let cursor = 0;
    let done = urls.size;
    let failed = 0;
    notify(done, all.length);
    const worker = async () => {
      while (cursor < remaining.length) {
        const path = remaining[cursor++];
        try { await fetchAsset(path); } catch (_) { failed += 1; }
        done += 1;
        notify(done, all.length, failed);
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, remaining.length) }, worker));
    if (failed) throw new Error(`${failed} 个资源加载失败`);
    root.DabaoAssetUrl = (path) => urls.get(path) || path;
    ready = true;
  }

  function load(onProgress) {
    if (typeof onProgress === "function") listeners.add(onProgress);
    if (!needsLoading()) {
      notify(ready ? manifest().length : 0, ready ? manifest().length : 0);
      listeners.clear();
      return Promise.resolve();
    }
    if (!inFlight) inFlight = run().finally(() => { inFlight = null; listeners.clear(); });
    return inFlight;
  }

  const api = { manifest, needsLoading, load };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DabaoAssetLoader = api;
})(typeof window !== "undefined" ? window : globalThis);
