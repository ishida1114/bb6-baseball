// app/title/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserTeam } from "@/types/baseball";
import { Play, RotateCcw } from "lucide-react";

export default function TitlePage() {
  const router = useRouter();
  const [savedTeam, setSavedTeam] = useState<UserTeam | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("bb6_myTeam");
    if (saved) {
      try {
        setSavedTeam(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // はじめから（完全初期化 ＆ 主人公作成画面へ）
  const handleNewGame = async () => {
    if (savedTeam && !confirm("既存のセーブデータを削除し、新入生エースの作成から新しく開始しますか？")) {
      return;
    }
    setLoading(true);
    try {
      // 既存セーブデータを消去
      localStorage.removeItem("bb6_myTeam");
      localStorage.removeItem("bb6_league");
      localStorage.removeItem("bb6_league_opponents");
      localStorage.removeItem("bb6_custom_protagonist");

      // 主人公キャラクリ画面へ遷移
      router.push("/character-create");
    } catch (e) {
      console.error("初期化エラー:", e);
      setLoading(false);
    }
  };

  // つづきから（クラブハウスへ）
  const handleContinue = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-end relative overflow-hidden select-none font-sans pb-10 md:pb-14">
      {/* メインビジュアル背景 */}
      <div className="absolute inset-0 z-0">
        <img
          src="/title.png"
          alt="監督、プレイボールです！"
          className="w-full h-full object-cover object-center"
        />
        {/* ボタンを見やすくするための下部グラデーションオーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />
      </div>

      {/* 操作ボタンエリア */}
      <div className="relative z-10 max-w-md w-full px-5 flex flex-col items-center space-y-3.5">
        
        {/* つづきから */}
        {savedTeam && (
          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-2xl transition flex items-center justify-between border-2 border-white/60 group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-slate-950/10 flex items-center justify-center">
                <Play size={20} fill="currentColor" />
              </div>
              <div>
                <div className="text-base font-black">つづきから始める</div>
                <div className="text-[11px] font-mono text-slate-900 font-bold">
                  第{savedTeam.current_year}期生 / 第{savedTeam.current_round}節 公式戦
                </div>
              </div>
            </div>
            <span className="text-xs bg-slate-950 text-white font-black px-3 py-1.5 rounded-lg shadow-sm">
              再開
            </span>
          </button>
        )}

        {/* はじめから（主人公作成へ） */}
        <button
          onClick={handleNewGame}
          disabled={loading}
          className={`w-full py-4 px-6 rounded-2xl font-black transition flex items-center justify-between border-2 active:scale-95 shadow-2xl backdrop-blur-md ${
            savedTeam
              ? "bg-slate-900/80 hover:bg-slate-900 text-white border-white/20"
              : "bg-amber-500 hover:bg-amber-400 text-slate-950 border-white/60"
          }`}
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <RotateCcw size={18} />
            </div>
            <div>
              <div className="text-base font-black">はじめから（主人公作成）</div>
              <div className="text-[11px] font-mono opacity-80 font-bold">
                1年生エースを作成して第1期生スタート
              </div>
            </div>
          </div>
          <span className={`text-xs font-black px-3 py-1.5 rounded-lg shadow-sm ${
            savedTeam ? "bg-white/20 text-white" : "bg-slate-950 text-white"
          }`}>
            New
          </span>
        </button>

        {/* ロード中インジケーター */}
        {loading && (
          <div className="text-xs font-mono font-black text-amber-300 animate-pulse bg-slate-900/90 px-4 py-1.5 rounded-full border border-amber-400/50 shadow-lg">
            入学手続き中... キャラクター作成画面へ進みます
          </div>
        )}

        <div className="text-[11px] text-white/70 font-mono font-bold drop-shadow pt-1">
          © BB6 Intercollegiate Baseball Simulation
        </div>
      </div>
    </div>
  );
}