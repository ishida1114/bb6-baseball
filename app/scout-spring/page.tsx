// app/scout-spring/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Player, UserTeam, LeagueTeam, PositionType } from "@/types/baseball";
import { generateDraftCandidates, generateTeamOrder, advanceOpponentsSeason, hasUniqueImage } from "@/lib/draft";
import PlayerCardModal from "@/components/PlayerCardModal";
import SoundToggle from "@/components/SoundToggle";
import { playBgm, playSe } from "@/lib/sound";
import { UserPlus, Check, Info, Sparkles, Filter, Globe2, Loader2 } from "lucide-react";

type FilterType = "ALL" | "P" | "C" | "INF";

export default function ScoutSpringPage() {
  const router = useRouter();
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [candidates, setCandidates] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [quota, setQuota] = useState<number>(2);
  const [viewPlayer, setViewPlayer] = useState<Player | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // スカウト画面BGM再生
    playBgm("opening");

    const init = async () => {
      const saved = localStorage.getItem("bb6_myTeam");
      if (!saved) {
        router.replace("/");
        return;
      }
      const parsed: UserTeam = JSON.parse(saved);
      setTeam(parsed);

      // 10名体制を維持するための必要獲得人数
      const needed = Math.max(1, 10 - parsed.players.length);
      setQuota(needed);

      // localStorage に保存された実際のライバル7校所属選手IDを収集
      let oppList: LeagueTeam[] = [];
      const savedOppStr = localStorage.getItem("bb6_league_opponents");
      if (savedOppStr) {
        try { oppList = JSON.parse(savedOppStr); } catch {}
      }

      const oppIds = new Set<number>();
      oppList.forEach((t) => t.players?.forEach((p) => oppIds.add(p.id)));

      // 他校に在籍している選手を除外してドラフト候補を取得
      const draftList = await generateDraftCandidates(parsed, oppIds);
      setCandidates(draftList);
      setIsLoading(false);
    };

    init();
  }, [router]);

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      playSe("meet");
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      if (selectedIds.length < quota) {
        playSe("meet");
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const handleConfirmDraft = async () => {
    if (!team || selectedIds.length !== quota || isSubmitting) return;
    setIsSubmitting(true);
    playSe("playball");

    try {
      const chosenPlayers = candidates
        .filter((c) => selectedIds.includes(c.id))
        .map((p) => ({ ...p, grade: 1 })); // 新入生は確実に1年生

      const nextPlayers = [...team.players, ...chosenPlayers];

      // 新入生を含めた10名全員でオーダー・守備位置・ベンチを安全に完全再構築！
      const nextOrder = generateTeamOrder(nextPlayers);

      const updatedTeam: UserTeam = {
        ...team,
        players: nextPlayers,
        order: nextOrder,
      };

      // 自チームを保存
      localStorage.setItem("bb6_myTeam", JSON.stringify(updatedTeam));

      // ライバル7校も同時に4年生引退・進級・新入生補充を行い、新シーズンへ完全同期！
      await advanceOpponentsSeason(updatedTeam);

      router.push("/");
    } catch (e) {
      console.error("ドラフト確定エラー:", e);
      setIsSubmitting(false);
    }
  };

  const getPlayerImageUrl = (p: Player) => {
    if (p.image_url && p.image_url.trim() !== "" && p.image_url !== "NaN" && p.image_url !== "null") {
      if (p.image_url.startsWith("http")) return p.image_url;
      return p.image_url.startsWith("/") ? p.image_url : `/${p.image_url}`;
    }
    return "/901.jpg";
  };

  // フィルタリングされた候補者リスト
  const filteredCandidates = useMemo(() => {
    return candidates.filter((p) => {
      if (activeFilter === "ALL") return true;
      if (activeFilter === "P") return p.main_position === "P";
      if (activeFilter === "C") return p.main_position === "C";
      if (activeFilter === "INF") return ["1B", "2B", "3B", "SS"].includes(p.main_position);
      return true;
    });
  }, [candidates, activeFilter]);

  if (!team) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-3 md:p-8 font-sans select-none pb-20">
      <div className="max-w-5xl mx-auto space-y-5">
        
        {/* トップバー・ヘッダー */}
        <div className="bg-slate-900 border border-slate-800 p-5 md:p-6 rounded-3xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-0.5 rounded-full shadow-sm">
                第{team.current_year}期生 春のスカウト
              </span>
              <span className="text-xs text-slate-400 font-bold">新入生入部ドラフト</span>
              <span className="text-[11px] font-mono text-amber-400 font-black bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                候補 {candidates.length}名
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black flex items-center gap-2 text-white">
              <UserPlus className="text-amber-400" /> 新入部員スカウト（指名枠: {quota}名）
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              全国・アジアから集まった逸材から、チームの弱点を補う【{quota}名】を指名してください。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <SoundToggle className="bg-slate-800 border-slate-700 text-white" />

            <button
              onClick={handleConfirmDraft}
              disabled={selectedIds.length !== quota || isSubmitting}
              className={`px-5 py-3 rounded-2xl font-black text-xs md:text-sm shadow-xl transition active:scale-95 flex items-center gap-2 ${
                selectedIds.length === quota
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 animate-pulse border-2 border-white/60"
                  : "bg-slate-800 border border-slate-700 text-slate-500 opacity-60 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-slate-950" />
                  <span>新シーズン更新中...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>指名を確定して新シーズンへ（{selectedIds.length}/{quota}）</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ポジション別絞り込みタブ */}
        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 pl-2 shrink-0">
            <Filter size={14} className="text-amber-400" />
            <span>ポジション絞り込み:</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { id: "ALL" as FilterType, label: "全員表示" },
              { id: "P" as FilterType, label: "投手 (P)" },
              { id: "C" as FilterType, label: "捕手 (C)" },
              { id: "INF" as FilterType, label: "内野手 (1B/2B/3B/SS)" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`py-1.5 px-3 rounded-xl text-xs font-black transition ${
                  activeFilter === tab.id
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 候補者リスト */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-bold">ドラフト候補者をスカウト中...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="bg-slate-900 border border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs">
            該当するポジションの候補者がいません。「全員表示」を選択してください。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredCandidates.map((p) => {
              const isSelected = selectedIds.includes(p.id);
              const isUnique = hasUniqueImage(p);
              const isAsia = p.id >= 246 && p.id <= 255;

              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelect(p.id)}
                  className={`p-3.5 rounded-3xl border-2 transition cursor-pointer relative overflow-hidden flex items-center gap-3.5 ${
                    isSelected
                      ? "bg-slate-800 border-amber-400 ring-2 ring-amber-400/50 shadow-2xl scale-[1.01]"
                      : "bg-slate-900/90 border-slate-800 hover:border-slate-600 hover:bg-slate-900"
                  }`}
                >
                  {/* 選択チェックマーク */}
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 bg-amber-500 text-slate-950 p-1 rounded-full shadow-lg animate-in zoom-in-75">
                      <Check size={14} className="stroke-[3]" />
                    </div>
                  )}

                  {/* 選手アバター */}
                  <div className="relative w-16 h-16 md:w-18 md:h-18 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700 shadow-md">
                    <img
                      src={getPlayerImageUrl(p)}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = "/901.jpg"; }}
                    />
                    <span className="absolute bottom-0 right-0 bg-slate-950 text-white text-[10px] font-mono font-black px-1.5 py-0.2 rounded-tl border-t border-l border-slate-800 shadow">
                      {p.main_position}
                    </span>
                  </div>

                  {/* 選手スペック */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-black text-sm text-white truncate">{p.name}</h3>
                      
                      {isAsia ? (
                        <span className="text-[9px] bg-orange-500/20 text-orange-300 border border-orange-400/40 px-1.5 py-0.2 rounded font-black flex items-center gap-0.5">
                          <Globe2 size={10} /> アジア選抜
                        </span>
                      ) : isUnique ? (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded font-black flex items-center gap-0.5">
                          <Sparkles size={10} /> ★注目選手
                        </span>
                      ) : null}

                      <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.2 rounded font-bold">
                        {p.personality || "努力家"}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-300 mt-1.5 grid grid-cols-3 gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80">
                      {p.main_position === "P" ? (
                        <>
                          <span>球速: <strong className="text-amber-400">{p.pitch_speed}</strong>k</span>
                          <span>制球: <strong className="text-slate-100">{p.control}</strong></span>
                          <span>走力: <strong className="text-slate-100">{p.speed}</strong></span>
                        </>
                      ) : (
                        <>
                          <span>ミート: <strong className="text-amber-400">{p.contact}</strong></span>
                          <span>パワー: <strong className="text-rose-400">{p.power}</strong></span>
                          <span>走力: <strong className="text-emerald-400">{p.speed}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 詳細ボタン */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewPlayer(p);
                    }}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition shrink-0"
                    title="詳細能力"
                  >
                    <Info size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {viewPlayer && (
        <PlayerCardModal player={viewPlayer} onClose={() => setViewPlayer(null)} />
      )}
    </div>
  );
}