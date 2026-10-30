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
  prevSkillId?: string; // 前提スキルID（例: "剛速球" の前提は "ノビ◯"）
  desc: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
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
  skills?: string[];             // 習得済みスキルIDリスト

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
  has_won_autumn?: boolean;     // 秋リーグ優勝フラグ（全米選抜戦挑戦権）
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
  matchId: string;              // "R1_1", "SF_1", "FINAL", "3RD_PLACE" など
  roundName: string;            // "1回戦", "準決勝", "決勝", "順位決定戦"
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