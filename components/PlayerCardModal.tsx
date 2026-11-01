// components/PlayerCardModal.tsx
"use client";

import React from "react";
import { Player, PositionType, getSkillDef } from "@/types/baseball";
import { X, Shield, Zap, Award, Gauge, Sparkles } from "lucide-react";

interface PlayerCardModalProps {
  player: Player | null;
  onClose: () => void;
}

export type PersonalityType = "熱血" | "クール" | "マイペース" | "努力家" | "お調子者" | "頭脳派";

interface PersonalityInfo {
  type: PersonalityType;
  label: string;
  desc: string;
  color: string;
  badgeBg: string;
}

const PERSONALITY_MAP: Record<PersonalityType, PersonalityInfo> = {
  熱血: {
    type: "熱血",
    label: "熱血",
    desc: "気迫溢れる闘志。勝負どころで力が出やすいがスタミナ消費が少し激しい。",
    color: "text-rose-700 border-rose-300",
    badgeBg: "bg-rose-50",
  },
  クール: {
    type: "クール",
    label: "クール",
    desc: "感情を表に出さず冷静沈着。スタミナ消費が常に安定し、動揺しない。",
    color: "text-blue-700 border-blue-300",
    badgeBg: "bg-blue-50",
  },
  マイペース: {
    type: "マイペース",
    label: "マイペース",
    desc: "常に自分のリズムを崩さない。疲労ペナルティの影響を受けにくい。",
    color: "text-teal-700 border-teal-300",
    badgeBg: "bg-teal-50",
  },
  努力家: {
    type: "努力家",
    label: "努力家",
    desc: "練習熱心なストイック気質。全体練習での大成功確率がわずかに高い。",
    color: "text-amber-800 border-amber-300",
    badgeBg: "bg-amber-50",
  },
  お調子者: {
    type: "お調子者",
    label: "お調子者",
    desc: "チームのムードメーカー。ノッている時は大成功や長打を連発する。",
    color: "text-orange-700 border-orange-300",
    badgeBg: "bg-orange-50",
  },
  頭脳派: {
    type: "頭脳派",
    label: "頭脳派",
    desc: "データと戦術を重視。制球力やバットコントロール、守備判断に優れる。",
    color: "text-indigo-700 border-indigo-300",
    badgeBg: "bg-indigo-50",
  },
};

const ALL_PERSONALITIES: PersonalityType[] = [
  "熱血", "クール", "マイペース", "努力家", "お調子者", "頭脳派"
];

// 二つ名が未設定の場合の自動生成ロジック
function getOrGenerateNickname(player: Player): string {
  if ((player as any).nickname) return (player as any).nickname;
  if (player.id === 1001) return "青葉のひだまり";
  if (player.id === 1002) return "孤高の青き星";
  if (player.id === 1003) return "ひらめきマジシャン";

  if (player.main_position === "P") {
    if ((player.pitch_speed ?? 60) >= 72) return "青葉の剛腕";
    if ((player.control ?? 50) >= 70) return "精密機械";
    if ((player.contact ?? 50) >= 65 || (player.power ?? 50) >= 65) return "二刀流のエース";
    return "マウンドの守護神";
  }

  const stats = [
    { title: "怪力スラッガー", val: player.power ?? 50 },
    { title: "安打製造機", val: player.contact ?? 50 },
    { title: "韋駄天ガール", val: player.speed ?? 50 },
    { title: "鉄壁の内野職人", val: player.fielding ?? 50 },
    { title: "強肩レーザービーム", val: player.arm ?? 50 },
  ];
  stats.sort((a, b) => b.val - a.val);

  if (stats[0].val >= 65) {
    return stats[0].title;
  }
  if ((player.contact ?? 50) >= 60 && (player.speed ?? 50) >= 60) return "俊足巧打のチャンスメーカー";
  if (player.main_position === "C") return "司令塔の扇の要";
  if (player.main_position === "SS") return "遊撃の砦";

  return "青葉の期待株";
}

// 性格が未設定の場合の自動補完ロジック
function getOrGeneratePersonality(player: Player): PersonalityInfo {
  const pType = (player as any).personality as PersonalityType | undefined;
  if (pType && PERSONALITY_MAP[pType]) {
    return PERSONALITY_MAP[pType];
  }
  if (player.id === 1001) return PERSONALITY_MAP["努力家"];
  if (player.id === 1002) return PERSONALITY_MAP["熱血"];
  if (player.id === 1003) return PERSONALITY_MAP["マイペース"];

  const picked = ALL_PERSONALITIES[Math.abs(player.id * 7) % ALL_PERSONALITIES.length];
  return PERSONALITY_MAP[picked];
}

