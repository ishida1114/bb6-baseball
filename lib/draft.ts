// lib/draft.ts
import { supabase } from "@/lib/supabase";
import { Player, PositionType, TeamOrder, UserTeam, LeagueTeam } from "@/types/baseball";
import { OPPONENT_UNIVERSITIES, initLeagueData } from "@/lib/league";

// スカウト・ドラフト候補から完全に除外する特別チーム選手IDのブラックリスト
export const EXCLUDED_DRAFT_IDS = new Set<number>([
  // アジア大学選抜（ID 246〜255）
  246, 247, 248, 249, 250, 251, 252, 253, 254, 255,
  // 全米カレッジ選抜（ID 256〜265）
  256, 257, 258, 259, 260, 261, 262, 263, 264, 265,
  // 実業団・社会人選抜（ID 800番台）
  ...Array.from({ length: 50 }, (_, i) => 800 + i),
]);

export interface CooldownPlayer {
  playerId: number;
  remainingYears: number; // 2年待機なら 2 -> 1 -> 0(復帰)
}

const POSITIONS: PositionType[] = ["P", "C", "1B", "2B", "3B", "SS"];

/**
 * 10名編成時の学年スロット（1年:3名, 2年:2名, 3年:3名, 4年:2名 = 計10名）
 */
const INITIAL_GRADES = [1, 1, 1, 2, 2, 3, 3, 3, 4, 4];

/**
 * ID 246〜255 のアジア選手権選手10名（lib/specialTeams.ts で参照）
 */
export const ASIA_PLAYERS: Player[] = [
  { id: 246, name: "リン・ウェイツィン", main_position: "P", pitch_speed: 76, control: 78, contact: 65, power: 58, speed: 70, fielding: 72, arm: 75, grade: 1, batting_hand: "R", personality: "クール", image_url: "/246.jpg" },
  { id: 247, name: "チェン・ユーリン", main_position: "C", pitch_speed: 60, control: 55, contact: 72, power: 76, speed: 64, fielding: 80, arm: 82, grade: 1, batting_hand: "R", personality: "頭脳派", image_url: "/247.jpg" },
  { id: 248, name: "パク・ミンソ", main_position: "SS", pitch_speed: 60, control: 55, contact: 80, power: 68, speed: 84, fielding: 82, arm: 76, grade: 1, batting_hand: "L", personality: "熱血", image_url: "/248.jpg" },
  { id: 249, name: "キム・ダヒョン", main_position: "1B", pitch_speed: 60, control: 55, contact: 68, power: 85, speed: 55, fielding: 68, arm: 70, grade: 1, batting_hand: "L", personality: "お調子者", image_url: "/249.jpg" },
  { id: 250, name: "グエン・ティ・ハイ", main_position: "2B", pitch_speed: 60, control: 55, contact: 74, power: 60, speed: 82, fielding: 78, arm: 68, grade: 1, batting_hand: "R", personality: "努力家", image_url: "/250.jpg" },
  { id: 251, name: "ソフィア・レイエス", main_position: "P", pitch_speed: 80, control: 70, contact: 60, power: 70, speed: 72, fielding: 70, arm: 80, grade: 1, batting_hand: "R", personality: "熱血", image_url: "/251.jpg" },
  { id: 252, name: "ワン・ジンイー", main_position: "3B", pitch_speed: 60, control: 55, contact: 76, power: 78, speed: 68, fielding: 74, arm: 78, grade: 1, batting_hand: "R", personality: "クール", image_url: "/252.jpg" },
  { id: 253, name: "カン・ジウ", main_position: "SS", pitch_speed: 60, control: 55, contact: 70, power: 66, speed: 88, fielding: 76, arm: 74, grade: 1, batting_hand: "L", personality: "マイペース", image_url: "/253.jpg" },
  { id: 254, name: "タナポーン・スリ", main_position: "1B", pitch_speed: 60, control: 55, contact: 66, power: 82, speed: 75, fielding: 66, arm: 72, grade: 1, batting_hand: "R", personality: "お調子者", image_url: "/254.jpg" },
  { id: 255, name: "リー・シュウイン", main_position: "P", pitch_speed: 74, control: 82, contact: 64, power: 55, speed: 65, fielding: 75, arm: 70, grade: 1, batting_hand: "L", personality: "頭脳派", image_url: "/255.jpg" },
];

