// types/baseball.ts

// 守備位置タイプ（6人制野球：外野なし）
export type PositionType = "P" | "C" | "1B" | "2B" | "3B" | "SS";

// ==========================================
// 性格システム
// ==========================================
export type PersonalityType = 
  | "熱血" 
  | "クール" 
  | "マイペース" 
  | "努力家" 
  | "お調子者" 
  | "頭脳派";

export interface PersonalityDetail {
  type: PersonalityType;
  label: string;
  desc: string;
  color: string;
  badgeBg: string;
}

// ==========================================
// スキルTierシステム
// ==========================================
export type SkillTier = 1 | 2 | 3;
export type SkillTreeId = "FASTBALL" | "BREAKING" | "POWER" | "CONTACT" | "SPEED" | "CLUTCH";

export interface SkillDef {
  id: string;
  name: string;
  tier: SkillTier;
  treeId: SkillTreeId;
  prevSkillId?: string; // 前提スキルID
  desc: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
}

// ==========================================
// スキルマスター定数・定義（全18種＋エイリアス完全対応）
// ==========================================
export const SKILL_MASTER: Record<string, SkillDef> = {
  // FASTBALL (直球系)
  fastball_1: { id: "fastball_1", name: "ノビ◯", tier: 1, treeId: "FASTBALL", desc: "球速以上の伸びと体感速度を生み出す", badgeBg: "bg-blue-100", borderColor: "border-blue-400", textColor: "text-blue-900" },
  fastball_2: { id: "fastball_2", name: "剛速球", tier: 2, treeId: "FASTBALL", prevSkillId: "fastball_1", desc: "うなりを上げる直球で空振りを奪う", badgeBg: "bg-blue-200", borderColor: "border-blue-500", textColor: "text-blue-950" },
  fastball_3: { id: "fastball_3", name: "火の玉ストレート", tier: 3, treeId: "FASTBALL", prevSkillId: "fastball_2", desc: "バットをへし折る伝説の剛速球", badgeBg: "bg-blue-600", borderColor: "border-blue-300", textColor: "text-white" },

  // BREAKING (変化球系)
  breaking_1: { id: "breaking_1", name: "キレ◯", tier: 1, treeId: "BREAKING", desc: "鋭い変化球で芯を外す", badgeBg: "bg-indigo-100", borderColor: "border-indigo-400", textColor: "text-indigo-900" },
  breaking_2: { id: "breaking_2", name: "魔球使い", tier: 2, treeId: "BREAKING", prevSkillId: "breaking_1", desc: "手元で急激に変化する魔球を投じる", badgeBg: "bg-indigo-200", borderColor: "border-indigo-500", textColor: "text-indigo-950" },
  breaking_3: { id: "breaking_3", name: "七色の変化球", tier: 3, treeId: "BREAKING", prevSkillId: "breaking_2", desc: "変幻自在の配球で打者を幻惑する", badgeBg: "bg-indigo-600", borderColor: "border-indigo-300", textColor: "text-white" },

  // POWER (強打系)
  power_1: { id: "power_1", name: "パワーヒッター", tier: 1, treeId: "POWER", desc: "強振時に弾道が上がり長打が出やすい", badgeBg: "bg-rose-100", borderColor: "border-rose-400", textColor: "text-rose-900" },
  power_2: { id: "power_2", name: "大砲", tier: 2, treeId: "POWER", prevSkillId: "power_1", desc: "芯で捉えた打球の飛距離が劇的にアップ", badgeBg: "bg-rose-200", borderColor: "border-rose-500", textColor: "text-rose-950" },
  power_3: { id: "power_3", name: "怪力モンスター", tier: 3, treeId: "POWER", prevSkillId: "power_2", desc: "規格外の打球速度でスタンドへ叩き込む", badgeBg: "bg-rose-600", borderColor: "border-rose-300", textColor: "text-white" },

  // CONTACT (巧打系)
  contact_1: { id: "contact_1", name: "アベレージヒッター", tier: 1, treeId: "CONTACT", desc: "ミート打ち時のヒットゾーンが拡大", badgeBg: "bg-amber-100", borderColor: "border-amber-400", textColor: "text-amber-900" },
  contact_2: { id: "contact_2", name: "安打製造機", tier: 2, treeId: "CONTACT", prevSkillId: "contact_1", desc: "巧みなバットコントロールで安打を量産", badgeBg: "bg-amber-200", borderColor: "border-amber-500", textColor: "text-amber-950" },
  contact_3: { id: "contact_3", name: "球聖", tier: 3, treeId: "CONTACT", prevSkillId: "contact_2", desc: "あらゆる球種を完璧にミートする神技", badgeBg: "bg-amber-500", borderColor: "border-amber-300", textColor: "text-slate-950" },

  // SPEED (機動系)
  speed_1: { id: "speed_1", name: "盗塁◯", tier: 1, treeId: "SPEED", desc: "盗塁時のスタートダッシュと成功率アップ", badgeBg: "bg-emerald-100", borderColor: "border-emerald-400", textColor: "text-emerald-900" },
  speed_2: { id: "speed_2", name: "韋駄天", tier: 2, treeId: "SPEED", prevSkillId: "speed_1", desc: "圧倒的な走力で次の塁を果敢に陥れる", badgeBg: "bg-emerald-200", borderColor: "border-emerald-500", textColor: "text-emerald-950" },
  speed_3: { id: "speed_3", name: "神速", tier: 3, treeId: "SPEED", prevSkillId: "speed_2", desc: "ダイヤモンドを疾風のように駆け抜ける", badgeBg: "bg-emerald-600", borderColor: "border-emerald-300", textColor: "text-white" },

  // CLUTCH (勝負強さ系)
  clutch_1: { id: "clutch_1", name: "チャンス◯", tier: 1, treeId: "CLUTCH", desc: "得点圏で打撃能力と集中力が上昇", badgeBg: "bg-purple-100", borderColor: "border-purple-400", textColor: "text-purple-900" },
  clutch_2: { id: "clutch_2", name: "勝負師", tier: 2, treeId: "CLUTCH", prevSkillId: "clutch_1", desc: "好機で極めて高い決定力を発揮する", badgeBg: "bg-purple-200", borderColor: "border-purple-500", textColor: "text-purple-950" },
  clutch_3: { id: "clutch_3", name: "逆転サヨナラ男", tier: 3, treeId: "CLUTCH", prevSkillId: "clutch_2", desc: "土壇場で奇跡の一打を呼び込む勝負強さ", badgeBg: "bg-purple-600", borderColor: "border-purple-300", textColor: "text-white" },
};

