// lib/sound.ts

export type BgmType = "opening" | "clubhouse" | "playingmarch" | "ending";
export type SeType = "strike" | "ball" | "playball" | "out" | "gameset";

const BGM_PATHS: Record<BgmType, string> = {
  opening: "/sound/opening.m4a",
  clubhouse: "/sound/clubhouse.m4a",
  playingmarch: "/sound/playingmarch.m4a",
  ending: "/sound/ending.m4a",
};

const SE_PATHS: Record<SeType, string> = {
  strike: "/sound/strike.wav",
  ball: "/sound/ball.wav",
  playball: "/sound/playball.wav",
  out: "/sound/out.wav",
  gameset: "/sound/gameset.wav",
};

let currentBgmAudio: HTMLAudioElement | null = null;
let currentBgmType: BgmType | null = null;
let isMutedState = false;
let isAudioUnlocked = false;
const listeners = new Set<(muted: boolean) => void>();

// 初期化（localStorageからミュート状態を復元）
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("bb6_sound_muted");
  isMutedState = saved === "true";

  // ブラウザの自動再生ブロック解除用リスナー
  const unlock = () => {
    isAudioUnlocked = true;
    if (currentBgmAudio && !isMutedState && currentBgmAudio.paused) {
      currentBgmAudio.play().catch(() => {});
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

/**
 * BGMを再生（同じ曲ならそのまま継続）
 */
export function playBgm(type: BgmType) {
  if (typeof window === "undefined") return;

  if (currentBgmType === type && currentBgmAudio && !currentBgmAudio.paused) {
    return;
  }

  // 既存のBGMを停止
  if (currentBgmAudio) {
    try {
      currentBgmAudio.pause();
      currentBgmAudio.currentTime = 0;
    } catch (e) {}
  }

  currentBgmType = type;
  const audio = new Audio(BGM_PATHS[type]);
  audio.loop = true;
  audio.volume = 0.35; // BGM音量
  currentBgmAudio = audio;

  if (!isMutedState) {
    audio.play().catch(() => {
      // ユーザー操作前などの自動再生ブロックは初タップ時に解除
    });
  }
}

/**
 * BGMを停止
 */
export function stopBgm() {
  if (currentBgmAudio) {
    try {
      currentBgmAudio.pause();
      currentBgmAudio.currentTime = 0;
    } catch (e) {}
    currentBgmAudio = null;
    currentBgmType = null;
  }
}

/**
 * 効果音（SE）をワンショット再生
 */
export function playSe(type: SeType) {
  if (typeof window === "undefined" || isMutedState) return;

  try {
    const audio = new Audio(SE_PATHS[type]);
    audio.volume = 0.70; // SE音量
    audio.play().catch(() => {});
  } catch (e) {}
}

/**
 * ミュート切り替え
 */
export function toggleMute(): boolean {
  return setMuted(!isMutedState);
}

/**
 * ミュート設定
 */
export function setMuted(muted: boolean): boolean {
  isMutedState = muted;
  if (typeof window !== "undefined") {
    localStorage.setItem("bb6_sound_muted", muted ? "true" : "false");
  }

  if (muted) {
    if (currentBgmAudio) {
      currentBgmAudio.pause();
    }
  } else {
    if (currentBgmAudio) {
      currentBgmAudio.play().catch(() => {});
    }
  }

  listeners.forEach((callback) => callback(isMutedState));
  return isMutedState;
}

/**
 * 現在のミュート状態を取得
 */
export function isMuted(): boolean {
  return isMutedState;
}

/**
 * ミュート状態変更の監視
 */
export function onMuteChange(callback: (muted: boolean) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}