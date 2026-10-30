// lib/league.ts
import { Player, PositionType, TeamOrder, LeagueTeam, LeagueData, MatchRecord, TeamStanding, UserTeam } from "@/types/baseball";

// === 敵7大学のマスターデータ定義 ===
export const OPPONENT_UNIVERSITIES: LeagueTeam[] = [
  {
    id: 1,
    name: "紅蓮女子体育大学",
    shortName: "紅蓮体育",
    initial: "紅",
    color: "#dc2626", // 赤
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    desc: "超重量打線！ 柵越えホームランを狙うパワー集団",
    strength: { pitch: 72, contact: 70, power: 88, speed: 65, defense: 68 },
    order: {
      batting_order: [101, 102, 103, 104, 105, 106],
      defense_positions: { P: 106, C: 105, "1B": 103, "2B": 102, "3B": 104, SS: 101 },
      dp_ids: [103, 104],
      fp_ids: [106, 101],
      bench_ids: [],
      tactics: "POWER",
    },
    players: [
      { id: 101, name: "火野 晶", grade: 2, main_position: "SS", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 68, power: 72, speed: 70, arm: 65, fielding: 65, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 102, name: "轟 響子", grade: 3, main_position: "2B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 65, power: 75, speed: 60, arm: 60, fielding: 65, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 103, name: "剛田 麗美", grade: 4, main_position: "1B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 70, power: 90, speed: 50, arm: 70, fielding: 60, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 104, name: "鬼塚 琥珀", grade: 3, main_position: "3B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 72, power: 92, speed: 55, arm: 75, fielding: 65, skills: [], image_url: "/901.jpg", batting_hand: "L" }, // 左打
      { id: 105, name: "赤松 仁奈", grade: 2, main_position: "C", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 62, power: 78, speed: 52, arm: 80, fielding: 70, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 106, name: "煉獄 杏", grade: 3, main_position: "P", pitch_speed: 78, control: 62, stamina: 70, breaking_ball: 66, contact: 55, power: 70, speed: 58, arm: 75, fielding: 65, skills: [], image_url: "/901.jpg", batting_hand: "R" },
    ],
  },
  {
    id: 2,
    name: "白百合女子大学",
    shortName: "白百合",
    initial: "白",
    color: "#2563eb", // 青
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "絶対的エースと鉄壁の守備陣！ 1点を守り抜く名門",
    strength: { pitch: 88, contact: 68, power: 60, speed: 65, defense: 88 },
    order: {
      batting_order: [201, 202, 203, 204, 205, 206],
      defense_positions: { P: 206, C: 205, "1B": 203, "2B": 202, "3B": 204, SS: 201 },
      dp_ids: [203, 204],
      fp_ids: [206, 201],
      bench_ids: [],
      tactics: "NORMAL",
    },
    players: [
      { id: 201, name: "一条 華憐", grade: 3, main_position: "SS", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 70, power: 58, speed: 72, arm: 75, fielding: 88, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 202, name: "綾小路 凛", grade: 2, main_position: "2B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 68, power: 55, speed: 70, arm: 70, fielding: 85, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 203, name: "鷹司 詩織", grade: 4, main_position: "1B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 75, power: 68, speed: 60, arm: 68, fielding: 82, skills: [], image_url: "/901.jpg", batting_hand: "L" }, // 左打
      { id: 204, name: "西園寺 楓", grade: 3, main_position: "3B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 72, power: 65, speed: 62, arm: 78, fielding: 85, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 205, name: "九条 紗雪", grade: 4, main_position: "C", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 65, power: 62, speed: 55, arm: 85, fielding: 90, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 206, name: "白鳥 聖羅", grade: 3, main_position: "P", pitch_speed: 82, control: 86, stamina: 82, breaking_ball: 85, contact: 60, power: 55, speed: 60, arm: 82, fielding: 80, skills: [], image_url: "/901.jpg", batting_hand: "R" },
    ],
  },
  {
    id: 3,
    name: "黒潮海洋大学",
    shortName: "黒潮海洋",
    initial: "潮",
    color: "#0891b2", // ターコイズ
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    desc: "驚異の機動力！ 足と小技で内野をかき乱す韋駄天集団",
    strength: { pitch: 68, contact: 74, power: 52, speed: 90, defense: 75 },
    order: {
      batting_order: [301, 302, 303, 304, 305, 306],
      defense_positions: { P: 306, C: 305, "1B": 303, "2B": 302, "3B": 304, SS: 301 },
      dp_ids: [301, 303],
      fp_ids: [306, 305],
      bench_ids: [],
      tactics: "BUNT",
    },
    players: [
      { id: 301, name: "早川 疾風", grade: 2, main_position: "SS", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 76, power: 48, speed: 94, arm: 72, fielding: 78, skills: [], image_url: "/901.jpg", batting_hand: "L" }, // 左打
      { id: 302, name: "波多野 渚", grade: 3, main_position: "2B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 75, power: 45, speed: 90, arm: 68, fielding: 80, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 303, name: "潮崎 汐里", grade: 4, main_position: "1B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 72, power: 58, speed: 85, arm: 70, fielding: 72, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 304, name: "飛沫 舞", grade: 1, main_position: "3B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 70, power: 52, speed: 88, arm: 72, fielding: 74, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 305, name: "大波 涼風", grade: 3, main_position: "C", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 66, power: 55, speed: 82, arm: 76, fielding: 76, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 306, name: "海堂 湊", grade: 2, main_position: "P", pitch_speed: 73, control: 70, stamina: 68, breaking_ball: 72, contact: 58, power: 45, speed: 78, arm: 74, fielding: 72, skills: [], image_url: "/901.jpg", batting_hand: "R" },
    ],
  },
  {
    id: 4,
    name: "帝都経済大学",
    shortName: "帝都経済",
    initial: "帝",
    color: "#059669", // エメラルド
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "徹底したデータ分析と配球術！ 相手の弱点を突く知性派",
    strength: { pitch: 78, contact: 75, power: 65, speed: 68, defense: 78 },
    order: {
      batting_order: [401, 402, 403, 404, 405, 406],
      defense_positions: { P: 406, C: 405, "1B": 403, "2B": 402, "3B": 404, SS: 401 },
      dp_ids: [403, 404],
      fp_ids: [406, 405],
      bench_ids: [],
      tactics: "MEET",
    },
    players: [
      { id: 401, name: "神保 麻衣", grade: 3, main_position: "SS", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 78, power: 62, speed: 72, arm: 74, fielding: 80, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 402, name: "井上 理香", grade: 2, main_position: "2B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 76, power: 58, speed: 70, arm: 72, fielding: 78, skills: [], image_url: "/901.jpg", batting_hand: "L" }, // 左打
      { id: 403, name: "真田 雅", grade: 4, main_position: "1B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 74, power: 72, speed: 64, arm: 70, fielding: 75, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 404, name: "策木 智代", grade: 3, main_position: "3B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 75, power: 68, speed: 65, arm: 76, fielding: 78, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 405, name: "配島 鏡華", grade: 4, main_position: "C", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 72, power: 60, speed: 58, arm: 82, fielding: 84, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 406, name: "数式 千春", grade: 3, main_position: "P", pitch_speed: 74, control: 84, stamina: 75, breaking_ball: 80, contact: 62, power: 50, speed: 60, arm: 75, fielding: 78, skills: [], image_url: "/901.jpg", batting_hand: "R" },
    ],
  },
  {
    id: 5,
    name: "桜華学院大学",
    shortName: "桜華学院",
    initial: "桜",
    color: "#db2777", // ピンク
    badgeColor: "bg-pink-50 text-pink-700 border-pink-200",
    desc: "攻守のバランスが整った伝統の強豪！ チームワーク抜群",
    strength: { pitch: 74, contact: 72, power: 70, speed: 70, defense: 74 },
    order: {
      batting_order: [501, 502, 503, 504, 505, 506],
      defense_positions: { P: 506, C: 505, "1B": 503, "2B": 502, "3B": 504, SS: 501 },
      dp_ids: [503, 504],
      fp_ids: [506, 505],
      bench_ids: [],
      tactics: "NORMAL",
    },
    players: [
      { id: 501, name: "桜井 希", grade: 2, main_position: "SS", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 72, power: 65, speed: 75, arm: 70, fielding: 74, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 502, name: "花園 美咲", grade: 3, main_position: "2B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 70, power: 66, speed: 72, arm: 70, fielding: 76, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 503, name: "春日 結衣", grade: 4, main_position: "1B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 74, power: 76, speed: 66, arm: 72, fielding: 72, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 504, name: "松本 撫子", grade: 3, main_position: "3B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 75, power: 74, speed: 68, arm: 74, fielding: 75, skills: [], image_url: "/901.jpg", batting_hand: "L" }, // 左打
      { id: 505, name: "小桜 綾", grade: 2, main_position: "C", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 68, power: 64, speed: 62, arm: 78, fielding: 75, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 506, name: "桜木 萌", grade: 3, main_position: "P", pitch_speed: 75, control: 74, stamina: 72, breaking_ball: 74, contact: 60, power: 58, speed: 62, arm: 74, fielding: 72, skills: [], image_url: "/901.jpg", batting_hand: "R" },
    ],
  },
  {
    id: 6,
    name: "北嶺女子大学",
    shortName: "北嶺女子",
    initial: "北",
    color: "#475569", // スレート
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
    desc: "雪国育ちの剛腕＆長打力！ 直球勝負の本格派スタイル",
    strength: { pitch: 76, contact: 64, power: 78, speed: 62, defense: 68 },
    order: {
      batting_order: [601, 602, 603, 604, 605, 606],
      defense_positions: { P: 606, C: 605, "1B": 603, "2B": 602, "3B": 604, SS: 601 },
      dp_ids: [603, 604],
      fp_ids: [606, 605],
      bench_ids: [],
      tactics: "POWER",
    },
    players: [
      { id: 601, name: "吹雪 梢", grade: 2, main_position: "SS", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 66, power: 68, speed: 68, arm: 72, fielding: 68, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 602, name: "白銀 凛子", grade: 3, main_position: "2B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 64, power: 70, speed: 64, arm: 68, fielding: 70, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 603, name: "荒木 氷華", grade: 4, main_position: "1B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 68, power: 84, speed: 56, arm: 74, fielding: 66, skills: [], image_url: "/901.jpg", batting_hand: "L" }, // 左打
      { id: 604, name: "氷室 冴", grade: 3, main_position: "3B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 65, power: 82, speed: 58, arm: 78, fielding: 68, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 605, name: "寒河江 梢", grade: 3, main_position: "C", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 60, power: 72, speed: 52, arm: 82, fielding: 72, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 606, name: "冬木 鈴音", grade: 3, main_position: "P", pitch_speed: 80, control: 66, stamina: 78, breaking_ball: 70, contact: 54, power: 65, speed: 55, arm: 78, fielding: 68, skills: [], image_url: "/901.jpg", batting_hand: "R" },
    ],
  },
  {
    id: 7,
    name: "富士見女子大学",
    shortName: "富士見",
    initial: "富",
    color: "#d97706", // アンバー
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "全員野球の下克上校！ 堅実なバントと失策の少なさが武器",
    strength: { pitch: 66, contact: 68, power: 56, speed: 68, defense: 76 },
    order: {
      batting_order: [701, 702, 703, 704, 705, 706],
      defense_positions: { P: 706, C: 705, "1B": 703, "2B": 702, "3B": 704, SS: 701 },
      dp_ids: [701, 703],
      fp_ids: [706, 705],
      bench_ids: [],
      tactics: "BUNT",
    },
    players: [
      { id: 701, name: "渡辺 友香", grade: 2, main_position: "SS", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 70, power: 50, speed: 75, arm: 68, fielding: 76, skills: [], image_url: "/901.jpg", batting_hand: "L" }, // 左打
      { id: 702, name: "小林 亜美", grade: 3, main_position: "2B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 68, power: 52, speed: 70, arm: 66, fielding: 78, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 703, name: "高橋 志穂", grade: 4, main_position: "1B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 72, power: 65, speed: 64, arm: 68, fielding: 75, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 704, name: "伊藤 美咲", grade: 2, main_position: "3B", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 68, power: 60, speed: 65, arm: 70, fielding: 74, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 705, name: "佐々木 遥", grade: 3, main_position: "C", pitch_speed: 60, control: 50, stamina: 50, breaking_ball: 50, contact: 64, power: 55, speed: 58, arm: 76, fielding: 78, skills: [], image_url: "/901.jpg", batting_hand: "R" },
      { id: 706, name: "藤原 陽菜", grade: 2, main_position: "P", pitch_speed: 72, control: 72, stamina: 70, breaking_ball: 68, contact: 56, power: 48, speed: 60, arm: 70, fielding: 74, skills: [], image_url: "/901.jpg", batting_hand: "R" },
    ],
  },
];

// 互換性エイリアス
export const LEAGUE_TEAMS = OPPONENT_UNIVERSITIES;

// === 8大学による全7節の対戦日程（ラウンドロビン固定表） ===
// 0: 青葉女子大 (自軍), 1〜7: 敵大学
export const LEAGUE_SCHEDULE: { round: number; matches: [number, number][] }[] = [
  { round: 1, matches: [[0, 7], [1, 6], [2, 5], [3, 4]] },
  { round: 2, matches: [[0, 6], [7, 5], [1, 4], [2, 3]] },
  { round: 3, matches: [[0, 5], [6, 4], [7, 3], [1, 2]] },
  { round: 4, matches: [[0, 4], [5, 3], [6, 2], [7, 1]] },
  { round: 5, matches: [[0, 3], [4, 2], [5, 1], [6, 7]] },
  { round: 6, matches: [[0, 2], [3, 1], [4, 7], [5, 6]] },
  { round: 7, matches: [[0, 1], [2, 7], [3, 6], [4, 5]] },
];

// 大学名取得ヘルパー
export const getUniversityName = (teamId: number, userTeamName = "青葉女子大学"): string => {
  if (teamId === 0) return userTeamName;
  const found = OPPONENT_UNIVERSITIES.find((u) => u.id === teamId);
  return found ? found.name : "未知の大学";
};

export const getUniversityShortName = (teamId: number): string => {
  if (teamId === 0) return "青葉";
  const found = OPPONENT_UNIVERSITIES.find((u) => u.id === teamId);
  return found ? found.shortName : "相手";
};

// リーグデータの初期化
export const initLeagueData = (userTeamName = "青葉女子大学"): LeagueData => {
  const standings: TeamStanding[] = [
    { teamId: 0, teamName: userTeamName, shortName: "青葉", color: "#16a34a", wins: 0, losses: 0, draws: 0, runsFor: 0, runsAgainst: 0, diff: 0, points: 0 },
    ...OPPONENT_UNIVERSITIES.map((u) => ({
      teamId: u.id,
      teamName: u.name,
      shortName: u.shortName,
      color: u.color,
      wins: 0,
      losses: 0,
      draws: 0,
      runsFor: 0,
      runsAgainst: 0,
      diff: 0,
      points: 0,
    })),
  ];

  return {
    currentRound: 1,
    totalRounds: 7,
    isSeasonFinished: false,
    history: [],
    standings,
  };
};

// リーグデータの読み込み（なければ初期化）
export const loadLeagueData = (userTeamName = "青葉女子大学"): LeagueData => {
  if (typeof window === "undefined") return initLeagueData(userTeamName);
  const saved = localStorage.getItem("bb6_league");
  if (!saved) {
    const fresh = initLeagueData(userTeamName);
    localStorage.setItem("bb6_league", JSON.stringify(fresh));
    return fresh;
  }
  try {
    return JSON.parse(saved);
  } catch (e) {
    return initLeagueData(userTeamName);
  }
};

/**
 * 【新シーズン開幕用】リーグ順位表・対戦履歴・個人タイトルの完全初期化
 */
export const resetLeagueForNewSeason = (userTeamName = "青葉女子大学"): LeagueData => {
  const fresh = initLeagueData(userTeamName);
  if (typeof window !== "undefined") {
    localStorage.setItem("bb6_league", JSON.stringify(fresh));
    // 個人タイトルランキングや試合ログの残留データもクリア
    try {
      localStorage.removeItem("bb6_individual_titles");
      localStorage.removeItem("bb6_player_stats");
      localStorage.removeItem("bb6_season_title_stats");
      localStorage.removeItem("bb6_match_logs");
    } catch (e) {
      console.warn("個人タイトル統計リセットスキップ:", e);
    }
  }
  return fresh;
};

/**
 * 【年度更新時の敵チーム能力底上げ ＆ 王者マーク（対青葉シフト）】
 */
export const growOpponentTeams = (currentYear: number, isChampion = false): LeagueTeam[] => {
  const growthAmount = 3 + (isChampion ? 1 : 0);

  // 1. LocalStorageに保存されているドラフト配属済み敵チームを強化
  let savedTeams: LeagueTeam[] = [];
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem("bb6_league_opponents");
    if (raw) {
      try {
        savedTeams = JSON.parse(raw);
      } catch (e) {
        console.error(e);
      }
    }
  }

  const targetTeams = savedTeams.length > 0 ? savedTeams : OPPONENT_UNIVERSITIES;

  targetTeams.forEach((team) => {
    // チーム総合力の成長
    if (team.strength) {
      team.strength.pitch = Math.min(99, team.strength.pitch + growthAmount);
      team.strength.contact = Math.min(99, team.strength.contact + growthAmount);
      team.strength.power = Math.min(99, team.strength.power + growthAmount);
      team.strength.speed = Math.min(99, team.strength.speed + Math.max(1, growthAmount - 1));
      team.strength.defense = Math.min(99, team.strength.defense + growthAmount);
    }

    // 選手能力の成長
    if (team.players && Array.isArray(team.players)) {
      team.players.forEach((p) => {
        if (p.main_position === "P") {
          p.pitch_speed = Math.min(99, (p.pitch_speed || 65) + growthAmount);
          p.control = Math.min(99, p.control + growthAmount);
          if (p.stamina) p.stamina = Math.min(99, p.stamina + growthAmount);
          if (p.breaking_ball) p.breaking_ball = Math.min(99, p.breaking_ball + growthAmount);
        } else {
          p.contact = Math.min(99, p.contact + growthAmount);
          p.power = Math.min(99, p.power + growthAmount);
          p.speed = Math.min(99, p.speed + Math.max(1, growthAmount - 1));
          p.fielding = Math.min(99, p.fielding + growthAmount);
          p.arm = Math.min(99, p.arm + growthAmount);
        }
      });
    }
  });

  if (typeof window !== "undefined") {
    localStorage.setItem("bb6_league_opponents", JSON.stringify(targetTeams));
  }

  return targetTeams;
};

// 現ラウンドの青葉女子大の対戦相手を取得（ドラフト配属データを優先）
export const getCurrentOpponent = (round: number): LeagueTeam => {
  const sched = LEAGUE_SCHEDULE.find((s) => s.round === round) || LEAGUE_SCHEDULE[0];
  const myMatch = sched.matches.find(([h, a]) => h === 0 || a === 0)!;
  const oppId = myMatch[0] === 0 ? myMatch[1] : myMatch[0];

  // ドラフト保存データがあればそちらを使用
  if (typeof window !== "undefined") {
    const savedOpponents = localStorage.getItem("bb6_league_opponents");
    if (savedOpponents) {
      try {
        const teams: LeagueTeam[] = JSON.parse(savedOpponents);
        const matched = teams.find((u) => u.id === oppId);
        if (matched) return matched;
      } catch (e) {
        console.error(e);
      }
    }
  }

  // フォールバック
  return OPPONENT_UNIVERSITIES.find((u) => u.id === oppId) || OPPONENT_UNIVERSITIES[0];
};

// CPU同士の試合を戦力値をもとに自動シミュレーション
const simulateCpuMatch = (t1Id: number, t2Id: number): [number, number] => {
  let teamsList = OPPONENT_UNIVERSITIES;
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("bb6_league_opponents");
    if (saved) {
      try {
        teamsList = JSON.parse(saved);
      } catch (e) {}
    }
  }

  const t1 = teamsList.find((u) => u.id === t1Id);
  const t2 = teamsList.find((u) => u.id === t2Id);

  const t1Power = t1 ? (t1.strength.pitch + t1.strength.contact + t1.strength.power) / 3 : 70;
  const t2Power = t2 ? (t2.strength.pitch + t2.strength.contact + t2.strength.power) / 3 : 70;

  // 基本得点（0〜5点程度）
  let s1 = Math.floor(Math.random() * 4) + (t1Power > t2Power ? 1 : 0);
  let s2 = Math.floor(Math.random() * 4) + (t2Power > t1Power ? 1 : 0);

  // 同点時は確率でどちらか1点勝ち越し
  if (s1 === s2 && Math.random() < 0.7) {
    if (Math.random() < 0.5) s1 += 1; else s2 += 1;
  }

  return [s1, s2];
};

// ラウンド消化と順位表更新
export const recordRoundResults = (
  round: number,
  myScore: number,
  oppScore: number,
  userTeamName = "青葉女子大学"
): LeagueData => {
  const league = loadLeagueData(userTeamName);
  const sched = LEAGUE_SCHEDULE.find((s) => s.round === round);
  if (!sched) return league;

  const newRecords: MatchRecord[] = [];

  // 1. 各対戦カードのスコアを確定
  sched.matches.forEach(([t1, t2]) => {
    let s1 = 0;
    let s2 = 0;

    if (t1 === 0) {
      s1 = myScore;
      s2 = oppScore;
    } else if (t2 === 0) {
      s1 = oppScore;
      s2 = myScore;
    } else {
      [s1, s2] = simulateCpuMatch(t1, t2);
    }

    newRecords.push({
      round,
      homeTeamId: t1,
      awayTeamId: t2,
      homeScore: s1,
      awayScore: s2,
      isPlayed: true,
    });

    // 順位表へ加算
    const row1 = league.standings.find((s) => s.teamId === t1);
    const row2 = league.standings.find((s) => s.teamId === t2);

    if (row1 && row2) {
      row1.runsFor += s1;
      row1.runsAgainst += s2;
      row1.diff = row1.runsFor - row1.runsAgainst;

      row2.runsFor += s2;
      row2.runsAgainst += s1;
      row2.diff = row2.runsFor - row2.runsAgainst;

      if (s1 > s2) {
        row1.wins += 1;
        row1.points += 2;
        row2.losses += 1;
      } else if (s2 > s1) {
        row2.wins += 1;
        row2.points += 2;
        row1.losses += 1;
      } else {
        row1.draws += 1;
        row1.points += 1;
        row2.draws += 1;
        row2.points += 1;
      }
    }
  });

  // 2. 順位表ソート（勝点 > 得失点差 > 総得点）
  league.standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return b.runsFor - a.runsFor;
  });

  league.history.push(...newRecords);

  // 3. 次のラウンドへ進行判定
  if (round >= league.totalRounds) {
    league.isSeasonFinished = true;
  } else {
    league.currentRound = round + 1;
  }

  if (typeof window !== "undefined") {
    localStorage.setItem("bb6_league", JSON.stringify(league));
  }

  return league;
};