/**
 * 固定画像（固有顔写真グラフィック）を持っているか判定
 */
export function hasUniqueImage(player: Player): boolean {
  if (player.is_protagonist) return true;
  if (!player.image_url) return false;
  const url = player.image_url.trim();
  if (url === "" || url === "NaN" || url === "null" || url === "undefined") return false;
  return !url.includes("901.jpg");
}

/**
 * 配属された10名の中から、最適な守備位置（6名）、打順（1〜6番）、ベンチ（4名）を自動編成する
 */
export function generateTeamOrder(players: Player[]): TeamOrder {
  const assignedDefense: Partial<Record<PositionType, number>> = {};
  const remainingPlayers = [...players];

  const priorityPositions: PositionType[] = ["P", "C", "SS", "2B", "3B", "1B"];

  for (const pos of priorityPositions) {
    let bestIdx = remainingPlayers.findIndex((p) => p.main_position === pos);

    if (bestIdx === -1) {
      if (pos === "P") {
        bestIdx = remainingPlayers.reduce(
          (maxI, p, i, arr) => ((p.pitch_speed + p.control) > (arr[maxI].pitch_speed + arr[maxI].control) ? i : maxI),
          0
        );
      } else if (pos === "C" || pos === "SS" || pos === "3B") {
        bestIdx = remainingPlayers.reduce(
          (maxI, p, i, arr) => ((p.arm + p.fielding) > (arr[maxI].arm + arr[maxI].fielding) ? i : maxI),
          0
        );
      } else {
        bestIdx = remainingPlayers.reduce(
          (maxI, p, i, arr) => (p.fielding > arr[maxI].fielding ? i : maxI),
          0
        );
      }
    }

    const selected = remainingPlayers.splice(bestIdx, 1)[0];
    assignedDefense[pos] = selected.id;
  }

  const starters = Object.values(assignedDefense) as number[];

  const starterPlayers = starters.map((id) => players.find((p) => p.id === id)!);
  starterPlayers.sort((a, b) => {
    const scoreA = a.contact * 1.2 + a.power * 1.0 + a.speed * 0.8;
    const scoreB = b.contact * 1.2 + b.power * 1.0 + b.speed * 0.8;
    return scoreB - scoreA;
  });

  const battingOrder = [
    starterPlayers[1]?.id || starters[0],
    starterPlayers[2]?.id || starters[1],
    starterPlayers[0]?.id || starters[2],
    starterPlayers[3]?.id || starters[3],
    starterPlayers[4]?.id || starters[4],
    starterPlayers[5]?.id || starters[5],
  ];

  const benchIds = remainingPlayers.map((p) => p.id);
  const dpIds = [battingOrder[2], battingOrder[3]];
  const fpIds = [assignedDefense.P!, assignedDefense.C!];

  return {
    batting_order: battingOrder,
    defense_positions: assignedDefense as Record<PositionType, number>,
    dp_ids: dpIds,
    fp_ids: fpIds,
    bench_ids: benchIds,
    tactics: "NORMAL",
  };
}

/**
 * 【年末世代交代処理】
 * 4年生のみ引退 ➔ 在校生進級（grade + 1） ➔ 卒業生を「2年クールダウン」へ登録 ➔ 満了生を復帰
 */
export function processYearEndGraduation(
  team: UserTeam,
  oppPlayerIds?: Set<number>
): {
  updatedTeam: UserTeam;
  graduatedPlayers: Player[];
  neededDraftCount: number;
} {
  const graduating = team.players.filter((p) => (p.grade ?? 1) >= 4);
  const remaining = team.players
    .filter((p) => (p.grade ?? 1) < 4)
    .map((p) => ({ ...p, grade: (p.grade ?? 1) + 1 }));

  const nextCooldowns: CooldownPlayer[] = [];
  ((team as any).cooldowns || []).forEach((cd: CooldownPlayer) => {
    if (cd.remainingYears > 1) {
      nextCooldowns.push({ playerId: cd.playerId, remainingYears: cd.remainingYears - 1 });
    }
  });

  graduating.forEach((p) => {
    nextCooldowns.push({ playerId: p.id, remainingYears: 2 });
  });

  const updatedTeam: UserTeam = {
    ...team,
    current_year: team.current_year + 1,
    current_round: 1,
    players: remaining,
    order: generateTeamOrder(remaining),
    cooldowns: nextCooldowns,
  } as UserTeam;

  return {
    updatedTeam,
    graduatedPlayers: graduating,
    neededDraftCount: Math.max(1, 10 - remaining.length),
  };
}

