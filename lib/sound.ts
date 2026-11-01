// lib/sound.ts

export type BgmType = "opening" | "clubhouse" | "playingmarch" | "ending";
export type SeType = "strike" | "ball" | "playball" | "out" | "gameset" | "meet" | "homerun";

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
  meet: "/sound/meet.mp3",
  homerun: "/sound/homerun.mp3",
};

let currentBgmAudio: HTMLAudioElement | null = null;
let currentBgmType: BgmType | null = null;
let isMutedState = false;
let isAudioUnlocked = false;
const listeners = new Set<(muted: boolean) => void>();

/**
 * ユーザー操作時にBGMの再生を試みる（ブロック解除・自己修復）
 */
function tryResumeAudio() {
  isAudioUnlocked = true;
  if (currentBgmAudio && !isMutedState && currentBgmAudio.paused) {
    currentBgmAudio.play().catch(() => {});
  }
}

// 初期化（localStorageからミュート状態を復元＆全方向インタラクション監視）
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("bb6_sound_muted");
  isMutedState = saved === "true";

  const interactionEvents = ["pointerdown", "touchstart", "click", "keydown"];
  interactionEvents.forEach((event) => {
    window.addEventListener(event, tryResumeAudio, { passive: true });
    document.addEventListener(event, tryResumeAudio, { passive: true });
  });
}

/**
 * 外部から手動でアンロックを試みるヘルパー
 */
export function unlockAudio() {
  tryResumeAudio();
}

/**
 * BGMを再生（同じ曲ならそのまま継続、停止中ならリトライ）
 */
export function playBgm(type: BgmType) {
  if (typeof window === "undefined") return;

  // 同じ曲が指定された場合
  if (currentBgmType === type && currentBgmAudio) {
    if (!currentBgmAudio.paused) {
      return; // 既に正常再生中なら何もしない
    }
    // ブロック等で停止していた場合は再開を試みる
    if (!isMutedState) {
      currentBgmAudio.play().catch(() => {});
    }
    return;
  }

  // 異なるBGMが鳴っていれば停止して破棄
  if (currentBgmAudio) {
    try {
      currentBgmAudio.pause();
      currentBgmAudio.currentTime = 0;
    } catch (e) {}
    currentBgmAudio = null;
  }

  currentBgmType = type;
  const audio = new Audio(BGM_PATHS[type]);
  audio.loop = true;
  audio.volume = 0.35;
  audio.preload = "auto";
  currentBgmAudio = audio;

  if (!isMutedState) {
    audio.play().catch(() => {
      // ブラウザに自動再生をブロックされた場合もインスタンスは保持
      // 次のタップ・クリック時に tryResumeAudio で鳴り出す
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
    audio.volume = 0.70;
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