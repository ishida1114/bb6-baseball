// app/scout-spring/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Player, UserTeam, LeagueTeam } from "@/types/baseball";
import { generateDraftCandidates, generateTeamOrder, advanceOpponentsSeason } from "@/lib/draft";
import PlayerCardModal from "@/components/PlayerCardModal";
import { UserPlus, Check, Info } from "lucide-react";

export default function ScoutSpringPage() {
  const router = useRouter();
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [candidates, setCandidates] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [quota, setQuota] = useState<number>(2);
  const [viewPlayer, setViewPlayer] = useState<Player | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
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

      // ★ localStorage に保存された実際のライバル7校所属選手IDを収集
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
    };

    init();
  }, [router]);

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      if (selectedIds.length < quota) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const handleConfirmDraft = async () => {
    if (!team || selectedIds.length !== quota || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const chosenPlayers = candidates
        .filter((c) => selectedIds.includes(c.id))
        .map((p) => ({ ...p, grade: 1 })); // 新入生は確実に1年生

      const nextPlayers = [...team.players, ...chosenPlayers];

      // ★ 新入生を含めた10名全員でオーダー・守備位置・ベンチを安全に完全再構築！
      const nextOrder = generateTeamOrder(nextPlayers);

      const updatedTeam: UserTeam = {
        ...team,
        players: nextPlayers,
        order: nextOrder,
      };

      // 自チームを保存
      localStorage.setItem("bb6_myTeam", JSON.stringify(updatedTeam));

      // ★ ライバル7校も同時に4年生引退・進級・新入生補充を行い、新シーズンへ完全同期！
      await advanceOpponentsSeason(updatedTeam);

      router.push("/");
    } catch (e) {
      console.error("ドラフト確定エラー:", e);
      setIsSubmitting(false);
    }
  };

  if (!team) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8 font-sans select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* ヘッダー */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full">
                第{team.current_year}期生 春のスカウト
              </span>
              <span className="text-xs text-slate-400 font-bold">新入生入部ドラフト</span>
            </div>
            <h1 className="text-2xl font-black flex items-center gap-2 text-white">
              <UserPlus className="text-amber-400" /> 新入部員スカウト（指名枠: {quota}名）
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              全国から集まった逸材から、チームの弱点を補う【{quota}名】を指名してください。
            </p>
          </div>

          <button
            onClick={handleConfirmDraft}
            disabled={selectedIds.length !== quota || isSubmitting}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-lg transition active:scale-95 flex items-center gap-2 text-sm"
          >
            <Check size={18} /> {isSubmitting ? "更新中..." : `指名を確定して新シーズンへ（${selectedIds.length}/${quota}）`}
          </button>
        </div>

        {/* 候補者リスト */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((p) => {
            const isSelected = selectedIds.includes(p.id);
            return (
              <div
                key={p.id}
                onClick={() => toggleSelect(p.id)}
                className={`p-4 rounded-3xl border-2 transition cursor-pointer relative overflow-hidden flex items-center gap-4 ${
                  isSelected
                    ? "bg-slate-800 border-amber-400 ring-2 ring-amber-400/50 shadow-xl"
                    : "bg-slate-800/80 border-slate-700 hover:border-slate-500"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 p-1 rounded-full shadow">
                    <Check size={14} />
                  </div>
                )}

                <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-700 shrink-0 border border-slate-600">
                  <img
                    src={p.image_url || "/901.jpg"}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = "/901.jpg"; }}
                  />
                  <span className="absolute bottom-0 right-0 bg-slate-950 text-white text-[10px] font-black px-1.5 rounded-tl">
                    {p.main_position}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-white truncate">{p.name}</h3>
                    <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-bold">
                      {p.personality || "努力家"}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-300 mt-1 grid grid-cols-3 gap-1">
                    {p.main_position === "P" ? (
                      <>
                        <span>球速: {p.pitch_speed}km</span>
                        <span>制球: {p.control}</span>
                        <span>走力: {p.speed}</span>
                      </>
                    ) : (
                      <>
                        <span>ミート: {p.contact}</span>
                        <span>パワー: {p.power}</span>
                        <span>走力: {p.speed}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewPlayer(p);
                  }}
                  className="p-2 text-slate-400 hover:text-white"
                  title="詳細能力"
                >
                  <Info size={18} />
                </button>
              </div>
            );
          })}
        </div>

      </div>

      {viewPlayer && (
        <PlayerCardModal player={viewPlayer} onClose={() => setViewPlayer(null)} />
      )}
    </div>
  );
}