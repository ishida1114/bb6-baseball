// app/training/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Player, UserTeam } from "@/types/baseball";
import PlayerCardModal from "@/components/PlayerCardModal";
import { 
  ChevronLeft, Dumbbell, Zap, Flame, Shield, Gauge, Sparkles, 
  ArrowUpRight, Award, CheckCircle2, Minus, Play, Lock
} from "lucide-react";
import Link from "next/link";

// 型の未定義エラーを防ぐため、内部で直接定義
type SkillTier = 1 | 2 | 3;
type SkillTreeId = "FASTBALL" | "BREAKING" | "POWER" | "CONTACT" | "SPEED" | "CLUTCH";

type TrainingType = "BATTING" | "RUNNING" | "DEFENSE" | "PITCHING" | "CAMP";

interface TrainingMenu {
  id: TrainingType;
  title: string;
  desc: string;
  targetStats: string;
  costTp: number; // 万円
  icon: any;
  color: string;
  badgeBg: string;
}

const MENUS: TrainingMenu[] = [
  {
    id: "BATTING",
    title: "打撃・フリーバッティング特化",
    desc: "実戦形式の打ち込みで長打力とミート力を強化",
    targetStats: "ミート または パワー",
    costTp: 30,
    icon: Flame,
    color: "text-amber-600",
    badgeBg: "bg-amber-50 border-amber-200",
  },
  {
    id: "RUNNING",
    title: "俊足・走塁＆スモールボール",
    desc: "スタートダッシュとベースランニング、小技を反復",
    targetStats: "走力",
    costTp: 30,
    icon: Zap,
    color: "text-blue-600",
    badgeBg: "bg-blue-50 border-blue-200",
  },
  {
    id: "DEFENSE",
    title: "内野連係・シートノック特訓",
    desc: "6人制の広大な内野を守り抜く送球と守備反応を磨く",
    targetStats: "守備力 または 肩力",
    costTp: 30,
    icon: Shield,
    color: "text-emerald-600",
    badgeBg: "bg-emerald-50 border-emerald-200",
  },
  {
    id: "PITCHING",
    title: "ブルペン投げ込み・制球特訓",
    desc: "マウンドの柱を作る球速アップとコース投げ分け",
    targetStats: "球速 または 制球",
    costTp: 30,
    icon: Gauge,
    color: "text-indigo-600",
    badgeBg: "bg-indigo-50 border-indigo-200",
  },
  {
    id: "CAMP",
    title: "【強化指定】山籠り集中合宿",
    desc: "多額の部費を投じ、過酷な特訓で限界突破＆スキル開眼",
    targetStats: "全ステータス大幅増 ＆ スキル閃き",
    costTp: 150,
    icon: Sparkles,
    color: "text-rose-600",
    badgeBg: "bg-rose-50 border-rose-300",
  },
];

// スキルツリー定義
const SKILL_TREES: Record<SkillTreeId, { id: string; name: string; tier: SkillTier }[]> = {
  FASTBALL: [
    { id: "fastball_1", name: "ノビ◯", tier: 1 },
    { id: "fastball_2", name: "剛速球", tier: 2 },
    { id: "fastball_3", name: "火の玉ストレート", tier: 3 },
  ],
  BREAKING: [
    { id: "breaking_1", name: "キレ◯", tier: 1 },
    { id: "breaking_2", name: "ドクターK", tier: 2 },
    { id: "breaking_3", name: "神威の七色魔球", tier: 3 },
  ],
  POWER: [
    { id: "power_1", name: "パワーヒッター", tier: 1 },
    { id: "power_2", name: "豪快フルスイング", tier: 2 },
    { id: "power_3", name: "怪童アーチスト", tier: 3 },
  ],
  CONTACT: [
    { id: "contact_1", name: "アベレージ", tier: 1 },
    { id: "contact_2", name: "スプレーヒッター", tier: 2 },
    { id: "contact_3", name: "安打職人・神の眼", tier: 3 },
  ],
  SPEED: [
    { id: "speed_1", name: "足自慢", tier: 1 },
    { id: "speed_2", name: "電光石火", tier: 2 },
    { id: "speed_3", name: "神速韋駄天", tier: 3 },
  ],
  CLUTCH: [
    { id: "clutch_1", name: "勝負強さ", tier: 1 },
    { id: "clutch_2", name: "逆境◯", tier: 2 },
    { id: "clutch_3", name: "絶対的不動心", tier: 3 },
  ],
};

interface GrowthResult {
  player: Player;
  statName: string;
  prevVal: number;
  newVal: number;
  diff: number;
  status: "GREAT" | "NORMAL" | "KEEP";
  evolvedSkill?: { name: string; tier: SkillTier };
}

