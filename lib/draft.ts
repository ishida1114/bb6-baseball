// lib/draft.ts
import { supabase } from "@/lib/supabase";
import { Player, PositionType, TeamOrder, UserTeam, LeagueTeam, PersonalityType } from "@/types/baseball";
import { OPPONENT_UNIVERSITIES, initLeagueData } from "@/lib/league";

// スカウト・ドラフト候補から完全に除外する特別チーム選手IDのブラックリスト
export const EXCLUDED_DRAFT_IDS = new Set<number>([
  246, 247, 248, 249, 250, 251, 252, 253, 254, 255, // アジア大学選抜
  256, 257, 258, 259, 260, 261, 262, 263, 264, 265, // 全米カレッジ選抜
  ...Array.from({ length: 50 }, (_, i) => 800 + i),   // 実業団・社会人選抜
]);

export interface CooldownPlayer {
  playerId: number;
  remainingYears: number;
}

export interface PlayerCareer {
  title: string;
  desc: string;
  badge: string;
  isPro: boolean;
  lastMessage: string;
  statRating: number;
}

export interface GraduatedPlayerWithCareer extends Player {
  career: PlayerCareer;
}

const POSITIONS: PositionType[] = ["P", "C", "1B", "2B", "3B", "SS"];
const INITIAL_GRADES = [1, 1, 1, 2, 2, 3, 3, 3, 4, 4];

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

export function hasUniqueImage(player: Player): boolean {
  if (player.is_protagonist) return true;
  if (!player.image_url) return false;
  const url = player.image_url.trim();
  if (url === "" || url === "NaN" || url === "null" || url === "undefined") return false;
  return !url.includes("901.jpg");
}

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
 * 選手の能力値・性格に応じた進路およびラストメッセージの自動生成
 */
export function determineCareerAndMessage(player: Player): GraduatedPlayerWithCareer {
  const isP = player.main_position === "P";
  const avgStat = isP
    ? ((player.pitch_speed || 65) + (player.control || 65) + (player.fielding || 65)) / 3
    : ((player.contact || 60) + (player.power || 60) + (player.speed || 60) + (player.fielding || 60) + (player.arm || 60)) / 5;

  // 主人公補正
  const effectiveRating = player.is_protagonist ? avgStat + 6 : avgStat;

  let title = "大手スポーツ用品メーカー 開発部";
  let desc = "4年間の選手経験を活かし、次世代の野球ギア開発に挑む！";
  let badge = "bg-slate-700 text-white font-bold";
  let isPro = false;

  if (effectiveRating >= 74) {
    title = "女子プロ野球 ドラフト1位指名";
    desc = "球界を背負って立つスーパースターとしてプロ最高峰の舞台へ！";
    badge = "bg-amber-500 text-slate-950 font-black";
    isPro = true;
  } else if (effectiveRating >= 70) {
    title = "実業団名門・大日本バイオ野球部";
    desc = "社会人女子野球最高峰の舞台で即戦力レギュラーとして活躍期待！";
    badge = "bg-blue-600 text-white font-bold";
  } else if (effectiveRating >= 65) {
    title = "実業団・サクラ重工女子野球部";
    desc = "日本選手権制覇を目指す強豪チームの主力選手へ抜擢！";
    badge = "bg-blue-700 text-white font-bold";
  } else if (effectiveRating >= 60) {
    title = "青葉女子大学野球部 学生コーチ就任";
    desc = "後輩たちの技術とメンタルを支える名参謀としてチームに残る！";
    badge = "bg-purple-600 text-white font-bold";
  } else if (effectiveRating >= 56) {
    title = "社会人クラブチーム ＆ 大手総合商社";
    desc = "仕事と野球をハイレベルに両立する文武両道のキャリア！";
    badge = "bg-emerald-600 text-white font-bold";
  } else if (effectiveRating >= 52) {
    title = "高等学校 保健体育教諭（野球部顧問）";
    desc = "次世代の全国を目指す女子球児を育てる熱血指導者へ！";
    badge = "bg-teal-700 text-white font-bold";
  }

  const lastMessages: Record<PersonalityType, string> = {
    熱血: "監督と泣き笑いしながら全力疾走した4年間、一生の宝物です！ 次の舞台でも泥臭く全力で挑んできます！",
    頭脳派: "監督の戦術やデータ野球、本当に深く勉強になりました。次の進路でも緻密な戦略で勝ち上がってみせます！",
    お調子者: "監督〜！ 私がいなくなって泣かないでくださいね！ プロでもド派手にホームラン打って自慢の後輩になりますから！",
    クール: "…4年間、本当にありがとうございました。監督の元で野球ができて、心から幸せでした。",
    努力家: "最初はついていくのがやっとだった私が、ここまで成長できました。監督に教わった粘り強さで社会でも頑張ります！",
    マイペース: "監督、4年間マイペースな私を見守ってくれてありがとうございました〜！ 次の場所でも自分らしくいきますね。",
  };

  let lastMessage = lastMessages[player.personality || "努力家"] || lastMessages["努力家"];
  if (player.is_protagonist) {
    lastMessage = "監督、私をここまで育ててくれて本当にありがとうございました！ 監督と出会えたから、私はマウンドで輝くことができました。青葉で過ごした日々を胸に、次の世界でも全力で腕を振ってきます！";
  }

  return {
    ...player,
    career: {
      title,
      desc,
      badge,
      isPro,
      lastMessage,
      statRating: Math.round(avgStat),
    },
  };
}

