(function (root) {
  "use strict";

  const assetUrl = (path) => root.DabaoAssetUrl?.(path) || path;

  class GameAudio {
    constructor(AudioType = root.Audio) {
      this.bgm = new AudioType(assetUrl("voice/background.mp3"));
      this.bgm.loop = true;
      this.bgm.volume = 0.24;
      this.bgm.preload = "auto";

      this.bossCueAsset = assetUrl("voice/dabao1.mp3");
      this.bossCue = new AudioType(this.bossCueAsset);
      this.bossCue.volume = 0.9;
      this.bossCue.preload = "auto";
      this.bossCue.addEventListener("ended", () => {
        if (this.bossCue.ended) this.completeBossCue();
      });
      this.bossCue.addEventListener("error", () => {
        if (this.bossCue.error) this.completeBossCue();
      });

      this.voice = new AudioType();
      this.voice.volume = 0.95;
      this.voice.preload = "auto";
      this.voice.addEventListener("ended", () => {
        if (this.voice.ended) this.playNext();
      });
      this.voice.addEventListener("error", () => {
        if (this.voice.error) this.playNext();
      });

      this.queue = [];
      this.voicePlaying = false;
      this.currentVoiceFile = null;
      this.playbackId = 0;
      this.bossCuePlaying = false;
      this.bossCueDone = null;
      this.bossCueId = 0;
      this.inGame = false;
      this.muted = false;
    }

    prepareAssets() {
      const bossCueAsset = assetUrl("voice/dabao1.mp3");
      if (bossCueAsset !== this.bossCueAsset) {
        this.bossCueAsset = bossCueAsset;
        this.bossCue.src = bossCueAsset;
      }
    }

    play(audio, onFailure) {
      try {
        const result = audio.play();
        if (result && typeof result.catch === "function") result.catch(() => onFailure?.());
      } catch (_) {
        onFailure?.();
      }
    }

    start() {
      this.stop();
      this.inGame = true;
      this.bgm.currentTime = 0;
      if (!this.muted) this.play(this.bgm);
    }

    stop() {
      this.inGame = false;
      this.bgm.pause();
      this.bossCue.pause();
      this.bossCuePlaying = false;
      this.bossCueDone = null;
      this.bossCueId += 1;
      this.voice.pause();
      this.queue = [];
      this.voicePlaying = false;
      this.currentVoiceFile = null;
      this.playbackId += 1;
    }

    playCard(key) {
      if (key && this.inGame) this.interruptWith([`${key}.mp3`]);
    }

    playBossTurn() {
      if (!this.inGame) return;
      this.bossCue.pause();
      this.bossCue.currentTime = 0;
      this.bossCueDone = null;
      const cueId = ++this.bossCueId;
      this.bossCuePlaying = !this.muted;
      if (this.bossCuePlaying) this.play(this.bossCue, () => {
        if (cueId === this.bossCueId) this.completeBossCue();
      });
    }

    afterBossTurn(callback) {
      if (this.bossCuePlaying) this.bossCueDone = callback;
      else callback();
    }

    completeBossCue() {
      if (!this.bossCuePlaying) return;
      this.bossCuePlaying = false;
      const done = this.bossCueDone;
      this.bossCueDone = null;
      done?.();
    }

    playBossKill() {
      if (!this.inGame) return;
      this.inGame = false;
      this.bgm.pause();
      this.bossCue.pause();
      this.bossCuePlaying = false;
      this.bossCueDone = null;
      this.bossCueId += 1;
      this.interruptWith(["dabaokill.mp3"]);
    }

    interruptWith(files) {
      this.voice.pause();
      this.voice.currentTime = 0;
      this.playbackId += 1;
      this.voicePlaying = false;
      this.currentVoiceFile = null;
      this.queue = this.muted ? [] : files.slice();
      this.playNext();
    }

    playNext() {
      this.voicePlaying = false;
      if (this.muted || !this.queue.length) {
        this.currentVoiceFile = null;
        return;
      }
      const file = this.queue.shift();
      this.currentVoiceFile = file;
      this.voice.src = assetUrl(`voice/${file}`);
      this.voice.currentTime = 0;
      this.voicePlaying = true;
      const playbackId = ++this.playbackId;
      this.play(this.voice, () => {
        if (this.playbackId === playbackId) this.playNext();
      });
    }

    finish(result, mode, { afterBossKill = false, humanPlayerId = 1 } = {}) {
      this.inGame = false;
      this.bgm.pause();
      this.bossCue.pause();
      this.bossCuePlaying = false;
      this.bossCueDone = null;
      this.bossCueId += 1;
      if (result.kind === "draw") {
        this.interruptWith([]);
        return;
      }
      const files = mode === "solo"
        ? [result.winners.includes(humanPlayerId) ? "victory.mp3" : "fail.mp3"]
        : result.winners.length < 4 ? ["victory.mp3", "fail.mp3"] : ["victory.mp3"];
      if (afterBossKill && this.voicePlaying && this.currentVoiceFile === "dabaokill.mp3") {
        this.queue = this.muted ? [] : files;
      } else this.interruptWith(files);
    }

    setMuted(muted) {
      this.muted = Boolean(muted);
      if (this.muted) {
        this.bgm.pause();
        this.bossCue.pause();
        this.completeBossCue();
        this.voice.pause();
        this.queue = [];
        this.voicePlaying = false;
        this.currentVoiceFile = null;
        this.playbackId += 1;
      } else if (this.inGame) {
        this.play(this.bgm);
      }
    }
  }

  const api = { GameAudio };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DabaoAudio = api;
})(typeof window !== "undefined" ? window : globalThis);
