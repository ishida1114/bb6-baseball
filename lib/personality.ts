// lib/personality.ts
import { Player, PersonalityType, PersonalityDetail } from "@/types/baseball";

export const PERSONALITY_MAP: Record<PersonalityType, PersonalityDetail> = {
  熱血: {
    type: "熱血",
    label: "熱血",
    desc: "気迫溢れる闘志。勝負どころで力が出やすいが、スタミナ消費が少し激しい。",
    color: "text-rose-700 border-rose-300",
    badgeBg: "bg-rose-50",
  },
  クール: {
    type: "クール",
    label: "クール",
    desc: "感情を表に出さず冷静沈着。スタミナ消費が安定し、動揺しない。",
    color: "text-blue-700 border-blue-300",
    badgeBg: "bg-blue-50",
  },
  マイペース: {
    type: "マイペース",
    label: "マイペース",
    desc: "常に自分のリズムを崩さない。疲労ペナルティの影響を受けにくい。",
    color: "text-teal-700 border-teal-300",
    badgeBg: "bg-teal-50",
  },
  努力家: {
    type: "努力家",
    label: "努力家",
    desc: "練習熱心なストイック気質。全体練習での成功・大成功確率がわずかに高い。",
    color: "text-amber-800 border-amber-300",
    badgeBg: "bg-amber-50",
  },
  お調子者: {
    type: "お調子者",
    label: "お調子者",
    desc: "チームのムードメーカー。ノッている時は大成功や長打を連発する。",
    color: "text-orange-700 border-orange-300",
    badgeBg: "bg-orange-50",
  },
  頭脳派: {
    type: "頭脳派",
    label: "頭脳派",
    desc: "データと戦術を重視。制球力やバットコントロール、守備判断に優れる。",
    color: "text-indigo-700 border-indigo-300",
    badgeBg: "bg-indigo-50",
  },
};

const ALL_PERSONALITIES: PersonalityType[] = [
  "熱血", "クール", "マイペース", "努力家", "お調子者", "頭脳派"
];

// 能力値やポジションに応じた二つ名の自動生成
export const generateNickname = (player: Player): string => {
  // 主人公の固定二つ名
  if (player.id === 1001) return "青葉のひだまり";
  if (player.id === 1002) return "孤高の青き星";
  if (player.id === 1003) return "ひらめきマジシャン";

  // 投手の二つ名判定
  if (player.main_position === "P") {
    if ((player.pitch_speed ?? 60) >= 72) return "青葉の剛腕";
    if (player.control >= 70) return "精密機械";
    if (player.contact >= 65 || player.power >= 65) return "二刀流のエース";
    return "マウンドの守護神";
  }

  // 野手の二つ名判定（最も突出した能力値から命名）
  const stats = [
    { name: "power", val: player.power, titles: ["怪力スラッガー", "下町の大砲", "放物線の申し子"] },
    { name: "contact", val: player.contact, titles: ["安打製造機", "巧打のヒットメーカー", "天性のバットマン"] },
    { name: "speed", val: player.speed, titles: ["韋駄天ガール", "疾風のスピードスター", "ダイヤモンドの風"] },
    { name: "fielding", val: player.fielding, titles: ["鉄壁の内野職人", "名手", "堅守の要"] },
    { name: "arm", val: player.arm, titles: ["強肩レーザービーム", "矢のような送球", "鉄腕キャノン"] },
  ];

  stats.sort((a, b) => b.val - a.val);
  const best = stats[0];

  if (best.val >= 70) {
    const list = best.titles;
    return list[Math.abs(player.id) % list.length];
  }

  // バランス型
  if (player.contact >= 60 && player.speed >= 60) return "俊足巧打のチャンスメーカー";
  if (player.main_position === "C") return "司令塔の扇の要";
  if (player.main_position === "SS") return "遊撃の砦";

  return "青葉の期待株";
};

// 選手データに性格・二つ名がない場合に安全に初期付与する関数
export const ensurePersonalityAndNickname = (player: Player): Player => {
  const nickname = player.nickname || generateNickname(player);
  let personality = player.personality;

  if (!personality) {
    if (player.id === 1001) personality = "努力家";
    else if (player.id === 1002) personality = "熱血";
    else if (player.id === 1003) personality = "マイペース";
    else {
      personality = ALL_PERSONALITIES[Math.abs(player.id * 7) % ALL_PERSONALITIES.length];
    }
  }

  return {
    ...player,
    nickname,
    personality,
  };
};