// app/cafe/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserTeam, Player, PositionType } from "@/types/baseball";
import SoundToggle from "@/components/SoundToggle";
import { playBgm, playSe } from "@/lib/sound";
import { 
  Coffee, ChevronLeft, Sparkles, Heart, Shield, 
  ArrowRight, Check, Coins, Users, MessageSquare, AlertCircle
} from "lucide-react";
import Link from "next/link";

interface CafeTier {
  id: number;
  name: string;
  subTitle: string;
  cost: number;
  imageUrl: string;
  successBoost: number;
  greatBoost: number;
  greatRate: number;
  desc: string;
}

const CAFE_TIERS: CafeTier[] = [
  {
    id: 1,
    name: "駅前オープンテラス",
    subTitle: "カジュアル軽食セット",
    cost: 3,
    imageUrl: "/cafe_1.jpg",
    successBoost: 1,
    greatBoost: 4,
    greatRate: 0.25,
    desc: "部活帰りにふらっと立ち寄れるテラス席。紙カップのドリンクと焼き立てドーナツでリフレッシュ。",
  },
  {
    id: 2,
    name: "レトロ純喫茶",
    subTitle: "名物プリン＆珈琲セット",
    cost: 8,
    imageUrl: "/cafe_2.jpg",
    successBoost: 2,
    greatBoost: 5,
    greatRate: 0.40,
    desc: "落ち着いたジャズが流れる隠れ家喫茶。濃厚な自家製プリンをつつきながらじっくり本音トーク。",
  },
  {
    id: 3,
    name: "ホテル展望ラウンジ",
    subTitle: "特製アフタヌーンティー",
    cost: 15,
    imageUrl: "/cafe_3.jpg",
    successBoost: 3,
    greatBoost: 6,
    greatRate: 0.55,
    desc: "見晴らしの良い最高層ラウンジ。贅沢なスイーツタワーを囲んで、次の大勝負に向けた絆を深める。",
  },
];

const TALK_TOPICS = [
  {
    title: "最近の調子や感覚を聞く",
    talk: "「ねえ、最近調子どう？ 守備とかフォームで気になってることあったら話してみてよ」",
  },
  {
    title: "スイーツを楽しんで息抜きする",
    talk: "「ここのスイーツめっちゃ美味しい！ 今日はいっぱい甘いもの食べて息抜きしよ！」",
  },
  {
    title: "次の試合の勝ちパターンを語り合う",
    talk: "「次の試合、絶対勝ちたいね！ うちのコンビでどんなプレー見せてやろうか？」",
  },
];

const ALL_POSITIONS: PositionType[] = ["P", "C", "1B", "2B", "3B", "SS"];

