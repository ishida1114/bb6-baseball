// app/facilities/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserTeam } from "@/types/baseball";
import { 
  ChevronLeft, Building2, Flame, Shield, Gauge, Dumbbell, 
  Sparkles, HeartPulse, Check, ArrowUpRight, Zap, Trophy
} from "lucide-react";
import Link from "next/link";

interface FacilityDef {
  id: string;
  name: string;
  desc: string;
  icon: any;
  costs: number[]; // 各レベルへの強化費用（万円）
  effects: string[]; // 各レベルの効果説明
}

const FACILITIES: FacilityDef[] = [
  {
    id: "ground_soil",
    name: "内野黒土＆天然芝整備",
    desc: "水はけとクッション性を向上させ、イレギュラーバウンドを解消",
    icon: Shield,
    costs: [50, 120, 300],
    effects: [
      "未整備（土埃と雑草が目立つ）",
      "守備練習の成功率+10% / 公式戦の内野失策率低下",
      "守備練習の大成功率+15% / 内野ゴロ安打を強力阻止",
      "【最高峰】守備練習の大成功率+25% / 内野安打許容率激減",
    ],
  },
  {
    id: "bullpen",
    name: "本格ブルペン・傾斜マウンド",
    desc: "実戦規格の傾斜マウンドと屋根付き投球レーンを設置",
    icon: Gauge,
    costs: [50, 120, 300],
    effects: [
      "未整備（平地での立ち投げのみ）",
      "投手練習の成功率+10% / 登板中のスタミナ消費を1球あたり-0.5%軽減",
      "投手練習の大成功率+15% / スタミナ消費を1球あたり-1.0%軽減",
      "【最高峰】球速・制球の成長効率大幅UP / スタミナ消費-1.5%軽減",
    ],
  },
  {
    id: "pitching_machine",
    name: "最新型ピッチングマシン",
    desc: "160km/h超の剛速球と多彩な変化球を正確に再現するバーチャルマシン",
    icon: Flame,
    costs: [60, 150, 350],
    effects: [
      "未整備（手投げトスバッティングのみ）",
      "打撃練習の成功率+10% / 試合中の打球初速がわずかに上昇",
      "打撃練習の大成功率+15% / 試合中の長打・本塁打発生率UP",
      "【最高峰】打撃練習の大成功率+25% / クリーンヒット確率激増",
    ],
  },
  {
    id: "training_room",
    name: "ウェイト器具・プロテインバー",
    desc: "最新スミスマシン、ダンベル、専用サプリメントステーションを完備",
    icon: Dumbbell,
    costs: [40, 100, 250],
    effects: [
      "未整備（自重トレーニングのみ）",
      "走力・パワー練習の成功率+10%",
      "走力・パワー練習の大成功率+15% / 入部時の基礎フィジカル底上げ",
      "【最高峰】全フィジカル練習効率MAX / 全体練習の大成功率底上げ",
    ],
  },
  {
    id: "night_lighting",
    name: "ナイター照明＆スピードガン",
    desc: "夜間でも昼間同様に打球が見える高輝度LED照明と精密計測機材",
    icon: Zap,
    costs: [80, 200, 500],
    effects: [
      "未整備（日没で全体練習終了）",
      "夜間居残り特訓の解放（練習効果ボーナス+5%）",
      "スピードガン完全配備 / スカウト候補生の隠し適性を看破",
      "【最高峰】常時ナイトゲーム対応 / 特訓合宿のステータス上昇量+1",
    ],
  },
  {
    id: "clubhouse_spa",
    name: "酸素カプセル・疲労回復スパ",
    desc: "高気圧酸素カプセルと交代浴用ジャグジーで疲労を瞬時にリセット",
    icon: HeartPulse,
    costs: [100, 250, 600],
    effects: [
      "未整備（水道水でのアイシングのみ）",
      "試合中ベンチ待機時のスタミナ回復量+10%",
      "公式戦終了後の実戦成長枠がランダムで【+1名】追加",
      "【最高峰】全選手のコンディション常時好調 / 成長枠が確定【3名】",
    ],
  },
];