// 大文字・短縮形エイリアスの相互登録
SKILL_MASTER["NOBI_1"] = SKILL_MASTER["fastball_1"];
SKILL_MASTER["NOBI_2"] = SKILL_MASTER["fastball_2"];
SKILL_MASTER["NOBI_3"] = SKILL_MASTER["fastball_3"];
SKILL_MASTER["FASTBALL_1"] = SKILL_MASTER["fastball_1"];
SKILL_MASTER["FASTBALL_2"] = SKILL_MASTER["fastball_2"];
SKILL_MASTER["FASTBALL_3"] = SKILL_MASTER["fastball_3"];

SKILL_MASTER["KIRE_1"] = SKILL_MASTER["breaking_1"];
SKILL_MASTER["KIRE_2"] = SKILL_MASTER["breaking_2"];
SKILL_MASTER["KIRE_3"] = SKILL_MASTER["breaking_3"];
SKILL_MASTER["BREAKING_1"] = SKILL_MASTER["breaking_1"];
SKILL_MASTER["BREAKING_2"] = SKILL_MASTER["breaking_2"];
SKILL_MASTER["BREAKING_3"] = SKILL_MASTER["breaking_3"];

SKILL_MASTER["POWER_1"] = SKILL_MASTER["power_1"];
SKILL_MASTER["POWER_2"] = SKILL_MASTER["power_2"];
SKILL_MASTER["POWER_3"] = SKILL_MASTER["power_3"];

SKILL_MASTER["AV_1"] = SKILL_MASTER["contact_1"];
SKILL_MASTER["AV_2"] = SKILL_MASTER["contact_2"];
SKILL_MASTER["AV_3"] = SKILL_MASTER["contact_3"];
SKILL_MASTER["CONTACT_1"] = SKILL_MASTER["contact_1"];
SKILL_MASTER["CONTACT_2"] = SKILL_MASTER["contact_2"];
SKILL_MASTER["CONTACT_3"] = SKILL_MASTER["contact_3"];

SKILL_MASTER["SPEED_1"] = SKILL_MASTER["speed_1"];
SKILL_MASTER["SPEED_2"] = SKILL_MASTER["speed_2"];
SKILL_MASTER["SPEED_3"] = SKILL_MASTER["speed_3"];

SKILL_MASTER["CLUTCH_1"] = SKILL_MASTER["clutch_1"];
SKILL_MASTER["CLUTCH_2"] = SKILL_MASTER["clutch_2"];
SKILL_MASTER["CLUTCH_3"] = SKILL_MASTER["clutch_3"];

export const SKILL_DEFINITIONS: SkillDef[] = Object.values(SKILL_MASTER);

/**
 * スキルIDからスキル定義を取得するヘルパー（大文字小文字・空白を吸収）
 */
export function getSkillDef(skillId: string): SkillDef | undefined {
  if (!skillId) return undefined;
  const normalized = skillId.toLowerCase().trim();
  return SKILL_MASTER[normalized] || SKILL_MASTER[skillId];
}

// ==========================================
// 選手データ型（全ステータス統合）
// ==========================================
export interface Player {
  id: number;
  name: string;
  main_position: PositionType;
  grade: number;                // 1〜4年
  batting_hand: "R" | "L";      // 右打 / 左打
  image_url: string;

  // 野手ステータス (1〜99)
  contact: number;              // ミート
  power: number;                // パワー
  speed: number;                // 走力
  arm: number;                  // 肩力
  fielding: number;             // 守備力

