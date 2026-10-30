// lib/defense.ts
import { Player, PositionType } from "@/types/baseball";

/**
 * ポジション適性係数（K_pos）
 * 本職（main_position）と配置位置が不一致の場合の減衰率
 */
export const POSITION_COMPATIBILITY: Record<PositionType, number> = {
  P: 0.30,   // 投手: 致命的
  C: 0.40,   // 捕手: 致命的
  SS: 0.60,  // 遊撃手: 重い
  "2B": 0.70, // 二塁手: やや重い
  "3B": 0.75, // 三塁手: 中程度
  "1B": 0.85, // 一塁手: 軽い
};

export interface EffectiveDefenseStats {
  effectiveFielding: number; // 実効守備力
  effectiveArm: number;      // 実効肩力
  compatibility: number;     // 適性係数 (0.30 〜 1.00)
  isMatched: boolean;        // 本職と合致しているか
}

/**
 * 実効守備力・実効肩力の算出
 */
export function calcEffectiveDefenseStats(
  player: Player,
  assignedPosition: PositionType
): EffectiveDefenseStats {
  const isMatched = player.main_position === assignedPosition;
  const compatibility = isMatched ? 1.0 : (POSITION_COMPATIBILITY[assignedPosition] ?? 0.70);

  const effectiveFielding = Math.round((player.fielding ?? 50) * compatibility);
  const effectiveArm = Math.round((player.arm ?? 50) * compatibility);

  return {
    effectiveFielding,
    effectiveArm,
    compatibility,
    isMatched,
  };
}

/**
 * 一歩目の反応遅延フレーム数の算出
 * 打球が飛んでから野手が動き出すまでのウェイト時間（60fps換算）
 * 高守備力＆本職: 0〜2フレーム
 * 不適性または低守備力: 6〜12フレーム（明らかな出遅れ）
 */
export function calcReactionDelay(effectiveFielding: number): number {
  return Math.max(0, Math.round((100 - effectiveFielding) * 0.12));
}

/**
 * 野手の打球追尾移動速度（ピクセル/フレーム）
 * 実効守備力に応じて 2.0 〜 3.5 px/frame の範囲で変動
 */
export function calcFielderSpeed(effectiveFielding: number): number {
  return 2.0 + (effectiveFielding * 0.015);
}

/**
 * 捕球・ファンブル判定
 * @returns success: 捕球成功か, fumble: こぼしたか
 */
export function checkCatchSuccess(effectiveFielding: number): {
  success: boolean;
  fumble: boolean;
} {
  // 捕球成功率: 守備力50で約85%、守備力80で約94%、不適性(実効値20〜30)で70%台前半
  const catchRate = 0.65 + (effectiveFielding * 0.0035);
  const roll = Math.random();

  if (roll <= catchRate) {
    return { success: true, fumble: false };
  } else {
    // 捕球失敗（ファンブル）
    return { success: false, fumble: true };
  }
}

/**
 * 捕球後のボール握り替え・送球準備フレーム数
 * 捕球からボールが手元を離れるまでのタメ時間（60fps換算）
 * 実効肩力80: 約2〜3フレーム（電光石火の早送球）
 * 実効肩力30: 約7〜9フレーム（もたつき）
 */
export function calcTransferDelay(effectiveArm: number): number {
  return Math.max(2, Math.round((100 - effectiveArm) * 0.09));
}

/**
 * 1塁への送球物理（速度および悪送球判定）
 */
export function calcThrowPhysics(effectiveArm: number): {
  throwSpeed: number; // 送球速度（px/frame）
  isWildThrow: boolean; // 悪送球（暴投）フラグ
} {
  // 送球スピード（5.0 〜 8.2 px/frame）
  const throwSpeed = 4.8 + (effectiveArm * 0.038);

  // 悪送球率: 肩力および適性が極端に低い場合（実効値40未満）に数%〜10%発生
  const wildThrowRate = effectiveArm < 40 ? (40 - effectiveArm) * 0.003 : 0.01;
  const isWildThrow = Math.random() < wildThrowRate;

  return {
    throwSpeed,
    isWildThrow,
  };
}

/**
 * UI表示用の適性バッジ判定（オーダー画面の警告表示用）
 */
export function getPositionBadge(player: Player, assignedPosition: PositionType): {
  label: string;
  colorClass: string;
} {
  if (player.main_position === assignedPosition) {
    return { label: "本職", colorClass: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  }

  const comp = POSITION_COMPATIBILITY[assignedPosition] ?? 0.70;
  if (comp <= 0.40) {
    return { label: "危険", colorClass: "bg-rose-100 text-rose-800 border-rose-300 animate-pulse" };
  } else if (comp <= 0.65) {
    return { label: "不慣れ", colorClass: "bg-amber-100 text-amber-800 border-amber-300" };
  } else {
    return { label: "適性△", colorClass: "bg-slate-100 text-slate-700 border-slate-300" };
  }
}