// グラウンドランク定義（4段階イラスト連動）
const GROUND_RANKS = [
  {
    name: "河川敷グラウンド",
    rank: "Rank D",
    minTotalLevel: 0,
    image: "/field1.jpg",
    desc: "錆びたバックネットと荒れた土。ここから青葉女子大の歴史が始まる。",
    color: "text-slate-600 bg-slate-100 border-slate-300",
  },
  {
    name: "大学キャンパス球場",
    rank: "Rank C",
    minTotalLevel: 5,
    image: "/field2.jpg",
    desc: "校舎を背負う土のグラウンド。ベンチと防球ネットが整い部活動らしく進化。",
    color: "text-amber-800 bg-amber-100 border-amber-300",
  },
  {
    name: "青葉アカデミースタジアム",
    rank: "Rank B",
    minTotalLevel: 10,
    image: "/field3.jpg",
    desc: "美しい天然芝と電光掲示板、桜並木に囲まれた本格的な専用ボールパーク。",
    color: "text-emerald-800 bg-emerald-100 border-emerald-300",
  },
  {
    name: "青葉スカイドーム・アリーナ",
    rank: "Rank S",
    minTotalLevel: 15,
    image: "/field4.jpg",
    desc: "飛行船が飛び交い大観衆の歓声が響く、インカレ女子野球の最高峰スタジアム。",
    color: "text-rose-800 bg-rose-100 border-rose-300",
  },
];