export default function CafePage() {
  const router = useRouter();

  const [team, setTeam] = useState<UserTeam | null>(null);
  const [protagonist, setProtagonist] = useState<Player | null>(null);

  // カフェ設定ステート
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<number>(1);
  const [trainTarget, setTrainTarget] = useState<"STAMINA" | "DEFENSE">("STAMINA");
  const [targetPosition, setTargetPosition] = useState<PositionType>("2B");

  // シーン進行（"SELECT" -> "TALK" -> "RESULT"）
  const [sceneStep, setSceneStep] = useState<"SELECT" | "TALK" | "RESULT">("SELECT");
  const [chosenTopicIdx, setChosenTopicIdx] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // 結果ステート
  const [resultData, setResultData] = useState<{
    isGreat: boolean;
    boost: number;
    statName: string;
    oldVal: number;
    newVal: number;
    partnerName: string;
    replyText: string;
  } | null>(null);

  // 突発イベント（招待）フラグ
  const [isInvited, setIsInvited] = useState(false);

  useEffect(() => {
    playBgm("clubhouse");

    const saved = localStorage.getItem("bb6_myTeam");
    if (!saved) {
      router.replace("/");
      return;
    }

    try {
      const parsed: UserTeam = JSON.parse(saved);
      setTeam(parsed);

      const proto = parsed.players.find((p) => p.is_protagonist) || parsed.players[0];
      setProtagonist(proto);

      const currentRnd = parsed.current_round || 1;
      const currentSeason = parsed.current_season || "SPRING";

      // ★ 突発招待フラグの確認（現在の節とシーズンに合致するものだけ採用）
      let matchedInvite = false;
      const inviteStr = localStorage.getItem("bb6_cafe_invite");
      if (inviteStr) {
        try {
          const invData = JSON.parse(inviteStr);
          if (invData.round === currentRnd && invData.season === currentSeason) {
            const invitePlayerExists = parsed.players.find((p) => p.id === invData.partnerId);
            if (invitePlayerExists) {
              setIsInvited(true);
              setSelectedTierId(2);
              setSelectedPartnerId(invData.partnerId);
              matchedInvite = true;
            }
          } else {
            // 過去の節の古いお誘いは消去
            localStorage.removeItem("bb6_cafe_invite");
          }
        } catch {
          localStorage.removeItem("bb6_cafe_invite");
        }
      }

      if (!matchedInvite) {
        // お誘いがない場合は、主人公以外の最初の部員を選択
        const defaultPartner = parsed.players.find((p) => p.id !== proto.id) || parsed.players[1];
        if (defaultPartner) {
          setSelectedPartnerId(defaultPartner.id);
        }
      }
    } catch {
      router.replace("/");
    }
  }, [router]);

  if (!team || !protagonist) return null;

  const currentRound = team.current_round || 1;
  const lastCafeRound = (team as any).last_cafe_round || 0;
  const alreadyVisitedThisRound = !isInvited && lastCafeRound === currentRound;

  const partner = team.players.find((p) => p.id === selectedPartnerId) || team.players[1];
  const selectedTier = CAFE_TIERS.find((t) => t.id === selectedTierId) || CAFE_TIERS[0];
  const actualCost = isInvited ? 0 : selectedTier.cost;

  // カフェへ出発
  const handleProceedToTalk = () => {
    if (alreadyVisitedThisRound) {
      alert("カフェでの個別交流は、1節につき1回までです。次の試合を終えたらまた行けるようになります！");
      return;
    }
    if (team.tp_funds < actualCost) {
      alert("部費が足りません！");
      return;
    }
    playSe("meet");
    setSceneStep("TALK");
  };

  // 3択の声掛けを選択
  const handleSelectTopic = (topicIdx: number) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setChosenTopicIdx(topicIdx);

    const isGreat = Math.random() < selectedTier.greatRate;
    const boost = isGreat ? selectedTier.greatBoost : selectedTier.successBoost;

    if (isGreat) {
      playSe("homerun");
    } else {
      playSe("meet");
    }

    setTimeout(() => {
      const updatedPlayers = team.players.map((p) => {
        if (p.id !== partner.id) return p;

        const updated = { ...p };
        if (trainTarget === "STAMINA") {
          const currentStamina = updated.stamina || 65;
          updated.stamina = Math.min(99, currentStamina + boost);
        } else {
          const currentAptitudes = { ...((updated as any).defense_aptitude || {}) };
          const curVal = currentAptitudes[targetPosition] || (updated.main_position === targetPosition ? 100 : 40);
          currentAptitudes[targetPosition] = Math.min(100, curVal + boost);
          (updated as any).defense_aptitude = currentAptitudes;
        }
        return updated;
      });

      let statLabel = "スタミナ上限";
      let oldScore = partner.stamina || 65;
      let newScore = Math.min(99, oldScore + boost);

      if (trainTarget === "DEFENSE") {
        statLabel = `${targetPosition}守備適性`;
        const apts = (partner as any).defense_aptitude || {};
        oldScore = apts[targetPosition] || (partner.main_position === targetPosition ? 100 : 40);
        newScore = Math.min(100, oldScore + boost);
      }

      const updatedTeam: UserTeam = {
        ...team,
        tp_funds: Math.max(0, team.tp_funds - actualCost),
        players: updatedPlayers,
      };
      (updatedTeam as any).last_cafe_round = currentRound;

      localStorage.setItem("bb6_myTeam", JSON.stringify(updatedTeam));
      // ★ カフェを利用したのでお誘いフラグは必ず完全消去
      localStorage.removeItem("bb6_cafe_invite");
      setTeam(updatedTeam);

      const reply = isGreat
        ? "「それすっごく良い！ めっちゃイメージ湧いてきた！ 次の相手、うちのコンビで完封しちゃおうよ！」"
        : "「あはは、聞いてくれてありがと！ なんか話したら肩の力抜けたかも。次の試合もよろしくね！」";

      setResultData({
        isGreat,
        boost,
        statName: statLabel,
        oldVal: oldScore,
        newVal: newScore,
        partnerName: partner.name,
        replyText: reply,
      });

      setIsProcessing(false);
      setSceneStep("RESULT");
    }, 600);
  };

  const getPlayerAvatarUrl = (p?: Player | null) => {
    if (!p) return "/901.jpg";
    if (p.image_url && p.image_url.trim() !== "" && p.image_url !== "NaN") {
      if (p.image_url.startsWith("http")) return p.image_url;
      return p.image_url.startsWith("/") ? p.image_url : `/${p.image_url}`;
    }
    return "/901.jpg";
  };

  return (
    <div className="min-h-screen bg-amber-950/20 text-slate-900 font-sans select-none p-3 md:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* トップヘッダー */}
        <div className="bg-white/95 backdrop-blur-md border border-amber-200 p-4 rounded-3xl shadow-sm flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition text-slate-800 flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft size={16} /> クラブハウスへ戻る
          </Link>

          <div className="flex items-center gap-3">
            <div className="bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 shadow-inner">
              <Coins size={15} className="text-amber-600" />
              <span className="text-xs text-slate-600 font-bold">部費残高:</span>
              <span className="text-base font-mono font-black text-amber-700">
                {team.tp_funds.toLocaleString()} <span className="text-xs font-normal">万円</span>
              </span>
            </div>
            <SoundToggle />
          </div>
        </div>

        {/* ============================================================== */}
        {/* STEP 1：パートナー＆プラン＆育成項目の選択 */}
        {/* ============================================================== */}
        {sceneStep === "SELECT" && (
          <div className="space-y-5 animate-in fade-in">
            
            <div className="bg-white border border-amber-200/80 rounded-3xl p-5 shadow-sm space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-xs font-black">
                <Coffee size={14} className="text-amber-700" /> 放課後カフェタイム
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900">
                チームメイトとカフェで過ごす
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                美味しいスイーツを食べながら他愛もない話や野球の相談をしてリフレッシュ！<br />
                スタミナ上限を増やしたり、本職以外の新しい守備位置の適性を開拓できます。
              </p>

              {alreadyVisitedThisRound && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 mt-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  カフェでの交流は1節につき1回までです。次の試合を終えたらまた誘えるようになります！
                </div>
              )}

              {isInvited && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-2xl text-xs font-black flex items-center gap-2 mt-2 animate-pulse">
                  <Sparkles size={16} className="text-emerald-600 shrink-0" />
                  {partner.name.split(" ")[0]} からのお誘いが発生中！ 今回は部費消費0円でカフェへ行けます！
                </div>
              )}
            </div>

            {/* ① 誘うチームメイトの選択（カード形式） */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Users size={15} className="text-amber-600" /> ① 誰をカフェに誘う？
                </h3>
                <span className="text-[10px] text-slate-500 font-bold">選手カードをタップして選択</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-h-72 overflow-y-auto p-1">
                {team.players
                  .filter((p) => p.id !== protagonist.id)
                  .map((p) => {
                    const isSelected = selectedPartnerId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPartnerId(p.id)}
                        className={`p-2.5 rounded-2xl border-2 flex flex-col items-center cursor-pointer transition text-center relative overflow-hidden ${
                          isSelected
                            ? "bg-amber-50 border-amber-500 ring-4 ring-amber-400/50 shadow-md scale-[1.02]"
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}

                        {/* カード風写真エリア */}
                        <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-800 mb-2 border border-slate-200 shadow-sm">
                          <img src={getPlayerAvatarUrl(p)} alt={p.name} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 right-1 bg-slate-950/90 text-white text-[9px] font-mono font-black px-1.5 py-0.2 rounded border border-white/20">
                            {p.main_position}
                          </span>
                        </div>

                        <span className="font-black text-xs text-slate-900 truncate w-full">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono font-bold mt-0.5">
                          <span>第{p.grade ?? 1}学年</span>
                          <span>•</span>
                          <span className="text-amber-700">ST:{p.stamina || 65}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* ② カフェのプラン（Tier 1〜3） */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Coffee size={15} className="text-amber-600" /> ② どのお店に行く？
                </h3>
                <span className="text-[10px] text-slate-500 font-bold">部費に応じた3段階</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {CAFE_TIERS.map((tier) => {
                  const isSelected = selectedTierId === tier.id;
                  const canAfford = team.tp_funds >= tier.cost || isInvited;

                  return (
                    <div
                      key={tier.id}
                      onClick={() => canAfford && setSelectedTierId(tier.id)}
                      className={`p-4 rounded-3xl border-2 flex flex-col justify-between transition relative overflow-hidden ${
                        isSelected
                          ? "bg-amber-50/70 border-amber-500 ring-4 ring-amber-400/50 shadow-md scale-[1.02]"
                          : canAfford
                          ? "bg-slate-50 border-slate-200 hover:border-slate-300 cursor-pointer"
                          : "opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed"
                      }`}
                    >
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-800 mb-3 border border-slate-200 shadow-inner">
                        <img
                          src={tier.imageUrl}
                          alt={tier.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2.5">
                          <span className="text-[10px] font-mono font-black text-amber-300">
                            Tier {tier.id}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-900">{tier.name}</h4>
                          <span className="text-xs font-black text-amber-700 font-mono">
                            {isInvited ? "無料招待" : `${tier.cost}万円`}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-900/80 block">
                          {tier.subTitle}
                        </span>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                          {tier.desc}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono">
                        <span className="font-bold text-slate-600">成長値:</span>
                        <span className="font-black text-slate-900">
                          成功 <strong className="text-emerald-700">+{tier.successBoost}</strong> / 大成功 <strong className="text-amber-600">+{tier.greatBoost}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ③ 伸ばしたい能力の選択 */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Sparkles size={15} className="text-amber-600" /> ③ どんな話を深める？（伸ばす項目）
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTrainTarget("STAMINA")}
                  className={`p-4 rounded-2xl border-2 text-left transition ${
                    trainTarget === "STAMINA"
                      ? "bg-amber-50 border-amber-500 ring-2 ring-amber-400 shadow-sm"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Heart size={16} className="text-rose-600" />
                    <span className="text-xs font-black text-slate-900">スタミナ上限アップ</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    投手は完投ペースを維持、野手は試合後半のエラー激減や打力低下を防ぐ。
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTrainTarget("DEFENSE")}
                  className={`p-4 rounded-2xl border-2 text-left transition ${
                    trainTarget === "DEFENSE"
                      ? "bg-amber-50 border-amber-500 ring-2 ring-amber-400 shadow-sm"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={16} className="text-blue-600" />
                    <span className="text-xs font-black text-slate-900">守備適性を開拓（コンバート）</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    本職以外のポジションを守れるように適性を鍛え、失策率を大幅低減。
                  </p>
                </button>
              </div>

              {trainTarget === "DEFENSE" && (
                <div className="pt-2 animate-in fade-in">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                    開拓したい守備位置を選択:
                  </span>
                  <div className="grid grid-cols-6 gap-2">
                    {ALL_POSITIONS.map((pos) => {
                      const isMain = partner.main_position === pos;
                      const apts = (partner as any).defense_aptitude || {};
                      const currentVal = apts[pos] || (isMain ? 100 : 40);

                      return (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setTargetPosition(pos)}
                          className={`p-2 rounded-xl border text-center transition font-mono ${
                            targetPosition === pos
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span className="text-xs font-black block">{pos}</span>
                          <span className="text-[10px] opacity-80 block">
                            {isMain ? "本職" : `${currentVal}%`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 出発ボタン */}
            <button
              onClick={handleProceedToTalk}
              disabled={alreadyVisitedThisRound}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-black py-4 rounded-2xl shadow-xl transition active:scale-95 text-sm md:text-base flex items-center justify-center gap-2"
            >
              <span>{partner.name.split(" ")[0]} と一緒に出発する</span>
              <ArrowRight size={18} />
            </button>

          </div>
        )}

        {/* ============================================================== */}
        {/* ★【改修点②】STEP 2：カフェでの対話（カード形式で向かい合うシーン） */}
        {/* ============================================================== */}
        {sceneStep === "TALK" && (
          <div className="space-y-5 animate-in fade-in duration-300">
            
            {/* カフェ背景 ＆ 2人の選手カード対面ステージ */}
            <div className="relative w-full h-[380px] sm:h-[420px] rounded-3xl overflow-hidden border-2 border-amber-300 shadow-2xl bg-slate-950 flex flex-col justify-between p-4 sm:p-6">
              
              {/* 背景カフェ画像 */}
              <img
                src={selectedTier.imageUrl}
                alt={selectedTier.name}
                className="absolute inset-0 w-full h-full object-cover object-center blur-[1px] scale-105"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />

              {/* 上部店舗ラベル */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="font-mono text-xs font-black text-amber-300 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-amber-400/40 shadow-lg flex items-center gap-1.5">
                  <Coffee size={14} className="text-amber-400" /> {selectedTier.name} ({selectedTier.subTitle})
                </span>
                <span className="text-[10px] font-mono text-white/80 bg-slate-900/80 px-2.5 py-1 rounded-full border border-white/20">
                  放課後トークタイム
                </span>
              </div>

              {/* ★ テーブルを挟んで向かい合う【2枚の選手カード】 */}
              <div className="relative z-10 flex items-end justify-around gap-3 sm:gap-6 pb-2">
                
                {/* 左：主人公カード（あなた） */}
                <div className="w-36 sm:w-44 bg-slate-900/90 backdrop-blur-md border-2 border-amber-400/90 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex flex-col items-center text-center space-y-1.5 transform hover:scale-105 transition">
                  <span className="text-[9px] sm:text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-mono">
                    あなた（エース）
                  </span>
                  
                  {/* カード写真 */}
                  <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-800 border border-white/20 shadow">
                    <img src={getPlayerAvatarUrl(protagonist)} alt="主人公" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 bg-slate-950 text-white text-[9px] font-black px-1 rounded">
                      {protagonist.main_position}
                    </span>
                  </div>

                  <div className="w-full">
                    <span className="font-black text-xs sm:text-sm text-white block truncate">
                      {protagonist.name}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-mono text-amber-300 block">
                      STAMINA: {protagonist.stamina || 65}
                    </span>
                  </div>
                </div>

                {/* 中央テーブル演出 */}
                <div className="hidden sm:flex flex-col items-center justify-center space-y-1 my-auto text-amber-300 opacity-80">
                  <span className="text-2xl animate-pulse">☕</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">TALK</span>
                </div>

                {/* 右：チームメイトカード（相手） */}
                <div className={`w-36 sm:w-44 bg-slate-900/90 backdrop-blur-md border-2 border-white/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex flex-col items-center text-center space-y-1.5 transform hover:scale-105 transition ${
                  isProcessing ? "animate-bounce duration-500 ring-4 ring-amber-400" : ""
                }`}>
                  <span className="text-[9px] sm:text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full font-mono">
                    チームメイト
                  </span>
                  
                  {/* カード写真 */}
                  <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-800 border border-white/20 shadow">
                    <img src={getPlayerAvatarUrl(partner)} alt={partner.name} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 bg-slate-950 text-white text-[9px] font-black px-1 rounded">
                      {partner.main_position}
                    </span>
                  </div>

                  <div className="w-full">
                    <span className="font-black text-xs sm:text-sm text-white block truncate">
                      {partner.name}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-mono text-emerald-400 block">
                      STAMINA: {partner.stamina || 65}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* 声掛けの3択 */}
            <div className="bg-white border border-amber-200/80 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <MessageSquare size={15} className="text-amber-600" /> どんな風に声を掛ける？
                </h3>
                <span className="text-[10px] text-slate-500 font-bold">直感で選んでOK！</span>
              </div>

              <div className="space-y-2.5">
                {TALK_TOPICS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleSelectTopic(idx)}
                    className="w-full bg-slate-50 hover:bg-amber-50 active:scale-[0.98] border border-slate-200 hover:border-amber-400 p-4 rounded-2xl transition text-left space-y-1 group shadow-sm"
                  >
                    <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                      {item.title}
                    </span>
                    <p className="text-xs md:text-sm font-black text-slate-900 group-hover:text-amber-950 transition">
                      {item.talk}
                    </p>
                  </button>
                ))}
              </div>

              {isProcessing && (
                <div className="text-center py-2 text-xs font-mono font-black text-amber-700 animate-pulse">
                  会話が弾んでいます... ✨
                </div>
              )}
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 3：結果発表モーダル */}
        {/* ============================================================== */}
        {sceneStep === "RESULT" && resultData && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-amber-300 text-center space-y-5 animate-in zoom-in-95 duration-200">
              
              <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                resultData.isGreat
                  ? "bg-amber-100 border-2 border-amber-400 text-amber-600"
                  : "bg-emerald-50 border-2 border-emerald-300 text-emerald-600"
              }`}>
                {resultData.isGreat ? <Sparkles size={32} /> : <Check size={32} />}
              </div>

              <div className="space-y-1">
                <span className={`text-[10px] font-black tracking-widest px-3 py-0.5 rounded-full uppercase border ${
                  resultData.isGreat
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-emerald-100 text-emerald-900 border-emerald-300"
                }`}>
                  {resultData.isGreat ? "GREAT SUCCESS!! 大成功!!" : "SUCCESS! 成功!"}
                </span>
                <h2 className="text-xl md:text-2xl font-black text-slate-900">
                  {resultData.partnerName} と絆が深まった！
                </h2>
              </div>

              {/* 相手の返答テキスト */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs md:text-sm font-black text-slate-900 leading-relaxed text-left shadow-inner">
                {resultData.replyText}
              </div>

              {/* 能力アップ表示 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between font-mono">
                <span className="text-xs font-bold text-slate-600 font-sans">
                  {resultData.statName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">{resultData.oldVal}</span>
                  <span className="text-slate-400 font-black">➔</span>
                  <span className="text-lg font-black text-amber-700">{resultData.newVal}</span>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    +{resultData.boost}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  router.push("/");
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-xl transition active:scale-95 text-xs md:text-sm flex items-center justify-center gap-2"
              >
                <span>部室（クラブハウス）へ戻る</span>
                <ArrowRight size={16} />
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}