/**
 * 【ドラフト候補選手選出（春の新入部員スカウト用）】
 * アジア・米国代表完全除外・投手保証・2年クールダウン・セーフティネット対応
 */
export async function generateDraftCandidates(
  team: UserTeam,
  oppPlayerIds: Set<number>,
  cachedPool?: Player[]
): Promise<Player[]> {
  let pool = cachedPool;

  if (!pool || pool.length === 0) {
    const { data, error } = await supabase
      .from("bb6_players")
      .select("*")
      .order("id", { ascending: true });

    if (!error && data && data.length > 0) {
      pool = data as Player[];
    } else {
      pool = [];
    }
  }

  // 特別枠（アジア・米国・実業団）を確実に排除
  const fullPool = (pool || []).filter((p) => !EXCLUDED_DRAFT_IDS.has(p.id));

  const currentTeamIds = new Set(team.players.map((p) => p.id));
  const cooldownIds = new Set(((team as any).cooldowns || []).map((c: CooldownPlayer) => c.playerId));

  // フリー候補（青葉在籍中、クールダウン中、他校在籍中を除外）
  const availablePool = fullPool.filter(
    (p) => !currentTeamIds.has(p.id) && !cooldownIds.has(p.id) && !oppPlayerIds.has(p.id)
  );

  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
  const shuffled = shuffle(availablePool);

  // 投手保証判定：青葉の在校投手が1名以下なら必ず投手を1名以上含める
  const currentPitcherCount = team.players.filter((p) => p.main_position === "P").length;
  const needPitcherGuarantee = currentPitcherCount <= 1;

  const candidates: Player[] = [];

  if (needPitcherGuarantee) {
    const pIdx = shuffled.findIndex((p) => p.main_position === "P");
    if (pIdx !== -1) {
      candidates.push({ ...shuffled[pIdx], grade: 1 });
      shuffled.splice(pIdx, 1);
    }
  }

  // 5名になるまで補充
  while (candidates.length < 5 && shuffled.length > 0) {
    candidates.push({ ...shuffled.shift()!, grade: 1 });
  }

  // セーフティネット：プール不足時の汎用生自動生成
  let fallbackId = 9101;
  while (candidates.length < 5) {
    const needP = !candidates.some((c) => c.main_position === "P") && currentPitcherCount === 0;
    candidates.push({
      id: fallbackId++,
      name: `一般入試・新人${candidates.length + 1}`,
      main_position: needP ? "P" : "1B",
      pitch_speed: 68,
      control: 62,
      contact: 62,
      power: 60,
      speed: 66,
      fielding: 65,
      arm: 65,
      grade: 1,
      batting_hand: "R",
      personality: "努力家",
      image_url: "/901.jpg",
    });
  }

  return candidates;
}

/**
 * 【開幕ドラフト（完全新規ニューゲーム用）】
 * 各大学に10名（1〜4年）を配分し初期化する（特別チーム選手は完全除外）
 */