export default function FacilitiesPage() {
  const router = useRouter();
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [facilityLevels, setFacilityLevels] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [upgradingId, setUpgradingId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("bb6_myTeam");
    if (!saved) {
      router.replace("/");
      return;
    }
    try {
      const parsed: UserTeam = JSON.parse(saved);
      setTeam(parsed);

      // 設備レベル読み込み（初期はすべてLv.0）
      const savedFac = localStorage.getItem("bb6_facilities");
      if (savedFac) {
        setFacilityLevels(JSON.parse(savedFac));
      } else {
        const initLevels: Record<string, number> = {};
        FACILITIES.forEach((f) => { initLevels[f.id] = 0; });
        setFacilityLevels(initLevels);
      }
    } catch (e) {
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading || !team) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 設備合計レベル算出（最大 6施設 × 3 = 18）
  const totalLevel = Object.values(facilityLevels).reduce((a, b) => a + b, 0);

  // 現在のグラウンドランク決定
  const currentGround = [...GROUND_RANKS].reverse().find((g) => totalLevel >= g.minTotalLevel) || GROUND_RANKS[0];

  // 設備強化処理
  const handleUpgrade = (fac: FacilityDef) => {
    const currentLv = facilityLevels[fac.id] || 0;
    if (currentLv >= 3) return;

    const cost = fac.costs[currentLv];
    // team.tp_funds は部費（万円）
    if (team.tp_funds < cost) {
      alert(`部費が不足しています！（必要: ${cost}万円 ／ 所持: ${team.tp_funds}万円）\n公式戦に勝利して部費を獲得してください。`);
      return;
    }

    setUpgradingId(fac.id);

    setTimeout(() => {
      const nextLevels = {
        ...facilityLevels,
        [fac.id]: currentLv + 1,
      };

      const updatedTeam = {
        ...team,
        tp_funds: team.tp_funds - cost,
      };

      localStorage.setItem("bb6_facilities", JSON.stringify(nextLevels));
      localStorage.setItem("bb6_myTeam", JSON.stringify(updatedTeam));

      setFacilityLevels(nextLevels);
      setTeam(updatedTeam);
      setUpgradingId(null);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans select-none p-3 md:p-6 pb-20">
      <div className="max-w-6xl mx-auto space-y-5">
        
        {/* トップヘッダー */}
        <div className="bg-white border border-slate-200/80 p-4 md:p-5 rounded-3xl shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition text-slate-800 flex items-center gap-1.5 text-xs font-black shadow-sm"
            >
              <ChevronLeft size={16} /> クラブハウス
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  インフラ投資
                </span>
                <h1 className="text-xl md:text-2xl font-black text-slate-900">
                  グラウンド整備・設備投資
                </h1>
              </div>
              <p className="text-xs text-slate-600 font-bold mt-0.5">
                部費を投じて本拠地を発展させ、チーム全体に永続的なパッシブバフを付与
              </p>
            </div>
          </div>

          {/* 部費残高（万円表記） */}
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-inner">
            <span className="text-xs text-slate-600 font-bold">部費残高</span>
            <span className="text-2xl font-mono font-black text-amber-700">
              {team.tp_funds.toLocaleString()} <span className="text-xs text-slate-700 font-normal">万円</span>
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* ホームグラウンド ビジュアルショーケース（4段階イラスト連動） */}
        {/* ============================================================== */}
        <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
          <div className="relative w-full h-56 md:h-72 bg-slate-900 overflow-hidden">
            <img
              src={currentGround.image}
              alt={currentGround.name}
              className="w-full h-full object-cover transition-all duration-700 transform hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

            {/* グラウンドランクバッジ ＆ 総合Lv */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className={`text-xs font-black px-3 py-1 rounded-xl border shadow-lg ${currentGround.color}`}>
                {currentGround.rank}
              </span>
              <span className="bg-slate-900/80 backdrop-blur-sm text-white border border-white/20 text-xs font-black px-3 py-1 rounded-xl font-mono shadow-lg">
                総合設備 Lv.{totalLevel} / 18
              </span>
            </div>

            {/* グラウンド名称 ＆ 説明 */}
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h2 className="text-2xl md:text-3xl font-black drop-shadow-md">
                {currentGround.name}
              </h2>
              <p className="text-xs text-slate-200 font-medium mt-1 drop-shadow max-w-2xl">
                {currentGround.desc}
              </p>
            </div>
          </div>

          {/* 下部プログレスバー */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <Building2 size={16} className="text-amber-600" />
              <span>本拠地球場発展度:</span>
              <div className="w-36 md:w-56 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-600 h-full transition-all duration-500"
                  style={{ width: `${(totalLevel / 18) * 100}%` }}
                />
              </div>
              <span className="font-mono font-black text-amber-800">{Math.round((totalLevel / 18) * 100)}%</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
              <span>次の球場昇格まで:</span>
              <span className="font-mono font-black text-slate-900">
                {totalLevel >= 15 ? "最高ランク到達" : `あと ${15 - totalLevel > 5 ? (totalLevel < 5 ? 5 - totalLevel : 10 - totalLevel) : 15 - totalLevel} レベル`}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 設備投資カードグリッド（6種類） */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FACILITIES.map((fac) => {
            const Icon = fac.icon;
            const currentLv = facilityLevels[fac.id] || 0;
            const isMax = currentLv >= 3;
            const nextCost = isMax ? 0 : fac.costs[currentLv];
            const canAfford = team.tp_funds >= nextCost;

            return (
              <div
                key={fac.id}
                className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
              >
                <div className="space-y-3">
                  {/* アイコン ＆ 設備名 ＆ レベル星 */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-sm">
                        <Icon size={24} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 leading-tight">
                          {fac.name}
                        </h3>
                        {/* 星評価（Lv.0〜3） */}
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3].map((star) => (
                            <span
                              key={star}
                              className={`w-3 h-3 rounded-full ${
                                star <= currentLv ? "bg-amber-500" : "bg-slate-200"
                              }`}
                            />
                          ))}
                          <span className="text-[11px] font-mono font-black text-slate-600 ml-1">
                            Lv.{currentLv} / 3
                          </span>
                        </div>
                      </div>
                    </div>

                    {isMax && (
                      <span className="bg-slate-900 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-400/40">
                        MAX
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {fac.desc}
                  </p>

                  {/* 現在の効果 */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 block">現在の効果:</span>
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {fac.effects[currentLv]}
                    </p>
                  </div>

                  {/* 次のレベルの効果（未カンスト時のみ） */}
                  {!isMax && (
                    <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/80 text-[11px] font-bold text-amber-950 flex items-start gap-1.5">
                      <ArrowUpRight size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      <span>次Lv: {fac.effects[currentLv + 1]}</span>
                    </div>
                  )}
                </div>

                {/* 強化ボタン */}
                <div>
                  {isMax ? (
                    <button
                      disabled
                      className="w-full bg-slate-100 text-slate-600 font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-1 cursor-default"
                    >
                      <Check size={16} /> 強化完了（最大レベル）
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(fac)}
                      disabled={upgradingId === fac.id || !canAfford}
                      className={`w-full py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-between transition active:scale-95 shadow-md ${
                        canAfford
                          ? "bg-amber-600 hover:bg-amber-500 text-white"
                          : "bg-slate-200 text-slate-600 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <span>Lv.{currentLv + 1} へ増築</span>
                      <span className="font-mono font-black text-amber-200">
                        {nextCost.toLocaleString()} 万円
                      </span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}