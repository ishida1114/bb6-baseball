// app/title/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserTeam } from "@/types/baseball";
import { playBgm } from "@/lib/sound";
import SoundToggle from "@/components/SoundToggle";
import { Play, RotateCcw } from "lucide-react";

export default function TitlePage() {
  const router = useRouter();
  const [savedTeam, setSavedTeam] = useState<UserTeam | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // タイトルBGM再生
    playBgm("opening");

    const saved = localStorage.getItem("bb6_myTeam");
    if (saved) {
      try {
        setSavedTeam(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // はじめから（全ゲームデータを完全リセット）
  const handleNewGame = async () => {
    if (savedTeam && !confirm("既存のセーブデータを削除し、設備投資やチーム状態をすべて初期化して新しく開始しますか？")) {
      return;
    }
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        // サウンド設定（bb6_sound_muted）以外の全ゲームセーブデータを完全削除
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("bb6_") && key !== "bb6_sound_muted") {
            localStorage.removeItem(key);
          }
        });
      }

      router.push("/character-create");
    } catch (e) {
      console.error("初期化エラー:", e);
      setLoading(false);
    }
  };

  // つづきから
  const handleContinue = () => {
    router.push("/");
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 flex flex-col items-center justify-end relative overflow-hidden select-none font-sans pb-6 sm:pb-10">
      
      {/* 画面右上の音量オン／オフボタン */}
      <div className="absolute top-4 right-4 z-20">
        <SoundToggle className="bg-slate-900/80 backdrop-blur-md border-white/20 text-white" />
      </div>

      {/* メインビジュアル背景 */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/title.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center blur-lg opacity-40 scale-110"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/title.png"
            alt="監督、プレイボールです！"
            className="w-full h-full object-contain sm:object-cover object-top sm:object-center"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />
      </div>

      {/* 操作ボタンエリア */}
      <div className="relative z-10 max-w-sm sm:max-w-md w-full px-4 sm:px-6 flex flex-col items-center space-y-3">
        {savedTeam && (
          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black py-3 sm:py-3.5 px-4 sm:px-5 rounded-2xl shadow-2xl transition flex items-center justify-between border-2 border-white/60 group"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 text-left min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-950/10 flex items-center justify-center shrink-0">
                <Play size={18} fill="currentColor" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm sm:text-base font-black truncate">つづきから始める</div>
                <div className="text-[10px] sm:text-[11px] font-mono text-slate-900 font-bold truncate">
                  第{savedTeam.current_year}期生 / 第{savedTeam.current_round}節 公式戦
                </div>
              </div>
            </div>
            <span className="text-[11px] sm:text-xs bg-slate-950 text-white font-black px-2.5 sm:px-3 py-1 rounded-lg shadow-sm shrink-0 ml-2">
              再開
            </span>
          </button>
        )}

        <button
          onClick={handleNewGame}
          disabled={loading}
          className={`w-full py-3 sm:py-3.5 px-4 sm:px-5 rounded-2xl font-black transition flex items-center justify-between border-2 active:scale-95 shadow-2xl backdrop-blur-md ${
            savedTeam
              ? "bg-slate-900/80 hover:bg-slate-900 text-white border-white/20"
              : "bg-amber-500 hover:bg-amber-400 text-slate-950 border-white/60"
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 text-left min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <RotateCcw size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm sm:text-base font-black truncate">はじめから（主人公作成）</div>
              <div className="text-[10px] sm:text-[11px] font-mono opacity-80 font-bold truncate">
                1年生エースを作成してスタート
              </div>
            </div>
          </div>
          <span className={`text-[11px] sm:text-xs font-black px-2.5 sm:px-3 py-1 rounded-lg shadow-sm shrink-0 ml-2 ${
            savedTeam ? "bg-white/20 text-white" : "bg-slate-950 text-white"
          }`}>
            New
          </span>
        </button>

        {loading && (
          <div className="text-[11px] font-mono font-black text-amber-300 animate-pulse bg-slate-900/90 px-3.5 py-1 rounded-full border border-amber-400/50 shadow-lg text-center">
            初期化中... キャラ作成画面へ進みます
          </div>
        )}

        <div className="text-[10px] text-white/70 font-mono font-bold drop-shadow pt-0.5">
          © 監督、プレイボールです！～カレッジガールズ・6ベースボール～
        </div>
      </div>
    </div>
  );
}