/**
 * 【年末世代交代処理】進路情報＆主人公卒業フラグ付き
 */
export function processYearEndGraduation(
  team: UserTeam,
  oppPlayerIds?: Set<number>
): {
  updatedTeam: UserTeam;
  graduatedPlayers: GraduatedPlayerWithCareer[];
  neededDraftCount: number;
  isProtagonistGraduating: boolean;
} {
  const graduatingRaw = team.players.filter((p) => (p.grade ?? 1) >= 4);
  const graduatedWithCareer = graduatingRaw.map(determineCareerAndMessage);
  const isProtagonistGraduating = graduatedWithCareer.some((p) => p.is_protagonist);

  const remaining = team.players
    .filter((p) => (p.grade ?? 1) < 4)
    .map((p) => ({ ...p, grade: (p.grade ?? 1) + 1 }));

  const nextCooldowns: CooldownPlayer[] = [];
  ((team as any).cooldowns || []).forEach((cd: CooldownPlayer) => {
    if (cd.remainingYears > 1) {
      nextCooldowns.push({ playerId: cd.playerId, remainingYears: cd.remainingYears - 1 });
    }
  });

  graduatingRaw.forEach((p) => {
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
    graduatedPlayers: graduatedWithCareer,
    neededDraftCount: Math.max(1, 10 - remaining.length),
    isProtagonistGraduating,
  };
}

/**
 * ★【2代目主役・新エース指名処理】
 * 在校生の中から指定した選手に主役フラグを付与し、部室看板データを自動更新
 */
export function assignNextProtagonist(
  team: UserTeam,
  newProtagonistId: number
): { updatedTeam: UserTeam; newProtagonist: Player } {
  let newProtagonist: Player | null = null;

  const updatedPlayers = team.players.map((p) => {
    if (p.id === newProtagonistId) {
      const updated = { ...p, is_protagonist: true };
      newProtagonist = updated;
      return updated;
    }
    return { ...p, is_protagonist: false };
  });

  if (!newProtagonist) {
    newProtagonist = updatedPlayers[0];
    newProtagonist.is_protagonist = true;
  }

  const updatedTeam: UserTeam = {
    ...team,
    players: updatedPlayers,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("bb6_myTeam", JSON.stringify(updatedTeam));
    localStorage.setItem("bb6_custom_protagonist", JSON.stringify(newProtagonist));
  }

  return { updatedTeam, newProtagonist };
}

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

  const fullPool = (pool || []).filter((p) => !EXCLUDED_DRAFT_IDS.has(p.id));

  const currentTeamIds = new Set(team.players.map((p) => p.id));
  const cooldownIds = new Set(((team as any).cooldowns || []).map((c: CooldownPlayer) => c.playerId));

  const availablePool = fullPool.filter(
    (p) => !currentTeamIds.has(p.id) && !cooldownIds.has(p.id) && !oppPlayerIds.has(p.id)
  );

  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
  const shuffled = shuffle(availablePool);

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

  while (candidates.length < 5 && shuffled.length > 0) {
    candidates.push({ ...shuffled.shift()!, grade: 1 });
  }

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

  for (let teamIdx = 0; teamIdx < 8; teamIdx++) {
    const grades = shuffle([...INITIAL_GRADES]);
    teamRosters[teamIdx] = teamRosters[teamIdx].map((p, idx) => {
      if (p.is_protagonist) return { ...p, grade: 1 };
      return { ...p, grade: grades[idx] || 1 };
    });
  }

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

  if (typeof window !== "undefined") {
    localStorage.setItem("bb6_myTeam", JSON.stringify(userTeam));
    const initialLeague = initLeagueData(userTeamName);
    localStorage.setItem("bb6_league", JSON.stringify(initialLeague));
    localStorage.setItem("bb6_league_opponents", JSON.stringify(leagueTeams));
  }

  return { userTeam, leagueTeams };
}

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

  const retainedTeams: Player[][] = allTeamsPlayers.map((teamList) => {
    return teamList
      .filter((p) => (p.grade ?? 1) < 4)
      .map((p) => ({ ...p, grade: (p.grade ?? 1) + 1 }));
  });

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

  const rookieCandidatePool = shuffle(
    fullPool.filter((p) => !retainedIds.has(p.id) && !cdIds.has(p.id))
  );
  const uniqueRookiePool = rookieCandidatePool.filter((p) => hasUniqueImage(p));
  const genericRookiePool = rookieCandidatePool.filter((p) => !hasUniqueImage(p));

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

export async function finalizeOpeningScout(
  aobaPlayers: Player[],
  rejectedMap: Record<number, string>
): Promise<{ userTeam: UserTeam; leagueTeams: LeagueTeam[] }> {
  const { data: allPoolPlayers } = await supabase
    .from("bb6_players")
    .select("*")
    .order("id", { ascending: true });

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