export async function executeOpeningDraft(userTeamName = "青葉女子大学野球部"): Promise<{
  userTeam: UserTeam;
  leagueTeams: LeagueTeam[];
}> {
  const { data: allPoolPlayers, error } = await supabase
    .from("bb6_players")
    .select("*")
    .order("id", { ascending: true });

  if (error || !allPoolPlayers || allPoolPlayers.length === 0) {
    throw new Error("Supabaseからの選手データ取得に失敗しました。");
  }

  // 特別枠（アジア・米国・実業団）を初期プールから完全に締め出す
  const eligiblePool = (allPoolPlayers as Player[]).filter((p) => !EXCLUDED_DRAFT_IDS.has(p.id));

  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

  const shuffledPool = shuffle(eligiblePool);
  const protagonist = shuffledPool.find((p) => p.is_protagonist || p.id === 1);
  const candidatePool = shuffledPool.filter((p) => p.id !== protagonist?.id);

  const uniquePool = candidatePool.filter((p) => hasUniqueImage(p));
  const genericPool = candidatePool.filter((p) => !hasUniqueImage(p));

  const teamRosters: Player[][] = Array.from({ length: 8 }, () => []);

  if (protagonist) {
    teamRosters[0].push({ ...protagonist, grade: 1 });
  }

  // 1. 各大学に固定画像選手を2〜3名均等配分
  for (let teamIdx = 0; teamIdx < 8; teamIdx++) {
    const currentUniques = teamRosters[teamIdx].filter(hasUniqueImage).length;
    if (currentUniques < 1 && uniquePool.length > 0) {
      teamRosters[teamIdx].push(uniquePool.pop()!);
    }
  }

  for (let teamIdx = 0; teamIdx < 8; teamIdx++) {
    const currentUniques = teamRosters[teamIdx].filter(hasUniqueImage).length;
    if (currentUniques < 2 && uniquePool.length > 0) {
      teamRosters[teamIdx].push(uniquePool.pop()!);
    }
  }

  const teamIndicesFor3rd = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
  for (const teamIdx of teamIndicesFor3rd) {
    const currentUniques = teamRosters[teamIdx].filter(hasUniqueImage).length;
    if (currentUniques < 3 && uniquePool.length > 0 && Math.random() < 0.6) {
      teamRosters[teamIdx].push(uniquePool.pop()!);
    }
  }

  // 2. 各チームに投手（P）を最低1名確保
  for (let teamIdx = 0; teamIdx < 8; teamIdx++) {
    const hasPitcher = teamRosters[teamIdx].some((p) => p.main_position === "P");
    if (!hasPitcher) {
      const genericPIdx = genericPool.findIndex((p) => p.main_position === "P");
      if (genericPIdx !== -1) {
        teamRosters[teamIdx].push(genericPool.splice(genericPIdx, 1)[0]);
      } else {
        const uniquePIdx = uniquePool.findIndex((p) => p.main_position === "P");
        if (uniquePIdx !== -1) {
          teamRosters[teamIdx].push(uniquePool.splice(uniquePIdx, 1)[0]);
        }
      }
    }
  }

  // 3. 各チーム10名固定まで補充
  for (let teamIdx = 0; teamIdx < 8; teamIdx++) {
    while (teamRosters[teamIdx].length < 10 && genericPool.length > 0) {
      teamRosters[teamIdx].push(genericPool.pop()!);
    }
  }
  for (let teamIdx = 0; teamIdx < 8; teamIdx++) {
    while (teamRosters[teamIdx].length < 10 && uniquePool.length > 0) {
      teamRosters[teamIdx].push(uniquePool.pop()!);
    }
  }

  // 4. 初回の学年配分（主人公以外の選手に1〜4年を割り振り）
  for (let teamIdx = 0; teamIdx < 8; teamIdx++) {
    const grades = shuffle([...INITIAL_GRADES]);
    teamRosters[teamIdx] = teamRosters[teamIdx].map((p, idx) => {
      if (p.is_protagonist) return { ...p, grade: 1 };
      return { ...p, grade: grades[idx] || 1 };
    });
  }

  // 5. オーダー自動編成
  const userTeamPlayers = teamRosters[0];
  const userOrder = generateTeamOrder(userTeamPlayers);

  const userTeam: UserTeam = {
    team_name: userTeamName,
    tp_funds: 500,
    loop_count: 1,
    current_year: 1,
    current_round: 1,
    order: userOrder,
    players: userTeamPlayers,
    cooldowns: [],
  } as UserTeam;

  const leagueTeams: LeagueTeam[] = OPPONENT_UNIVERSITIES.map((baseUni, idx) => {
    const oppPlayers = teamRosters[idx + 1];
    const oppOrder = generateTeamOrder(oppPlayers);

    return {
      ...baseUni,
      players: oppPlayers,
      order: oppOrder,
    };
  });

  // 6. 保存
  if (typeof window !== "undefined") {
    localStorage.setItem("bb6_myTeam", JSON.stringify(userTeam));
    const initialLeague = initLeagueData(userTeamName);
    localStorage.setItem("bb6_league", JSON.stringify(initialLeague));
    localStorage.setItem("bb6_league_opponents", JSON.stringify(leagueTeams));
  }

  return { userTeam, leagueTeams };
}

/**
 * 【新シーズン開幕（全自動進行用エンジン）】
 * 4年生卒業 ➔ 1〜3年生進級 ➔ 2年クールダウン対応 ➔ 補充完了（特別選手は完全除外）
 */
