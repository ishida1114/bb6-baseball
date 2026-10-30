// app/scout-opening/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Player, PositionType } from "@/types/baseball";
import { OPPONENT_UNIVERSITIES } from "@/lib/league";
import { hasUniqueImage, finalizeOpeningScout, EXCLUDED_DRAFT_IDS } from "@/lib/draft";
import { Check, Users, Sparkles, ChevronRight, X, Shield, ArrowRight, Trophy } from "lucide-react";

interface ScoutAttemptResult {
  player: Player;
  isSuccess: boolean;
  destinationUni?: string;
  dialogue: string;
}

export default function ScoutOpeningPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [protagonist, setProtagonist] = useState<Player | null>(null);
  const [candidatePool, setCandidatePool] = useState<Player[]>([]);
  
  // 青葉に入部が決まった選手たち（主人公含む最大10名）
  const [joinedPlayers, setJoinedPlayers] = useState<Player[]>([]);
  // プレイヤーがチェックを入れた選手IDリスト
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  // 断られた選手の行き先マップ（選手ID -> 大学名）
  const [rejectedMap, setRejectedMap] = useState<Record<number, string>>({});

  // 一人ずつカードが立ち上がる演出用ステート
  const [negotiationQueue, setNegotiationQueue] = useState<ScoutAttemptResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isFinishing, setIsFinishing] = useState(false);

  // 必要人数（10名 - 現在の部員数）
  const neededCount = 10 - joinedPlayers.length;

  useEffect(() => {
    async function loadCandidates() {
      setLoading(true);

      // ① キャラクリ画面で作成・保存された主人公データを取得
      const savedCustomProto = localStorage.getItem("bb6_custom_protagonist");
      let protagonistPlayer: Player;

      if (savedCustomProto) {
        try {
          protagonistPlayer = JSON.parse(savedCustomProto);
        } catch (e) {
          protagonistPlayer = {
            id: 1001,
            name: "青葉 結衣",
            main_position: "P",
            grade: 1,
            batting_hand: "R",
            image_url: "/1001.jpg",
            pitch_speed: 60,
            control: 65,
            contact: 60,
            power: 58,
            speed: 55,
            fielding: 62,
            arm: 62,
            is_protagonist: true,
          };
        }
      } else {
        protagonistPlayer = {
          id: 1001,
          name: "青葉 結衣",
          main_position: "P",
          grade: 1,
          batting_hand: "R",
          image_url: "/1001.jpg",
          pitch_speed: 60,
          control: 65,
          contact: 60,
          power: 58,
          speed: 55,
          fielding: 62,
          arm: 62,
          is_protagonist: true,
        };
      }

      setProtagonist(protagonistPlayer);
      setJoinedPlayers([protagonistPlayer]);

      // ② Supabaseから候補プールを取得（特別選手および主人公を除外した固定グラフィック選手）
      const { data } = await supabase
        .from("bb6_players")
        .select("*")
        .order("id", { ascending: true });

      if (data && data.length > 0) {
        const uniques = data.filter(
          (p) =>
            hasUniqueImage(p) &&
            p.id !== protagonistPlayer.id &&
            !EXCLUDED_DRAFT_IDS.has(p.id) // ★ アジア選抜・全米選抜・実業団を完全除外
        );
        setCandidatePool(uniques);
      }
      setLoading(false);
    }

    loadCandidates();
  }, []);

  // チェックボックスのON/OFF
  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      if (selectedIds.length < neededCount) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  // 交渉開始（チェックした選手たちの合否を一括生成し、1人ずつの演出キューへ）
  const startNegotiation = () => {
    if (selectedIds.length !== neededCount) return;

    const chosenPlayers = candidatePool.filter((p) => selectedIds.includes(p.id));
    const results: ScoutAttemptResult[] = chosenPlayers.map((player) => {
      // 成功率 約65%
      const isSuccess = Math.random() < 0.65;
      if (isSuccess) {
        const successDialogues = [
          "よろしくお願いします！ 一緒に全国の頂点を目指しましょう！",
          "青葉女子大、すごく良い雰囲気ですね！ 私でよければ全力で力になります！",
          "エースがあなたなら心強い！ 私のバットで援護してみせます！",
          "誘ってくれて嬉しい！ 二つ返事で入部決定です！",
        ];
        return {
          player,
          isSuccess: true,
          dialogue: successDialogues[Math.floor(Math.random() * successDialogues.length)],
        };
      } else {
        const randomOpp = OPPONENT_UNIVERSITIES[Math.floor(Math.random() * OPPONENT_UNIVERSITIES.length)];
        const failDialogues = [
          `ごめんなさい、私…${randomOpp.name}から推薦特待をもらっていて…`,
          `熱意は嬉しいけれど、私の目標は${randomOpp.name}で日本一になることなの。`,
          `本当にごめんなさい！ ${randomOpp.name}の監督にお世話になる約束をしていて…`,
        ];
        return {
          player,
          isSuccess: false,
          destinationUni: randomOpp.name,
          dialogue: failDialogues[Math.floor(Math.random() * failDialogues.length)],
        };
      }
    });

    setNegotiationQueue(results);
    setCurrentIndex(0); // 1人目のカードを立ち上げる
  };

  // 「次の返事を見る」ボタン
  const handleNextCard = () => {
    if (currentIndex < negotiationQueue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 全員の回答演出が終了したときの結果集計
      const successfulPlayers: Player[] = [];
      const newRejectedMap = { ...rejectedMap };

      negotiationQueue.forEach((res) => {
        if (res.isSuccess) {
          // 学年をランダム（1〜3年）で付与
          const randomGrade = Math.floor(Math.random() * 3) + 1;
          successfulPlayers.push({ ...res.player, grade: randomGrade });
        } else if (res.destinationUni) {
          newRejectedMap[res.player.id] = res.destinationUni;
        }
      });

      const updatedJoined = [...joinedPlayers, ...successfulPlayers];
      setJoinedPlayers(updatedJoined);
      setRejectedMap(newRejectedMap);

      // 候補プールから、今回交渉した選手（成功・失敗問わず）を除外
      const negotiatedIds = new Set(negotiationQueue.map((r) => r.player.id));
      setCandidatePool((prev) => prev.filter((p) => !negotiatedIds.has(p.id)));

      // 選択状態とキューをクリア
      setSelectedIds([]);
      setNegotiationQueue([]);
      setCurrentIndex(-1);
    }
  };

  // 10名達成で本編（クラブハウス）へ
  const handleFinishScout = async () => {
    setIsFinishing(true);
    try {
      await finalizeOpeningScout(joinedPlayers, rejectedMap);
      router.push("/");
    } catch (e) {
      console.error(e);
      setIsFinishing(false);
    }
  };

  const getImageUrl = (p: Player) => {
    if (p.image_url && p.image_url.trim() !== "" && p.image_url !== "NaN") {
      if (p.image_url.startsWith("http")) return p.image_url;
      return p.image_url.startsWith("/") ? p.image_url : `/${p.image_url}`;
    }
    return "/901.jpg";
  };

  if (loading || !protagonist) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono font-bold text-amber-400">スカウト候補生をリストアップ中...</span>
        </div>
      </div>
    );
  }

  // 現在立ち上がっているカード
  const currentCard = currentIndex >= 0 ? negotiationQueue[currentIndex] : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans select-none pb-28">
      {/* 上部ヘッダー */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded border border-amber-300">
                新入生スカウト会議
              </span>
              <h1 className="text-lg md:text-xl font-black text-slate-900">
                青葉女子大学野球部 ロスター結成
              </h1>
            </div>
            <p className="text-xs text-slate-700 font-bold mt-0.5">
              候補者の中から <span className="text-amber-700 font-black">{neededCount}名</span> にチェックを入れて声をかけてください
            </p>
          </div>

          {/* 現在の獲得状況プログレス */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl">
            <Users size={16} className="text-amber-600" />
            <div className="text-xs font-bold text-slate-700">
              獲得メンバー: <span className="text-base font-black text-amber-700 font-mono">{joinedPlayers.length}</span> / 10名
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

        {/* 10名揃った場合の結成バナー */}
        {joinedPlayers.length >= 10 ? (
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-3xl p-6 md:p-8 shadow-xl text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="inline-flex items-center gap-2 bg-white/20 px-3.5 py-1 rounded-full text-xs font-black">
              <Trophy size={16} /> ロスター結成完了！
            </div>
            <h2 className="text-2xl md:text-3xl font-black">
              青葉女子大学野球部 10名が堂々揃いました！
            </h2>
            <p className="text-xs md:text-sm text-amber-100 font-bold max-w-lg mx-auto">
              頼もしい仲間たちとともに、いよいよ大学公式リーグ第1節へ出陣です。
            </p>
            <button
              onClick={handleFinishScout}
              disabled={isFinishing}
              className="bg-slate-950 hover:bg-slate-900 text-white font-black px-8 py-4 rounded-2xl shadow-2xl transition active:scale-95 text-sm inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isFinishing ? "登録処理中..." : "クラブハウスへ移動する"} <ArrowRight size={18} />
            </button>
          </div>
        ) : null}

        {/* 獲得済みメンバー一覧（横スクロール） */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-600" /> 入部確定メンバー（{joinedPlayers.length}名）
            </h3>
            <span className="text-[11px] text-slate-500 font-bold font-mono">あと {neededCount} 名</span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {joinedPlayers.map((p) => (
              <div key={p.id} className="w-24 shrink-0 flex flex-col items-center bg-slate-50 border border-slate-200 rounded-2xl p-2 shadow-sm">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 mb-1.5 relative border border-slate-300">
                  <img src={getImageUrl(p)} alt={p.name} className="w-full h-full object-cover" />
                  {p.is_protagonist && (
                    <span className="absolute bottom-0 inset-x-0 bg-amber-600 text-white text-[9px] font-black text-center py-0.2">
                      エース
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-black bg-slate-800 text-white px-1.5 py-0.2 rounded mb-0.5">
                  {p.main_position}
                </span>
                <span className="text-xs font-black text-slate-900 truncate w-full text-center">
                  {p.name.split(" ")[0]}
                </span>
              </div>
            ))}

            {/* まだ空いている枠のスロットプレースホルダー */}
            {Array.from({ length: neededCount }).map((_, i) => (
              <div key={i} className="w-24 h-[118px] shrink-0 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                <span className="text-[10px] font-bold">空き枠</span>
                <span className="text-xs font-black font-mono">#{joinedPlayers.length + i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* スカウト候補生の一覧（グリッド） */}
        {joinedPlayers.length < 10 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                全国スカウト候補選手一覧（固定グラフィック）
              </h3>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                選択中: <span className="font-black font-mono">{selectedIds.length}</span> / {neededCount}名
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {candidatePool.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleSelect(p.id)}
                    className={`bg-white rounded-2xl border p-3 flex flex-col justify-between cursor-pointer transition select-none relative shadow-sm ${
                      isSelected
                        ? "border-amber-500 ring-4 ring-amber-400/50 bg-amber-50/50 scale-[1.02]"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                    }`}
                  >
                    {/* チェックマークアイコン */}
                    <div className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition z-10 ${
                      isSelected ? "bg-amber-600 text-white" : "bg-white/90 border border-slate-300 text-transparent"
                    }`}>
                      <Check size={14} strokeWidth={3} />
                    </div>

                    {/* 正方形の顔写真 */}
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-800 mb-2 relative border border-slate-200 shadow-inner">
                      <img src={getImageUrl(p)} alt={p.name} className="w-full h-full object-cover" />
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                        <span className="bg-slate-900/90 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                          {p.main_position}
                        </span>
                        <span className="bg-white/90 text-slate-900 text-[10px] font-black px-1 py-0.5 rounded">
                          {p.batting_hand === "L" ? "左" : "右"}
                        </span>
                      </div>
                    </div>

                    {/* 選手名 ＆ 主な能力 */}
                    <div className="space-y-1">
                      <div className="text-xs font-black text-slate-900 truncate">
                        {p.name}
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-center font-bold text-slate-600 bg-slate-50 rounded-lg p-1 border border-slate-100">
                        <div><span className="text-[8px] text-slate-400 block">打</span>{p.contact}</div>
                        <div><span className="text-[8px] text-slate-400 block">力</span>{p.power}</div>
                        <div><span className="text-[8px] text-slate-400 block">走</span>{p.speed}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* 画面下部固定：交渉開始アクションバー */}
      {joinedPlayers.length < 10 && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 z-20 shadow-2xl">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="text-xs font-bold text-slate-700">
              あと <span className="text-base font-black text-amber-700 font-mono">{neededCount - selectedIds.length}名</span> 選択してください
            </div>

            <button
              onClick={startNegotiation}
              disabled={selectedIds.length !== neededCount}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-black px-8 py-3.5 rounded-2xl shadow-lg transition active:scale-95 text-sm flex items-center gap-2"
            >
              <span>{neededCount}名に声をかける（交渉開始）</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 1人ずつカードが立ち上がって回答する演出モーダル */}
      {currentCard && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* 上部：スクエア顔写真 ＆ 合否スタンプ演出 */}
            <div className="relative w-full aspect-square bg-slate-800 overflow-hidden">
              <img
                src={getImageUrl(currentCard.player)}
                alt={currentCard.player.name}
                className="w-full h-full object-cover"
              />

              {/* 成否スタンプ */}
              <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/30">
                {currentCard.isSuccess ? (
                  <div className="border-4 border-amber-400 bg-amber-600/90 text-white font-black text-2xl md:text-3xl px-6 py-3 rounded-2xl shadow-2xl transform -rotate-6 animate-in zoom-in-75 duration-300 flex items-center gap-2">
                    <Check size={32} strokeWidth={4} /> 入部決定！
                  </div>
                ) : (
                  <div className="border-4 border-rose-400 bg-slate-900/95 text-rose-300 font-black text-lg md:text-xl px-5 py-3 rounded-2xl shadow-2xl transform rotate-6 animate-in zoom-in-75 duration-300 text-center">
                    <div className="text-xs text-rose-400 font-bold mb-0.5">交渉不成立…</div>
                    {currentCard.destinationUni}へ進学
                  </div>
                )}
              </div>

              {/* 選手基本バッジ */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <span className="bg-slate-900/90 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow">
                  本職: {currentCard.player.main_position}
                </span>
                <span className="text-white text-lg font-black drop-shadow">
                  {currentCard.player.name}
                </span>
              </div>
            </div>

            {/* 下部：本人の返答セリフ ＆ 次へボタン */}
            <div className="p-5 space-y-4">
              <div className={`p-4 rounded-2xl border text-sm font-bold leading-relaxed ${
                currentCard.isSuccess
                  ? "bg-amber-50 border-amber-200 text-amber-950"
                  : "bg-slate-50 border-slate-200 text-slate-800"
              }`}>
                「{currentCard.dialogue}」
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 font-mono font-bold">
                <span>スカウト交渉 ({currentIndex + 1} / {negotiationQueue.length}人目)</span>
              </div>

              <button
                onClick={handleNextCard}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-2xl transition active:scale-95 text-sm shadow-md flex items-center justify-center gap-1.5"
              >
                {currentIndex < negotiationQueue.length - 1 ? (
                  <>次の選手の回答を聞く <ChevronRight size={18} /></>
                ) : (
                  <>スカウト結果を確認する <Check size={18} /></>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}