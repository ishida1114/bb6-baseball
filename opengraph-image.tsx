// app/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "監督、プレイボールです！～カレッジガールズ・6ベースボール～";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#090d16",
          backgroundImage: "radial-gradient(circle at 50% 30%, #1e293b 0%, #020617 95%)",
          padding: "50px 70px",
          fontFamily: "sans-serif",
          position: "relative",
          border: "12px solid #f59e0b",
        }}
      >
        {/* 背景アクセントライン */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: "linear-gradient(90deg, #10b981, #f59e0b, #ef4444)",
          }}
        />

        {/* 上部バッジ */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              backgroundColor: "#10b981",
              color: "#ffffff",
              padding: "6px 22px",
              borderRadius: "9999px",
              fontSize: "20px",
              fontWeight: 900,
              letterSpacing: "1px",
            }}
          >
            大学女子野球シミュレーション
          </span>
          <span
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              color: "#fde68a",
              padding: "6px 20px",
              borderRadius: "9999px",
              fontSize: "19px",
              fontWeight: 700,
              border: "1px solid rgba(245, 158, 11, 0.4)",
            }}
          >
            6人制野球 × 年間4シーズン制
          </span>
        </div>

        {/* メインタイトルエリア */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: "-1px",
              textShadow: "0 8px 24px rgba(0,0,0,0.8)",
            }}
          >
            監督、プレイボールです！
          </div>
          <div
            style={{
              fontSize: "30px",
              fontWeight: 800,
              color: "#f59e0b",
              letterSpacing: "3px",
            }}
          >
            ～カレッジガールズ・6ベースボール～
          </div>
        </div>

        {/* 年間4シーズン制ロードマップバナー */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            border: "2px solid rgba(255, 255, 255, 0.15)",
            padding: "16px 24px",
            borderRadius: "20px",
            width: "100%",
          }}
        >
          {[
            "🌸 春：紅白戦＆腕試し",
            "🔥 夏：全国トーナメント",
            "🍁 秋：白熱の大学リーグ",
            "❄️ 冬：世代交代＆ドラフト",
          ].map((text, idx) => (
            <div
              key={idx}
              style={{
                fontSize: "19px",
                fontWeight: 800,
                color: "#e2e8f0",
              }}
            >
              {text}
            </div>
          ))}
        </div>

        {/* フッター */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            fontSize: "18px",
            fontWeight: 700,
            color: "#94a3b8",
          }}
        >
          <div>ブラウザですぐ遊べる！ / PC・スマートフォン対応</div>
          <div style={{ color: "#fbbf24" }}>bb6-baseball.vercel.app</div>
        </div>
      </div>
    ),
    { ...size }
  );
}