export async function advanceToNextSeason(currentTeam: UserTeam): Promise<{
  userTeam: UserTeam;
  leagueTeams: LeagueTeam[];
}> {
  const { data: allPoolPlayers, error } = await supabase
    .from("bb6_players")
    .select("*")
    .order("id", { ascending: true });

  if (error || !allPoolPlayers || allPoolPlayers.length === 0) {
    throw new Error("Supabaseからの選手データ取得に失敗しました。");
  }

  // 特別枠（アジア・米国・実業団）を除外
  const fullPool = (allPoolPlayers as Player[]).filter((p) => !EXCLUDED_DRAFT_IDS.has(p.id));

  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

  let currentLeagueTeams: LeagueTeam[] = [];
  if (typeof window !== "undefined") {
    const savedOpp = localStorage.getItem("bb6_league_opponents");
    if (savedOpp) {
      try {
        currentLeagueTeams = JSON.parse(savedOpp);
      } catch (e) {
        console.error(e);
      }
    }
  }
  if (currentLeagueTeams.length === 0) {
    currentLeagueTeams = OPPONENT_UNIVERSITIES.map((uni) => ({
      ...uni,
      players: [],
      order: {} as TeamOrder,
    }));
  }

  const allTeamsPlayers: Player[][] = [
    currentTeam.players,
    ...currentLeagueTeams.map((t) => t.players),
  ];

  // 1. 各大学で「4年生の卒業」＆「1〜3年生の進級（grade + 1）」
  const retainedTeams: Player[][] = allTeamsPlayers.map((teamList) => {
    return teamList
      .filter((p) => (p.grade ?? 1) < 4)
      .map((p) => ({ ...p, grade: (p.grade ?? 1) + 1 }));
  });

  // クールダウン更新
  const nextCooldowns: CooldownPlayer[] = [];
  ((currentTeam as any).cooldowns || []).forEach((cd: CooldownPlayer) => {
    if (cd.remainingYears > 1) {
      nextCooldowns.push({ playerId: cd.playerId, remainingYears: cd.remainingYears - 1 });
    }
  });
  currentTeam.players
    .filter((p) => (p.grade ?? 1) >= 4)
    .forEach((p) => {
      nextCooldowns.push({ playerId: p.id, remainingYears: 2 });
    });

  const retainedIds = new Set<number>();
  retainedTeams.forEach((teamList) => {
    teamList.forEach((p) => retainedIds.add(p.id));
  });

  const cdIds = new Set(nextCooldowns.map((c) => c.playerId));

  // 2. プールから在籍中およびクールダウン中を除外
  const rookieCandidatePool = shuffle(
    fullPool.filter((p) => !retainedIds.has(p.id) && !cdIds.has(p.id))
  );
  const uniqueRookiePool = rookieCandidatePool.filter((p) => hasUniqueImage(p));
  const genericRookiePool = rookieCandidatePool.filter((p) => !hasUniqueImage(p));

  // 3. 各大学10名まで補充
  for (let teamIdx = 0; teamIdx < 8; teamIdx++) {
    const currentUniques = retainedTeams[teamIdx].filter(hasUniqueImage).length;
    while (retainedTeams[teamIdx].length < 10 && currentUniques < 2 && uniqueRookiePool.length > 0) {
      const rookie = uniqueRookiePool.pop()!;
      retainedTeams[teamIdx].push({ ...rookie, grade: 1 });
    }

    while (retainedTeams[teamIdx].length < 10 && genericRookiePool.length > 0) {
      const rookie = genericRookiePool.pop()!;
      retainedTeams[teamIdx].push({ ...rookie, grade: 1 });
    }

    while (retainedTeams[teamIdx].length < 10 && uniqueRookiePool.length > 0) {
      const rookie = uniqueRookiePool.pop()!;
      retainedTeams[teamIdx].push({ ...rookie, grade: 1 });
    }

    // 投手保証
    const hasPitcher = retainedTeams[teamIdx].some((p) => p.main_position === "P");
    if (!hasPitcher) {
      const pRookie = rookieCandidatePool.find(
        (p) => p.main_position === "P" && !retainedTeams[teamIdx].some((rp) => rp.id === p.id)
      );
      if (pRookie) {
        retainedTeams[teamIdx][retainedTeams[teamIdx].length - 1] = { ...pRookie, grade: 1 };
      }
    }
  }

  // 4. 各大学のオーダー再編成
  const nextUserPlayers = retainedTeams[0];
  const nextUserOrder = generateTeamOrder(nextUserPlayers);

  const nextUserTeam: UserTeam = {
    ...currentTeam,
    current_year: currentTeam.current_year + 1,
    current_round: 1,
    order: nextUserOrder,
    players: nextUserPlayers,
    cooldowns: nextCooldowns,
  } as UserTeam;

  const nextLeagueTeams: LeagueTeam[] = OPPONENT_UNIVERSITIES.map((baseUni, idx) => {
    const oppPlayers = retainedTeams[idx + 1];
    const oppOrder = generateTeamOrder(oppPlayers);

    return {
      ...baseUni,
      players: oppPlayers,
      order: oppOrder,
    };
  });

  if (typeof window !== "undefined") {
    localStorage.setItem("bb6_myTeam", JSON.stringify(nextUserTeam));
    const freshLeague = initLeagueData(nextUserTeam.team_name);
    localStorage.setItem("bb6_league", JSON.stringify(freshLeague));
    localStorage.setItem("bb6_league_opponents", JSON.stringify(nextLeagueTeams));
  }

  return { userTeam: nextUserTeam, leagueTeams: nextLeagueTeams };
}