// ランク判定（S〜E）
function getStatRank(val: number): { label: string; color: string; badgeBg: string } {
  if (val >= 85) return { label: "S", color: "text-amber-800", badgeBg: "bg-amber-100 border-amber-300" };
  if (val >= 70) return { label: "A", color: "text-rose-800", badgeBg: "bg-rose-100 border-rose-300" };
  if (val >= 60) return { label: "B", color: "text-blue-800", badgeBg: "bg-blue-100 border-blue-300" };
  if (val >= 50) return { label: "C", color: "text-emerald-800", badgeBg: "bg-emerald-100 border-emerald-300" };
  if (val >= 40) return { label: "D", color: "text-slate-800", badgeBg: "bg-slate-200 border-slate-300" };
  return { label: "E", color: "text-slate-600", badgeBg: "bg-slate-100 border-slate-200" };
}

const POSITION_EFFICIENCY: Record<PositionType, number> = {
  P: 0.30,
  C: 0.40,
  SS: 0.60,
  "2B": 0.70,
  "3B": 0.75,
  "1B": 0.85,
};

const ALL_POSITIONS: PositionType[] = ["P", "C", "1B", "2B", "3B", "SS"];

export default function PlayerCardModal({ player, onClose }: PlayerCardModalProps) {
  if (!player) return null;

  const getImageUrl = (p: Player) => {
    if (p.image_url && p.image_url.trim() !== "" && p.image_url !== "NaN") {
      if (p.image_url.startsWith("http")) return p.image_url;
      return p.image_url.startsWith("/") ? p.image_url : `/${p.image_url}`;
    }
    return "/901.jpg";
  };

  const nickname = getOrGenerateNickname(player);
  const personality = getOrGeneratePersonality(player);
  const displayKmh = Math.round(100 + (player.pitch_speed ?? 60) * 0.63);

  const batterStats = [
    { name: "ミート", val: player.contact ?? 50 },
    { name: "パワー", val: player.power ?? 50 },
    { name: "走力", val: player.speed ?? 50 },
    { name: "肩力", val: player.arm ?? 50 },
    { name: "守備力", val: player.fielding ?? 50 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200 select-none">
      {/* モーダル外枠：PC/タブレットでは横長カード(max-w-3xl)にして左右に分割 */}
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row max-h-[90vh] relative">
        
        {/* 閉じるボタン（右上固定） */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full flex items-center justify-center transition shadow-md"
        >
          <X size={18} />
        </button>

        {/* ============================================================== */}
        {/* 左側：大きく正方形の選手グラフィックカード（md以上で幅45%固定） */}
        {/* ============================================================== */}
        <div className="md:w-5/12 bg-slate-800 relative flex flex-col justify-between shrink-0 overflow-hidden aspect-square md:aspect-auto">
          <img
            src={getImageUrl(player)}
            alt={player.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = "/901.jpg"; }}
          />

          {/* 画像上のオーバーレイ */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-transparent to-slate-950/40 flex flex-col justify-between p-4 pointer-events-none">
            
            {/* 上部：二つ名ゴールドリボン ＆ 主人公バッジ */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-black text-[11px] px-2.5 py-1 rounded-full shadow-lg border border-white/60 flex items-center gap-1 tracking-wider">
                <Award size={13} className="text-slate-950" />
                {nickname}
              </span>

              {player.is_protagonist && (
                <span className="bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md border border-amber-300 flex items-center gap-1">
                  <Sparkles size={11} /> 主人公
                </span>
              )}
            </div>

            {/* 下部：性格バッジ ＆ 学年・本職・打席 ＆ 選手名 */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border shadow-sm ${personality.badgeBg} ${personality.color}`}>
                  性格: {personality.label}
                </span>
                <span className="bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow border border-amber-400">
                  第{player.grade ?? 1}学年
                </span>
                <span className="bg-slate-900/90 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow border border-slate-700">
                  本職: {player.main_position}
                </span>
                <span className="bg-white text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-md shadow">
                  {player.batting_hand === "L" ? "右投左打" : "右投右打"}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white drop-shadow">
                {player.name}
              </h2>
            </div>

          </div>
        </div>

        {/* ============================================================== */}
        {/* 右側：全ステータス・適性マトリクス一覧エリア（md以上で幅55%） */}
        {/* ============================================================== */}
        <div className="md:w-7/12 p-5 md:p-6 overflow-y-auto space-y-3.5 flex flex-col justify-between bg-white text-slate-900">
          
          {/* ヘッダー情報（性格の特性解説付き） */}
          <div className="border-b border-slate-100 pb-2.5 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <div className="text-xs font-mono font-bold text-slate-500">
                ATHLETE PROFILE
              </div>
              <span className="text-xs font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                No. {player.id}
              </span>
            </div>

            {/* 性格の特性説明 */}
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 leading-snug flex items-start gap-1.5">
              <span className={`font-black shrink-0 ${personality.color}`}>【{personality.label}】</span>
              <span className="font-medium">{personality.desc}</span>
            </div>

            {player.description && (
              <p className="text-xs text-slate-700 font-bold line-clamp-2">
                {player.description}
              </p>
            )}
          </div>

          {/* 野手能力（ミート・パワー・走力・肩力・守備力） */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
              <Zap size={14} className="text-amber-600" />
              <span>野手能力</span>
            </div>

            <div className="space-y-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
              {batterStats.map(({ name, val }) => {
                const rank = getStatRank(val);
                return (
                  <div key={name} className="flex items-center gap-2.5 text-xs">
                    <span className="w-12 font-bold text-slate-800">{name}</span>
                    <span className={`w-5 h-5 rounded border flex items-center justify-center font-black text-[10px] ${rank.badgeBg} ${rank.color}`}>
                      {rank.label}
                    </span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-800 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(10, val))}%` }}
                      />
                    </div>
                    <span className="w-7 text-right font-mono font-black text-slate-900">
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 投手能力 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
              <Gauge size={14} className="text-blue-600" />
              <span>投手能力</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-1">
                <span className="text-[10px] font-bold text-slate-600 block">最高球速</span>
                <span className="text-sm font-black text-slate-900 font-mono mt-0.5 block">
                  {displayKmh} <span className="text-[9px] font-normal text-slate-500">km/h</span>
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-1">
                <span className="text-[10px] font-bold text-slate-600 block">制球力</span>
                <span className="text-sm font-black text-slate-900 font-mono mt-0.5 block">
                  {player.control ?? 50}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-1">
                <span className="text-[10px] font-bold text-slate-600 block">スタミナ</span>
                <span className="text-sm font-black text-slate-900 font-mono mt-0.5 block">
                  {player.stamina ?? 50}
                </span>
              </div>
            </div>
          </div>

          {/* ★ 習得スキル・特殊能力 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-black text-slate-900">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>習得スキル・特殊能力</span>
              </div>
              {player.skills && player.skills.length > 0 && (
                <span className="text-[10px] font-mono text-slate-500 font-bold">
                  {player.skills.length}個習得中
                </span>
              )}
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl min-h-[46px] flex flex-wrap items-center gap-1.5">
              {player.skills && player.skills.length > 0 ? (
                player.skills.map((sId) => {
                  const def = getSkillDef(sId);
                  const name = def?.name || sId;
                  const desc = def?.desc || "習得済みの特殊能力";
                  const badgeBg = def?.badgeBg || "bg-amber-50";
                  const borderColor = def?.borderColor || "border-amber-300";
                  const textColor = def?.textColor || "text-amber-900";
                  const tier = def?.tier;

                  return (
                    <div
                      key={sId}
                      title={desc}
                      className={`px-2.5 py-1 rounded-xl border text-xs font-black flex items-center gap-1 shadow-sm transition hover:scale-105 cursor-help ${badgeBg} ${borderColor} ${textColor}`}
                    >
                      <span>{name}</span>
                      {tier && tier >= 2 && (
                        <span className="text-[9px] font-mono font-black opacity-80">
                          T{tier}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <span className="text-[11px] text-slate-400 font-medium pl-1">
                  習得スキルなし（全体練習や特訓合宿で習得可能）
                </span>
              )}
            </div>
          </div>

          {/* ポジション適性マトリクス */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
              <Shield size={14} className="text-emerald-600" />
              <span>ポジション適性</span>
            </div>

            <div className="grid grid-cols-6 gap-1 text-center text-xs">
              {ALL_POSITIONS.map((pos) => {
                const isMain = player.main_position === pos;
                const effRate = isMain ? 100 : Math.round((POSITION_EFFICIENCY[pos] ?? 0.7) * 100);

                return (
                  <div
                    key={pos}
                    className={`p-1.5 rounded-xl border flex flex-col items-center justify-center ${
                      isMain
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-black shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span className="font-mono font-black text-[11px]">{pos}</span>
                    <span className="text-[9px] font-bold mt-0.5">
                      {isMain ? "本職" : `${effRate}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 閉じるボタン */}
          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-sm mt-1"
          >
            閉じる
          </button>
        </div>

      </div>
    </div>
  );
}