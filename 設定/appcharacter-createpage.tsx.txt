// app/character-create/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Player } from "@/types/baseball";
import { Dices, Check, ChevronRight, Sparkles, Flame, Shield, Zap } from "lucide-react";

interface ProtagonistTemplate {
  id: number;
  typeTitle: string;
  subTitle: string;
  desc: string;
  imageUrl: string;
  defaultName: string;
  themeColor: string;
  bgLight: string;
  borderActive: string;
  baseStats: {
    pitch_speed: number;
    control: number;
    contact: number;
    power: number;
    speed: number;
    fielding: number;
    arm: number;
  };
}

const TEMPLATES: ProtagonistTemplate[] = [
  {
    id: 1001,
    typeTitle: "王道の正統派エース",
    subTitle: "青葉のひだまり（バランス型）",
    desc: "癖のない綺麗なフォームと安定した制球力。投打ともに穴のないオールラウンダー。",
    imageUrl: "/1001.jpg",
    defaultName: "青葉 結衣",
    themeColor: "text-rose-600",
    bgLight: "bg-rose-50",
    borderActive: "border-rose-500 ring-rose-400",
    baseStats: {
      pitch_speed: 60, // 135 km/h
      control: 65,
      contact: 60,
      power: 58,
      speed: 55,
      fielding: 62,
      arm: 62,
    },
  },
  {
    id: 1002,
    typeTitle: "名門主将・豪腕本格派",
    subTitle: "孤高の青き星（パワー＆豪速球型）",
    desc: "名門校出身の剛腕。荒れ球だが最速150km/hに迫る直球と長打力でねじ伏せる。",
    imageUrl: "/1002.jpg",
    defaultName: "星野 凛華",
    themeColor: "text-blue-600",
    bgLight: "bg-blue-50",
    borderActive: "border-blue-500 ring-blue-400",
    baseStats: {
      pitch_speed: 75, // 146 km/h
      control: 45,
      contact: 42,
      power: 76,
      speed: 60,
      fielding: 52,
      arm: 80,
    },
  },
  {
    id: 1003,
    typeTitle: "天才肌のトリックスター",
    subTitle: "ひらめきマジシャン（技巧＆俊足型）",
    desc: "卓越した野球センスの持ち主。七色の変化球とシャープな打撃、俊足で翻弄する。",
    imageUrl: "/1003.jpg",
    defaultName: "神崎 ルナ",
    themeColor: "text-amber-600",
    bgLight: "bg-amber-50",
    borderActive: "border-amber-500 ring-amber-400",
    baseStats: {
      pitch_speed: 45, // 124 km/h
      control: 76,
      contact: 74,
      power: 44,
      speed: 76,
      fielding: 68,
      arm: 52,
    },
  },
];