/**
 * 【開幕スカウト完了時の球団確定・初期化処理】
 * 獲得した10名（主人公＋9名）と、断られた選手が所属したライバル校を保存（特別選手は完全除外）
 */
export async function finalizeOpeningScout(
  aobaPlayers: Player[],
  rejectedMap: Record<number, string>
): Promise<{ userTeam: UserTeam; leagueTeams: LeagueTeam[] }> {
  const { data: allPoolPlayers } = await supabase
    .from("bb6_players")
    .select("*")
    .order("id", { ascending: true });

  // 特別枠（アジア・米国・実業団）を除外
  const eligiblePool = ((allPoolPlayers || []) as Player[]).filter((p) => !EXCLUDED_DRAFT_IDS.has(p.id));

  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
  const pool = shuffle(eligiblePool);

  const userOrder = generateTeamOrder(aobaPlayers);
  const userTeam: UserTeam = {
    team_name: "青葉女子大学野球部",
    tp_funds: 500,
    loop_count: 1,
    current_year: 1,
    current_round: 1,
    order: userOrder,
    players: aobaPlayers,
    cooldowns: [],
  } as UserTeam;

  const aobaIds = new Set(aobaPlayers.map((p) => p.id));
  const remainingPool = pool.filter((p) => !aobaIds.has(p.id));

  const leagueTeams: LeagueTeam[] = OPPONENT_UNIVERSITIES.map((baseUni) => {
    const rejectedForThisUni = remainingPool.filter(
      (p) => rejectedMap[p.id] === baseUni.name
    );
    const assignedIds = new Set(rejectedForThisUni.map((p) => p.id));

    const oppPlayers: Player[] = [...rejectedForThisUni];

    for (let i = remainingPool.length - 1; i >= 0; i--) {
      if (oppPlayers.length >= 10) break;
      const candidate = remainingPool[i];
      if (!assignedIds.has(candidate.id) && !rejectedMap[candidate.id]) {
        oppPlayers.push(candidate);
        assignedIds.add(candidate.id);
        remainingPool.splice(i, 1);
      }
    }

    if (!oppPlayers.some((p) => p.main_position === "P") && oppPlayers.length > 0) {
      const pCand = remainingPool.find((p) => p.main_position === "P");
      if (pCand) oppPlayers[oppPlayers.length - 1] = pCand;
    }

    const grades = shuffle([1, 1, 1, 2, 2, 3, 3, 3, 4, 4]);
    const finalizedOppPlayers = oppPlayers.map((p, idx) => ({
      ...p,
      grade: p.grade ?? (grades[idx] || 1),
    }));

    const oppOrder = generateTeamOrder(finalizedOppPlayers);

    return {
      ...baseUni,
      players: finalizedOppPlayers,
      order: oppOrder,
    };
  });

  if (typeof window !== "undefined") {
    localStorage.setItem("bb6_myTeam", JSON.stringify(userTeam));
    const initialLeague = initLeagueData(userTeam.team_name);
    localStorage.setItem("bb6_league", JSON.stringify(initialLeague));
    localStorage.setItem("bb6_league_opponents", JSON.stringify(leagueTeams));
  }

  return { userTeam, leagueTeams };
}