export default function TrainingPage() {
  const router = useRouter();
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedMenu, setSelectedMenu] = useState<TrainingMenu>(MENUS[0]);
  const [isPracticing, setIsPracticing] = useState(false);
  const [growthResults, setGrowthResults] = useState<GrowthResult[] | null>(null);

  const [viewPlayer, setViewPlayer] = useState<Player | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bb6_myTeam");
      if (saved) {
        setTeam(JSON.parse(saved));
      }
    } catch (e) {
      console.error("チームデータ読み込み失敗:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <p className="text-sm font-bold text-slate-700 mb-3">チームデータが見つかりません。タイトルから始めてください。</p>
        <Link href="/title" className="bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs">
          タイトルへ戻る
        </Link>
      </div>
    );
  }

  // 今節ですでに練習したかの判定
  const isAlreadyTrainedThisRound = (team as any).last_trained_round === team.current_round;

  const tryEvolveSkill = (player: Player, menuId: TrainingType, isGreat: boolean): { name: string; tier: SkillTier } | undefined => {
    const chance = menuId === "CAMP" ? 0.50 : isGreat ? 0.35 : 0.08;
    if (Math.random() > chance) return undefined;

    let treeKey: SkillTreeId = "CLUTCH";
    if (menuId === "BATTING") treeKey = Math.random() > 0.5 ? "POWER" : "CONTACT";
    else if (menuId === "RUNNING") treeKey = "SPEED";
    else if (menuId === "DEFENSE") treeKey = "CLUTCH";
    else if (menuId === "PITCHING") treeKey = Math.random() > 0.5 ? "FASTBALL" : "BREAKING";
    else if (menuId === "CAMP") {
      const allTrees: SkillTreeId[] = player.main_position === "P" 
        ? ["FASTBALL", "BREAKING", "CLUTCH"] 
        : ["POWER", "CONTACT", "SPEED", "CLUTCH"];
      treeKey = allTrees[Math.floor(Math.random() * allTrees.length)];
    }

    const tree = SKILL_TREES[treeKey];
    const currentSkills = player.skills || [];

    let currentTier = 0;
    let currentSkillId: string | null = null;
    tree.forEach((s) => {
      if (currentSkills.includes(s.id) && s.tier > currentTier) {
        currentTier = s.tier;
        currentSkillId = s.id;
      }
    });

    if (currentTier < 3) {
      const nextSkill = tree[currentTier];
      player.skills = currentSkills.filter((id) => id !== currentSkillId).concat(nextSkill.id);
      return { name: nextSkill.name, tier: nextSkill.tier };
    }

    return undefined;
  };

  const executeTraining = () => {
    if (isAlreadyTrainedThisRound) {
      alert(`第${team.current_round}節の全体練習は完了しています！\n公式戦に出場して次の節へ進んでください。`);
      return;
    }

    if (team.tp_funds < selectedMenu.costTp) {
      alert(`部費が不足しています！（必要: ${selectedMenu.costTp}万円 ／ 所持: ${team.tp_funds}万円）\n公式戦に勝利して部費を獲得してください。`);
      return;
    }

    setIsPracticing(true);
    setGrowthResults(null);

    setTimeout(() => {
      const results: GrowthResult[] = [];
      const updatedPlayers = team.players.map((player) => {
        const p = { ...player };

        const roll = Math.random();
        let status: "GREAT" | "NORMAL" | "KEEP" = "KEEP";
        let gain = 0;

        if (selectedMenu.id === "CAMP") {
          if (roll < 0.30) {
            status = "GREAT";
            gain = Math.floor(Math.random() * 2) + 3;
          } else if (roll < 0.80) {
            status = "NORMAL";
            gain = Math.floor(Math.random() * 2) + 1;
          }
        } else {
          if (roll < 0.15) {
            status = "GREAT";
            gain = Math.floor(Math.random() * 2) + 3;
          } else if (roll < 0.50) {
            status = "NORMAL";
            gain = Math.floor(Math.random() * 2) + 1;
          }
        }

        let statLabel = "ミート";

        if (selectedMenu.id === "BATTING") {
          const isPower = Math.random() > 0.5;
          statLabel = isPower ? "パワー" : "ミート";
          const prev = isPower ? p.power : p.contact;
          const nextVal = Math.min(99, prev + gain);
          if (isPower) p.power = nextVal;
          else p.contact = nextVal;
          const evolved = tryEvolveSkill(p, selectedMenu.id, status === "GREAT");
          results.push({ player: p, statName: statLabel, prevVal: prev, newVal: nextVal, diff: gain, status, evolvedSkill: evolved });
        } else if (selectedMenu.id === "RUNNING") {
          statLabel = "走力";
          const prev = p.speed;
          const nextVal = Math.min(99, prev + gain);
          p.speed = nextVal;
          const evolved = tryEvolveSkill(p, selectedMenu.id, status === "GREAT");
          results.push({ player: p, statName: statLabel, prevVal: prev, newVal: nextVal, diff: gain, status, evolvedSkill: evolved });
        } else if (selectedMenu.id === "DEFENSE") {
          const isArm = Math.random() > 0.5;
          statLabel = isArm ? "肩力" : "守備力";
          const prev = isArm ? p.arm : p.fielding;
          const nextVal = Math.min(99, prev + gain);
          if (isArm) p.arm = nextVal;
          else p.fielding = nextVal;
          const evolved = tryEvolveSkill(p, selectedMenu.id, status === "GREAT");
          results.push({ player: p, statName: statLabel, prevVal: prev, newVal: nextVal, diff: gain, status, evolvedSkill: evolved });
        } else if (selectedMenu.id === "PITCHING") {
          const isP = p.main_position === "P";
          statLabel = isP ? "球速" : "制球";
          const prev = isP ? p.pitch_speed : p.control;
          const nextVal = Math.min(99, prev + gain);
          if (isP) p.pitch_speed = nextVal;
          else p.control = nextVal;
          const evolved = tryEvolveSkill(p, selectedMenu.id, status === "GREAT");
          results.push({ player: p, statName: statLabel, prevVal: prev, newVal: nextVal, diff: gain, status, evolvedSkill: evolved });
        } else if (selectedMenu.id === "CAMP") {
          statLabel = "総合力";
          const prev = p.contact;
          p.contact = Math.min(99, p.contact + gain);
          p.power = Math.min(99, p.power + gain);
          p.speed = Math.min(99, p.speed + gain);
          p.fielding = Math.min(99, p.fielding + gain);
          if (p.main_position === "P") p.pitch_speed = Math.min(99, p.pitch_speed + gain);
          const evolved = tryEvolveSkill(p, selectedMenu.id, status === "GREAT");
          results.push({ player: p, statName: statLabel, prevVal: prev, newVal: prev + gain, diff: gain, status, evolvedSkill: evolved });
        }

        return p;
      });

      const updatedTeam = {
        ...team,
        tp_funds: team.tp_funds - selectedMenu.costTp,
        last_trained_round: team.current_round,
        players: updatedPlayers,
      };

      localStorage.setItem("bb6_myTeam", JSON.stringify(updatedTeam));
      setTeam(updatedTeam as UserTeam);
      setGrowthResults(results);
      setIsPracticing(false);
    }, 500);
  };

  const getPlayerAvatarUrl = (p: Player) => {
    if (p.image_url && p.image_url.trim() !== "" && p.image_url !== "NaN") {
      if (p.image_url.startsWith("http")) return p.image_url;
      return p.image_url.startsWith("/") ? p.image_url : `/${p.image_url}`;
    }
    return "/901.jpg";
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-8 font-sans select-none">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ヘッダー */}
        <div className="bg-white border border-slate-200/80 p-4 md:p-5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
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
                  部活動育成センター
                </span>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  第{team.current_round}節 / 練習ターン
                </span>
                <h1 className="text-xl md:text-2xl font-black text-slate-900">
                  全体練習・特訓合宿
                </h1>
              </div>
              <p className="text-xs text-slate-600 font-bold mt-0.5">
                大成功(約15%): +3〜4 ／ 通常成功(約35%): +1〜2 ／ 現状維持(約50%): +0（スキル覚醒あり）
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-inner">
            <span className="text-xs text-slate-600 font-bold">部費残高</span>
            <span className="text-xl font-mono font-black text-amber-700">
              {team.tp_funds.toLocaleString()} <span className="text-xs text-slate-600 font-normal">万円</span>
            </span>
          </div>
        </div>

        {/* メインエリア */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* 左側：メニュー選択（5カラム） */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase flex items-center gap-1.5">
                <Dumbbell size={15} className="text-amber-600" /> 練習メニューを選択
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isAlreadyTrainedThisRound
                  ? "bg-slate-100 text-slate-500 border-slate-300"
                  : "bg-emerald-50 text-emerald-800 border-emerald-300"
              }`}>
                {isAlreadyTrainedThisRound ? "今節: 練習消化済み" : "今節: 練習可能（1回）"}
              </span>
            </div>

            <div className="space-y-2.5">
              {MENUS.map((menu) => {
                const Icon = menu.icon;
                const isSelected = selectedMenu.id === menu.id;

                return (
                  <div
                    key={menu.id}
                    onClick={() => { setSelectedMenu(menu); setGrowthResults(null); }}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-start gap-3.5 ${
                      isSelected
                        ? "bg-white border-amber-500 ring-4 ring-amber-400/40 shadow-md scale-[1.01]"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${menu.badgeBg} ${menu.color}`}>
                      <Icon size={22} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-900 truncate">
                          {menu.title}
                        </h3>
                        <span className="text-xs font-mono font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                          -{menu.costTp} 万円
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {menu.desc}
                      </p>
                      <div className="text-[11px] font-mono font-bold text-slate-700 mt-1 flex items-center gap-1">
                        <ArrowUpRight size={13} className="text-emerald-600" />
                        対象: {menu.targetStats}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 練習実行ボタン */}
            {isAlreadyTrainedThisRound ? (
              <div className="space-y-2 mt-4">
                <button
                  disabled
                  className="w-full bg-slate-200 text-slate-500 font-black py-4 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-slate-300 shadow-sm"
                >
                  <Lock size={16} /> 第{team.current_round}節の全体練習は完了しています
                </button>
                <Link
                  href="/match"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-3.5 rounded-2xl shadow-md transition active:scale-95 text-xs flex items-center justify-center gap-2 block text-center"
                >
                  <Play size={16} fill="currentColor" /> 公式戦に出場して次節へ進む
                </Link>
              </div>
            ) : (
              <button
                onClick={executeTraining}
                disabled={isPracticing || team.tp_funds < selectedMenu.costTp}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-black py-4 rounded-2xl shadow-lg transition active:scale-95 text-base flex items-center justify-center gap-2 mt-4"
              >
                <Dumbbell size={20} />
                {isPracticing ? "特訓メニュー消化中..." : `このメニューで特訓を開始する（${selectedMenu.costTp}万円）`}
              </button>
            )}
          </div>

          {/* 右側：部員一覧 ＆ 結果レポート */}
          <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4 min-h-[500px] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">
                  {growthResults ? "全体特訓 結果レポート" : "青葉女子大学野球部 所属部員（10名）"}
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-bold">
                選手タップで詳細カード
              </span>
            </div>

            {growthResults ? (
              <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-xs font-black text-amber-900">
                  <CheckCircle2 size={16} /> 本日の練習完了！ 公式戦に向けてコンディションを整えましょう。
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {growthResults.map((res) => (
                    <div
                      key={res.player.id}
                      onClick={() => setViewPlayer(res.player)}
                      className={`p-3 rounded-2xl border flex flex-col justify-between cursor-pointer transition ${
                        res.status === "GREAT"
                          ? "bg-amber-50/90 border-amber-400 ring-2 ring-amber-300 shadow-sm"
                          : res.status === "NORMAL"
                          ? "bg-emerald-50/50 border-emerald-200"
                          : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-300 relative">
                          <img
                            src={getPlayerAvatarUrl(res.player)}
                            alt={res.player.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 truncate">
                              {res.player.name}
                            </span>
                            {res.status === "GREAT" && (
                              <span className="text-[10px] font-black bg-amber-600 text-white px-2 py-0.2 rounded-full shadow-sm animate-pulse">
                                大成功！
                              </span>
                            )}
                            {res.status === "NORMAL" && (
                              <span className="text-[10px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded-full">
                                成功
                              </span>
                            )}
                            {res.status === "KEEP" && (
                              <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                                <Minus size={10} /> 維持
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-mono font-bold text-slate-700 mt-1 flex items-center gap-1.5">
                            <span>{res.statName}:</span>
                            {res.diff > 0 ? (
                              <>
                                <span className="text-slate-400">{res.prevVal}</span>
                                <span className="text-slate-400">➔</span>
                                <span className="font-black text-slate-900">{res.newVal}</span>
                                <span className="text-emerald-700 font-black text-[11px] bg-emerald-100 px-1.5 py-0.2 rounded ml-1">
                                  +{res.diff}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-500 font-medium">変化なし ({res.newVal})</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {res.evolvedSkill && (
                        <div className="mt-2 pt-1.5 border-t border-amber-200/80 flex items-center gap-1 text-[11px] font-black text-amber-900 bg-amber-100/70 px-2 py-1 rounded-xl">
                          <Sparkles size={13} className="text-amber-600 shrink-0" />
                          <span>スキル開眼: 【{res.evolvedSkill.name}】(Tier {res.evolvedSkill.tier})</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto max-h-[460px] pr-1">
                {team.players.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setViewPlayer(p)}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl flex items-center gap-3 cursor-pointer transition"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-300 relative shadow-sm">
                      <img
                        src={getPlayerAvatarUrl(p)}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-slate-900/90 text-white text-[9px] font-black text-center py-0.2">
                        {p.main_position}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {p.name}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          {p.grade}年
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-600 font-bold mt-1 flex gap-2">
                        <span>ミ{p.contact}</span>
                        <span>パ{p.power}</span>
                        <span>走{p.speed}</span>
                        <span>守{p.fielding}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500 font-bold">
              ※練習は1節につき1回のみ実施できます。次の公式戦を終えると次節の練習が可能になります。
            </div>
          </div>

        </div>

      </div>

      {viewPlayer && (
        <PlayerCardModal player={viewPlayer} onClose={() => setViewPlayer(null)} />
      )}
    </div>
  );
}