  // 投手ステータス (1〜99)
  pitch_speed: number;          // 球速適性（100 + pitch_speed*0.63 km/h）
  control: number;              // 制球力
  stamina?: number;             // 基礎スタミナ
  breaking_ball?: number;       // 変化球適性

  // 個性・追加システム
  personality?: PersonalityType; // 性格
  nickname?: string;             // 二つ名・称号
  skills?: string[];             // 習得済みスキルIDリスト（例: ["contact_1", "fastball_1"]）

  // フラグ・解説
  is_protagonist?: boolean;     // 主人公フラグ
  description?: string;         // 紹介文
}

// ==========================================
// オーダー・チーム編成
// ==========================================
export interface TeamOrder {
  batting_order: number[];                    // 打順1〜6番（選手ID×6）
  defense_positions: Record<PositionType, number>; // 守備位置ごとの選手ID
  dp_ids: number[];                           // DP枠（指名打者・打撃専任）ID
  fp_ids?: number[];                          // FP枠（守備専任）ID
  bench_ids: number[];                        // ベンチ控え選手ID
  tactics?: string;                           // 采配指示 ("NORMAL" | "MEET" | "POWER" | "BUNT")
}

// ==========================================
// 卒業生クールダウン
// ==========================================
export interface CooldownPlayer {
  playerId: number;
  remainingYears: number; // 2年待機なら 2 -> 1 -> 0(復帰)
}

// ==========================================
// 年間シーズンフェーズ（季節管理）
// ==========================================
export type SeasonPhase = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER";

// ==========================================
// ユーザー球団データ型（年間サイクル対応版）
// ==========================================
export interface UserTeam {
  team_name: string;
  current_year: number;         // 世代（第1期生〜）
  current_round: number;        // 現在の節・試合番号（春:1~4, 夏:1~3+1, 秋:1~7+1）
  current_season?: SeasonPhase; // 現在の季節フェーズ (SPRING / SUMMER / AUTUMN / WINTER)
  tp_funds: number;             // 所持部費（万円）
  players: Player[];            // 所属選手10名
  order: TeamOrder;             // 現在のオーダー
  loop_count?: number;          // 周回・ループカウント
  last_trained_round?: number;  // 最後に練習した節番号（1節1回制限用）
  cooldowns?: CooldownPlayer[]; // クールダウン中の卒業生リスト
  retired_history?: { name: string; year: number; statsSummary?: string }[]; // 引退名簿
  summer_rank?: number;         // 夏のトーナメント最終順位 (1〜8位)
  has_won_summer?: boolean;     // 夏大会優勝フラグ（アジア選抜戦挑戦権）
  has_lost_summer?: boolean;    // 夏大会敗退フラグ（順位決定戦へ移行）
  summer_stage?: "CHAMPIONSHIP" | "CONSOLATION_SEMI" | "CONSOLATION_FINAL" | "ASIA"; // 夏トーナメント現在のステージ表記
  has_won_autumn?: boolean;     // 秋リーグ優勝フラグ（全米選抜戦挑戦権）
  ace_generation?: number;      // 主人公の代数（初代=1, 2代目=2...）
}

// ==========================================
// リーグ・対戦相手・順位表
// ==========================================
export interface LeagueTeam {
  id: number;
  name: string;
  shortName: string;
  initial: string;
  color: string;
  badgeColor: string;
  desc: string;
  feature?: string;             // 特徴
  strength: {
    pitch: number;
    contact: number;
    power: number;
    speed: number;
    defense: number;
  };
  players: Player[];
  order: TeamOrder;
}

export interface MatchRecord {
  round: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore?: number;
  awayScore?: number;
  homeErrors?: number;          // ホーム失策数
  awayErrors?: number;          // アウェイ失策数
  isPlayed: boolean;
}

export interface TeamStanding {
  teamId: number;
  teamName: string;
  shortName: string;
  color: string;
  wins: number;
  losses: number;
  draws: number;
  runsFor: number;              // 総得点
  runsAgainst: number;          // 総失点
  diff: number;                 // 得失点差
  points: number;               // 勝点 (勝=2, 分=1, 負=0)
  errors?: number;              // 総失策数
}

export interface LeagueData {
  currentRound: number;         // 1 〜 7
  totalRounds: number;          // 7
  isSeasonFinished: boolean;
  history: MatchRecord[];
  standings: TeamStanding[];
}

// ==========================================
// 夏の全日本トーナメント管理型
// ==========================================
export interface TournamentMatch {
  matchId: string;              // "R1_1", "SF_1", "FINAL", "CONSOLATION_1" など
  roundName: string;            // "1回戦", "準決勝", "決勝", "5位決定トーナメント" など
  team1Id: number;
  team2Id: number;
  score1?: number;
  score2?: number;
  winnerTeamId?: number;
  loserTeamId?: number;
  isPlayed: boolean;
}

export interface TournamentData {
  currentMatchIndex: number;    // 現在進行中の試合番号 (0〜2)
  isFinished: boolean;
  finalRank?: number;           // 青葉の最終順位 (1〜8)
  matches: TournamentMatch[];
  isAsiaChallenged?: boolean;   // アジア選抜戦消化フラグ
}