export default function CharacterCreatePage() {
  const router = useRouter();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const currentTemplate = TEMPLATES[selectedIdx];

  const [name, setName] = useState(currentTemplate.defaultName);
  const [battingHand, setBattingHand] = useState<"R" | "L">("R");

  // ±7 のランダムオフセット
  const [offsets, setOffsets] = useState<Record<string, number>>({
    pitch_speed: 0,
    control: 0,
    contact: 0,
    power: 0,
    speed: 0,
    fielding: 0,
    arm: 0,
  });

  const [isRolling, setIsRolling] = useState(false);

  // タイプ切り替え時に名前も同期
  const handleSelectType = (idx: number) => {
    setSelectedIdx(idx);
    setName(TEMPLATES[idx].defaultName);
    rollDice();
  };

  // ダイスを振って ±7 をランダム決定
  const rollDice = () => {
    setIsRolling(true);
    setTimeout(() => {
      const getRnd = () => Math.floor(Math.random() * 15) - 7; // -7 〜 +7
      setOffsets({
        pitch_speed: getRnd(),
        control: getRnd(),
        contact: getRnd(),
        power: getRnd(),
        speed: getRnd(),
        fielding: getRnd(),
        arm: getRnd(),
      });
      setIsRolling(false);
    }, 200);
  };

  const getStat = (key: keyof typeof currentTemplate.baseStats) => {
    const base = currentTemplate.baseStats[key];
    const off = offsets[key] || 0;
    return Math.max(25, Math.min(99, base + off));
  };

  const getSpeedKmh = () => {
    const spd = getStat("pitch_speed");
    return Math.round(100 + spd * 0.63);
  };

  // 主人公を確定してスカウト会議へ
  const handleConfirm = () => {
    const protagonist: Player = {
      id: currentTemplate.id,
      name: name.trim() || currentTemplate.defaultName,
      main_position: "P",
      grade: 1,
      batting_hand: battingHand,
      image_url: currentTemplate.imageUrl,
      pitch_speed: getStat("pitch_speed"),
      control: getStat("control"),
      contact: getStat("contact"),
      power: getStat("power"),
      speed: getStat("speed"),
      fielding: getStat("fielding"),
      arm: getStat("arm"),
      is_protagonist: true,
    };

    // 一時セッションに保存してスカウト画面へ引き渡す
    localStorage.setItem("bb6_custom_protagonist", JSON.stringify(protagonist));
    router.push("/scout-opening");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans select-none p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* ヘッダー */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm text-center">
          <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black px-3 py-1 rounded-full mb-1.5">
            <Sparkles size={14} className="text-amber-600" /> 入学手続き・選手登録
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">
            青葉女子大学 新入生エース（あなた）の作成
          </h1>
          <p className="text-xs text-slate-600 font-bold mt-1">
            プレイスタイルに合わせたバックボーンを選択し、能力値をダイスで決定してください。
          </p>
        </div>

        {/* 3人の選択カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TEMPLATES.map((tmpl, idx) => {
            const isSelected = selectedIdx === idx;
            return (
              <div
                key={tmpl.id}
                onClick={() => handleSelectType(idx)}
                className={`bg-white rounded-3xl border-2 p-4 flex flex-col justify-between cursor-pointer transition relative shadow-sm ${
                  isSelected
                    ? `${tmpl.borderActive} ring-4 shadow-lg scale-[1.02]`
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}

                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-800 mb-3 border border-slate-200 shadow-inner">
                  <img src={tmpl.imageUrl} alt={tmpl.typeTitle} className="w-full h-full object-cover" />
                </div>

                <div className="space-y-1">
                  <span className={`text-[10px] font-black tracking-wider uppercase ${tmpl.themeColor}`}>
                    {tmpl.subTitle}
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    {tmpl.typeTitle}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {tmpl.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 基本情報 ＆ 能力ダイスロール */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* 左：名前 ＆ 打席設定 */}
          <div className="md:col-span-5 space-y-4 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
            <h3 className="text-sm font-black text-slate-900">基本プロフィール</h3>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">選手名（変更可能）</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={8}
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">投打（ポジションは投手固定）</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBattingHand("R")}
                  className={`py-2 rounded-xl text-xs font-black border transition ${
                    battingHand === "R"
                      ? "bg-slate-900 text-white border-slate-900 shadow"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  右投・右打
                </button>
                <button
                  type="button"
                  onClick={() => setBattingHand("L")}
                  className={`py-2 rounded-xl text-xs font-black border transition ${
                    battingHand === "L"
                      ? "bg-slate-900 text-white border-slate-900 shadow"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  右投・左打
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={rollDice}
                disabled={isRolling}
                className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 font-black py-3 rounded-2xl transition active:scale-95 text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <Dices size={16} className={isRolling ? "animate-spin" : ""} />
                能力ダイスを振り直す（±7ランダム）
              </button>
            </div>
          </div>

          {/* 右：ステータス表示（±7の内訳表示） */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-sm font-black text-slate-900">初期ステータス（基礎値 ＋ ダイス目）</h3>
              <span className="text-xs font-mono font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                推定球速: {getSpeedKmh()} km/h
              </span>
            </div>

            <div className="space-y-2">
              {[
                { key: "pitch_speed", label: "球速適性" },
                { key: "control", label: "制球力" },
                { key: "contact", label: "ミート" },
                { key: "power", label: "パワー" },
                { key: "speed", label: "走力" },
                { key: "fielding", label: "守備力" },
                { key: "arm", label: "肩力" },
              ].map(({ key, label }) => {
                const k = key as keyof typeof currentTemplate.baseStats;
                const base = currentTemplate.baseStats[k];
                const off = offsets[k] || 0;
                const total = getStat(k);

                return (
                  <div key={key} className="flex items-center justify-between text-xs font-mono bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl">
                    <span className="font-bold text-slate-700 w-20 font-sans">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold">{base}</span>
                      <span className={`text-[10px] font-black w-8 text-center ${off > 0 ? "text-emerald-700" : off < 0 ? "text-rose-700" : "text-slate-400"}`}>
                        {off > 0 ? `+${off}` : off === 0 ? "±0" : off}
                      </span>
                      <span className="text-slate-300">➔</span>
                      <span className="text-base font-black text-slate-900 w-8 text-right">{total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* 決定ボタン */}
        <button
          onClick={handleConfirm}
          className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-4 rounded-2xl shadow-xl transition active:scale-95 text-base flex items-center justify-center gap-2"
        >
          <span>この選手で入学し、部員スカウトへ進む</span>
          <ChevronRight size={20} />
        </button>

      </div>
    </div>
  );
}