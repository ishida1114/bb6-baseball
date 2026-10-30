// components/SoundToggle.tsx
"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isMuted, toggleMute, onMuteChange } from "@/lib/sound";

export default function SoundToggle({ className = "" }: { className?: string }) {
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setMutedState(isMuted());
    const unsubscribe = onMuteChange((newMuted) => {
      setMutedState(newMuted);
    });
    return () => unsubscribe();
  }, []);

  return (
    <button
      onClick={() => toggleMute()}
      className={`p-2.5 rounded-2xl border transition flex items-center justify-center shadow-sm active:scale-95 ${
        muted
          ? "bg-rose-50 border-rose-300 text-rose-600 hover:bg-rose-100"
          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
      } ${className}`}
      title={muted ? "サウンド: 消音中（クリックでON）" : "サウンド: 再生中（クリックで消音）"}
      aria-label="サウンド切り替え"
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}