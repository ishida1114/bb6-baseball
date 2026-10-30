// app/order/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Player, TeamOrder, UserTeam, PositionType } from "@/types/baseball";
import { ChevronLeft, Save, Users, Target, Shield, Zap, Info, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import PlayerCardModal from "@/components/PlayerCardModal";

const POSITIONS: PositionType[] = ["P", "C", "1B", "2B", "3B", "SS"];

type SlotType = 
  | { type: "BATTING"; index: number }
  | { type: "DEFENSE"; pos: PositionType }
  | { type: "DP"; index: number }
  | { type: "BENCH"; index: number };

export default function OrderPage() {
  const router = useRouter();
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [order, setOrder] = useState<TeamOrder | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 選択（入れ替え）用ステート
  const [selectedSlot, setSelectedSlot] = useState<{ slot: SlotType; playerId: number } | null>(null);
  // 詳細カード表示用
  const [viewPlayer, setViewPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const savedData = localStorage.getItem("bb6_myTeam");
    if (!savedData) {
      router.replace("/");
      return;
    }
    try {
      const parsedTeam = JSON.parse(savedData);
      setTeam(parsedTeam);
      setOrder(parsedTeam.order);
    } catch (e) {
      router.replace("/");
    }
  }, [router]);

  if (!team || !order) return null;

  const getPlayer = (id: number) => team.players.find((p) => p.id === id);

  // 能力値ランクバッジ
  const renderRank = (val: number) => {
    if (val >= 85) return <span className="text-amber-800 bg-amber-100 px-1 py-0.2 rounded font-black text-[10px]">S</span>;
    if (val >= 70) return <span className="text-rose-800 bg-rose-100 px-1 py-0.2 rounded font-black text-[10px]">A</span>;
    if (val >= 60) return <span className="text-blue-800 bg-blue-100 px-1 py-0.2 rounded font-black text-[10px]">B</span>;
    if (val >= 50) return <span className="text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded font-black text-[10px]">C</span>;
    if (val >= 40) return <span className="text-slate-800 bg-slate-200 px-1 py-0.2 rounded font-bold text-[10px]">D</span>;
    return <span className="text-slate-600 bg-slate-100 px-1 py-0.2 rounded font-bold text-[10px]">E</span>;
  };

  // 選手入れ替えロジック
  const handleSlotClick = (slot: SlotType, playerId: number) => {
    if (!selectedSlot) {
      // 1人目を選択
      setSelectedSlot({ slot, playerId });
      return;
    }

    if (selectedSlot.playerId === playerId) {
      // 同じ人をもう一度タップしたらキャンセル
      setSelectedSlot(null);
      return;
    }

    // --- 2人目を選択して入れ替え（Swap）を実行 ---
    const newOrder = { ...order };

    const updateSlot = (s: SlotType, newId: number) => {
      if (s.type === "BATTING") newOrder.batting_order[s.index] = newId;
      if (s.type === "DEFENSE") newOrder.defense_positions[s.pos] = newId;
      if (s.type === "DP") newOrder.dp_ids[s.index] = newId;
      if (s.type === "BENCH") newOrder.bench_ids[s.index] = newId;
    };

    updateSlot(selectedSlot.slot, playerId);
    updateSlot(slot, selectedSlot.playerId);

    setOrder(newOrder);
    setSelectedSlot(null);
  };

  const handleSave = () => {
    setIsSaving(true);
    const updatedTeam = { ...team, order };
    localStorage.setItem("bb6_myTeam", JSON.stringify(updatedTeam));
    setTimeout(() => {
      setIsSaving(false);
      router.push("/");
    }, 300);
  };

  // 選択中かどうかの判定用クラス
  const getSlotClass = (playerId: number) => {
    return selectedSlot?.playerId === playerId
      ? "ring-4 ring-amber-500 bg-amber-50 shadow-lg scale-105"
      : "hover:border-amber-400 hover:bg-slate-50";
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-3 md:p-6 font-sans select-none relative pb-24">
      <div className="max-w-6xl mx-auto space-y-5">
        
        {/* === ヘッダー === */}
        <div className="bg-white border border-slate-200/80 p-4 md:p-5 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition text-slate-800 font-bold flex items-center gap-1 active:scale-95"
            >
              <ChevronLeft size={20} /> 戻る
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900">
                  オーダー編成・守備布陣
                </h1>
              </div>
              <p className="text-xs text-slate-700 mt-0.5 font-bold flex items-center gap-1.5">
                <ArrowRightLeft size={14} className="text-amber-600" />
                タップして2人を選ぶと位置を入れ替えます
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-amber-600 hover:bg-amber-500 text-white font-black px-8 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md transition active:scale-95 disabled:opacity-50 w-full md:w-auto"
          >
            <Save size={18} />
            {isSaving ? "保存中..." : "決定してクラブハウスへ"}
          </button>
        </div>

        {/* === メインエリア === */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* 左側：スタメン打順ボード（4カラム） */}
          <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Target size={16} className="text-amber-600" />
                スタメン打順（1〜6番）
              </h2>
              <span className="text-[11px] text-slate-500 font-bold">入替: 打順のみ</span>
            </div>

            <div className="space-y-2.5">
              {order.batting_order.map((playerId, index) => {
                const player = getPlayer(playerId);
                const assignedPos = Object.entries(order.defense_positions).find(([_, id]) => id === playerId)?.[0] || "DP";
                
                return (
                  <div
                    key={`bat-${index}`}
                    className={`border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3 transition cursor-pointer ${getSlotClass(playerId)}`}
                    onClick={() => handleSlotClick({ type: "BATTING", index }, playerId)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm font-mono shrink-0 ${
                      selectedSlot?.playerId === playerId ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-800"
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-black text-slate-900 truncate">
                          {player?.name || "未設定"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black bg-slate-800 text-white px-1.5 py-0.5 rounded">
                            {assignedPos}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewPlayer(player || null); }}
                            className="w-5 h-5 bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-600 rounded flex items-center justify-center transition"
                            title="選手詳細"
                          >
                            <Info size={13} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2.5 text-[10px] text-slate-600 font-bold">
                        <span className="flex items-center gap-1">ミ {renderRank(player?.contact || 0)}</span>
                        <span className="flex items-center gap-1">パ {renderRank(player?.power || 0)}</span>
                        <span className="flex items-center gap-1">走 {renderRank(player?.speed || 0)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右側：ダイヤモンド守備布陣 ＆ DP/控え（8カラム） */}
          <div className="lg:col-span-8 space-y-5 flex flex-col">
            
            {/* グラウンド俯瞰カード */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-emerald-600" />
                  <h2 className="text-sm font-black text-slate-900">内野6人制 守備位置</h2>
                </div>
                <span className="text-[11px] text-slate-500 font-bold">入替: 守備のみ（控えとも交換可）</span>
              </div>

              <div className="relative bg-emerald-800/10 rounded-2xl border border-emerald-900/10 h-[380px] flex items-center justify-center overflow-hidden">
                <div className="absolute w-[260px] h-[260px] bg-amber-200/60 border-2 border-dashed border-amber-600/30 transform rotate-45 rounded-xl translate-y-[15px]" />
                
                <div className="absolute w-22 h-22 bg-amber-300/80 rounded-full border border-amber-500/40 flex items-center justify-center shadow-inner">
                  <div className="w-8 h-2 bg-white rounded-full shadow-sm" />
                </div>

                <div className="absolute top-[60px] w-6 h-6 bg-white border border-slate-300 transform rotate-45 shadow-sm" />
                <div className="absolute left-[50%] -translate-x-[140px] mt-[30px] w-6 h-6 bg-white border border-slate-300 transform rotate-45 shadow-sm" />
                <div className="absolute right-[50%] translate-x-[140px] mt-[30px] w-6 h-6 bg-white border border-slate-300 transform rotate-45 shadow-sm" />
                <div className="absolute bottom-[35px] w-7 h-7 bg-white border border-slate-300 transform rotate-45 rounded-b-sm shadow-sm" />

                {POSITIONS.map((pos) => {
                  const playerId = order.defense_positions[pos];
                  const player = getPlayer(playerId);
                  
                  const posStyles: Record<PositionType, string> = {
                    P: "top-[50%] left-[50%] -translate-x-1/2 -translate-y-[45%]",
                    C: "bottom-[12px] left-[50%] -translate-x-1/2",
                    "1B": "top-[58%] right-[12%]",
                    "2B": "top-[25%] right-[26%]",
                    "3B": "top-[58%] left-[12%]",
                    SS: "top-[25%] left-[26%]",
                  };

                  return (
                    <div
                      key={pos}
                      className={`absolute ${posStyles[pos]} flex flex-col items-center group cursor-pointer z-10`}
                      onClick={() => handleSlotClick({ type: "DEFENSE", pos }, playerId)}
                    >
                      <div className={`bg-white border rounded-xl p-2 w-28 flex flex-col items-center shadow-md transition relative ${
                        selectedSlot?.playerId === playerId ? "border-amber-500 ring-4 ring-amber-400 bg-amber-50 scale-110 z-20" : "border-slate-300 hover:scale-105"
                      }`}>
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                            selectedSlot?.playerId === playerId ? "bg-amber-600 text-white" : "bg-slate-800 text-white"
                          }`}>
                            {pos}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewPlayer(player || null); }}
                            className="text-slate-400 hover:text-amber-600"
                            title="選手詳細"
                          >
                            <Info size={13} />
                          </button>
                        </div>
                        <span className="text-xs font-black text-slate-900 truncate w-full text-center">
                          {player?.name.split(" ")[0] || "-"}
                        </span>
                        <div className="text-[10px] text-slate-600 font-bold flex gap-1 mt-0.5">
                          <span>守{renderRank(player?.fielding || 0)}</span>
                          <span>肩{renderRank(player?.arm || 0)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 下部：DP枠 ＆ 控えベンチ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* DP（指名打者） */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Zap size={14} className="text-rose-600" /> DP（指名打者）
                  </h3>
                  <span className="text-[10px] text-slate-500 font-bold">守備免除・打撃のみ</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {order.dp_ids.map((id, idx) => {
                    const p = getPlayer(id);
                    return (
                      <div
                        key={`dp-${idx}`}
                        className={`bg-white border rounded-xl p-3 text-center cursor-pointer transition relative ${getSlotClass(id)}`}
                        onClick={() => handleSlotClick({ type: "DP", index: idx }, id)}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); setViewPlayer(p || null); }}
                          className="absolute top-2 right-2 text-slate-300 hover:text-amber-500"
                        >
                          <Info size={14} />
                        </button>
                        <div className="text-[10px] text-rose-700 font-black mb-0.5">DP {idx + 1}</div>
                        <div className="text-xs font-black text-slate-900 truncate">{p?.name || "-"}</div>
                        <div className="text-[10px] text-slate-600 font-bold mt-1 flex justify-center gap-1">
                          <span>ミ{renderRank(p?.contact || 0)}</span>
                          <span>パ{renderRank(p?.power || 0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 控え（ベンチ） */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Users size={14} className="text-blue-600" /> 控えベンチ
                  </h3>
                  <span className="text-[10px] text-slate-500 font-bold">交代要員</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {order.bench_ids.map((id, idx) => {
                    const p = getPlayer(id);
                    return (
                      <div
                        key={`bench-${idx}`}
                        className={`bg-white border rounded-xl p-3 text-center cursor-pointer transition relative ${getSlotClass(id)}`}
                        onClick={() => handleSlotClick({ type: "BENCH", index: idx }, id)}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); setViewPlayer(p || null); }}
                          className="absolute top-2 right-2 text-slate-300 hover:text-amber-500"
                        >
                          <Info size={14} />
                        </button>
                        <div className="text-[10px] text-blue-700 font-black mb-0.5">控え {idx + 1}</div>
                        <div className="text-xs font-black text-slate-900 truncate">{p?.name || "-"}</div>
                        <div className="text-[10px] text-slate-500 font-bold mt-1">
                          本職: {p?.main_position} ({p?.grade}年)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* 選手カードモーダル（共通） */}
      {viewPlayer && (
        <PlayerCardModal player={viewPlayer} onClose={() => setViewPlayer(null)} />
      )}

      {/* 選択中のフローティングバナー（スマホ向け案内） */}
      {selectedSlot && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-40 border border-slate-700">
          <ArrowRightLeft size={16} className="text-amber-400" />
          <span className="text-sm font-bold">入れ替える相手を選択してください</span>
          <button
            onClick={() => setSelectedSlot(null)}
            className="ml-2 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-full font-black"
          >
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
}