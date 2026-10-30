// app/match/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Player, UserTeam, PositionType, LeagueTeam, TeamOrder, SeasonPhase, PersonalityType } from "@/types/baseball";
import { getCurrentOpponent, recordRoundResults, resetLeagueForNewSeason, growOpponentTeams, OPPONENT_UNIVERSITIES, loadLeagueData } from "@/lib/league";
import { processYearEndGraduation } from "@/lib/draft";
import { getScrimmageTeamA, getScrimmageTeamB, getCorporateAllStars, getCollegeAllStars, getAsiaAllStars, getUsaAllStars } from "@/lib/specialTeams";
import PlayerCardModal from "@/components/PlayerCardModal";
import SoundToggle from "@/components/SoundToggle";
import { playBgm, playSe } from "@/lib/sound";
import { 
  ChevronLeft, Trophy, Pause, Play, FastForward, AlertCircle, 
  Gauge, ArrowRightLeft, Users, Info, X, Sparkles, Scale, Swords, ShieldHalf, Check, GraduationCap, Flame
} from "lucide-react";
import Link from "next/link";

export const isLeftHandBatter = (player: Player | undefined | null): boolean => {
  if (!player) return false;
  return player.batting_hand === "L";
};

export const calcDisplaySpeed = (pitchSpeed: number, isBreaking: boolean, staminaPct: number = 100): { kmh: number; ballType: string } => {
  const staminaMod = staminaPct < 30 ? -8 : staminaPct < 50 ? -3 : 0;
  const base = 100 + (pitchSpeed * 0.63) + staminaMod;
  const jitter = (Math.random() * 3 - 1.5);
  if (isBreaking) {
    const breakingKmh = Math.round(base - 14 + jitter);
    return { kmh: Math.max(105, breakingKmh), ballType: "変化球" };
  }
  const straightKmh = Math.round(base + jitter);
  return { kmh: Math.min(165, straightKmh), ballType: "ストレート" };
};

// 6種類の性格ごとの盗塁企図係数
const PERSONALITY_STEAL_MOD: Record<PersonalityType, number> = {
  お調子者: 1.4,
  熱血: 1.3,
  クール: 1.0,
  努力家: 1.0,
  頭脳派: 0.7,
  マイペース: 0.6,
};

const FIELD = {
  HOME: { x: 270, y: 395 },
  MOUND: { x: 270, y: 250 },
  FIRST: { x: 430, y: 245 },
  SECOND: { x: 270, y: 95 },
  THIRD: { x: 110, y: 245 },
};

const DEF_DEFAULT: Record<PositionType, { x: number; y: number }> = {
  P: { x: 270, y: 250 },
  C: { x: 270, y: 425 },
  "1B": { x: 415, y: 230 },
  "2B": { x: 335, y: 160 },
  "3B": { x: 125, y: 230 },
  SS: { x: 205, y: 160 },
};

type TacticChoice = "NORMAL" | "MEET" | "POWER" | "BUNT";
type PlayType = "POP_FLY" | "GROUND_BALL" | "CLEAN_HIT" | "DOUBLE" | "HOMERUN";

interface MovingRunner {
  id: string;
  player: Player;
  curX: number;
  curY: number;
  waypoints: { x: number; y: number }[];
  active: boolean;
  destBase: "FIRST" | "SECOND" | "THIRD" | "HOME";
  justScored?: boolean;
}

interface MatchGrowthPlayer {
  player: Player;
  statName: string;
  val: number;
}

/**
 * 季節と節に応じた対戦相手の動的選出
 */
function getSeasonOpponent(team: UserTeam): LeagueTeam {
  const season: SeasonPhase = team.current_season || "SPRING";
  const rnd = team.current_round || 1;

  if (season === "SPRING") {
    switch (rnd) {
      case 1:
        return getScrimmageTeamA(team);
      case 2:
        return getScrimmageTeamB(team);
      case 3:
        return getCorporateAllStars();
      case 4:
      default:
        return getCollegeAllStars();
    }
  }

  if (season === "SUMMER") {
    if (rnd === 4 || team.has_won_summer) {
      return getAsiaAllStars();
    }
    // 夏トーナメント3戦
    if (rnd === 1) return OPPONENT_UNIVERSITIES[6]; // 富士見
    if (rnd === 2) return OPPONENT_UNIVERSITIES[2]; // 黒潮
    return OPPONENT_UNIVERSITIES[1]; // 白百合（決勝）
  }

  // AUTUMN（秋季公式リーグ7節 ＋ 優勝時第8戦全米選抜）
  if (season === "AUTUMN" && (rnd === 8 || team.has_won_autumn)) {
    return getUsaAllStars();
  }
  return getCurrentOpponent(rnd);
}

export default function MatchPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [team, setTeam] = useState<UserTeam | null>(null);
  const [oppTeamData, setOppTeamData] = useState<LeagueTeam | null>(null);

  const [playerStamina, setPlayerStamina] = useState<Record<number, number>>({});
  const [slotLocks, setSlotLocks] = useState<Record<number, number>>({});

  const [displayState, setDisplayState] = useState({
    inning: 1,
    isTop: true,
    outs: 0,
    strikes: 0,
    balls: 0,
    myScore: [0, 0, 0, 0, 0],
    oppScore: [0, 0, 0, 0, 0],
    myHits: 0,
    oppHits: 0,
    batterIdx: 0,
    oppBatterIdx: 0,
    speedGun: null as { kmh: number; ballType: string } | null,
    isGameOver: false,
    skippedBottom5: false,
  });

  const [entities, setEntities] = useState<{
    fielders: { pos: PositionType; x: number; y: number; player?: Player }[];
    batter: { x: number; y: number; batAngle: number; isLeft: boolean; visible: boolean; swingingFrames: number; player?: Player };
    runners: { x: number; y: number; player: Player }[];
  }>({
    fielders: (["P", "C", "1B", "2B", "3B", "SS"] as PositionType[]).map((pos) => ({
      pos,
      x: DEF_DEFAULT[pos].x,
      y: DEF_DEFAULT[pos].y,
    })),
    batter: { x: 215, y: 390, batAngle: 0.5, isLeft: false, visible: true, swingingFrames: 0 },
    runners: [],
  });

  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState<1 | 2 | 3>(1);
  const [currentTactic, setCurrentTactic] = useState<TacticChoice>("NORMAL");
  
  const [viewPlayer, setViewPlayer] = useState<Player | null>(null);

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subTargetSlotIdx, setSubTargetSlotIdx] = useState<number | null>(null);
  const [subTargetBenchId, setSubTargetBenchId] = useState<number | null>(null);
  const [subSuccessMsg, setSubSuccessMsg] = useState<string | null>(null);

  const [activeContributors, setActiveContributors] = useState<Record<number, number>>({});

  const [matchResult, setMatchResult] = useState<{
    isFinished: boolean;
    isCold: boolean;
    resultType: "WIN" | "DRAW" | "LOSE";
    earnedTp: number;
    reason: string;
    finalMy: number;
    finalOpp: number;
    grownPlayers: MatchGrowthPlayer[];
    isSeasonEnd?: boolean;
    graduatedCount?: number;
    transitionMsg?: string;
  } | null>(null);

  const [banner, setBanner] = useState<{ text: string; color: string } | null>(null);
  const [homeInEffect, setHomeInEffect] = useState(false);
  const [log, setLog] = useState<string[]>(["プレイボール！ 試合開始。"]);

  const gameRef = useRef({
    inning: 1,
    isTop: true,
    outs: 0,
    strikes: 0,
    balls: 0,
    myScore: [0, 0, 0, 0, 0],
    oppScore: [0, 0, 0, 0, 0],
    myHits: 0,
    oppHits: 0,
    batterIdx: 0,
    oppBatterIdx: 0,
    speedGun: null as { kmh: number; ballType: string } | null,
    runners: { first: null as Player | null, second: null as Player | null, third: null as Player | null },
    movingRunners: [] as MovingRunner[],
    stealingRunner: null as { runner: Player; fromBase: "FIRST" | "SECOND"; toBase: "SECOND" | "THIRD"; isSuccess: boolean } | null,
    phase: "READY" as "READY" | "PITCHING" | "SWINGING" | "IN_PLAY" | "THROWING" | "THROWING_2B" | "THROWING_1B_DP" | "THROWING_HOME" | "THROWING_STEAL" | "WAIT_NEXT" | "INNING_CHANGE_WAIT",
    currentPlayType: null as PlayType | null,
    r3ChargedHome: false,
    timer: 0,
    ball: { x: FIELD.MOUND.x, y: FIELD.MOUND.y, z: 10, vx: 0, vy: 0, vz: 0, active: false, curve: 0, isBreaking: false },
    batter: { x: 215, y: 390, batAngle: 0.5, isSwinging: false, isLeft: false },
    fielders: [
      { pos: "P" as PositionType, x: DEF_DEFAULT.P.x, y: DEF_DEFAULT.P.y, hasBall: false },
      { pos: "C" as PositionType, x: DEF_DEFAULT.C.x, y: DEF_DEFAULT.C.y, hasBall: false },
      { pos: "1B" as PositionType, x: DEF_DEFAULT["1B"].x, y: DEF_DEFAULT["1B"].y, hasBall: false },
      { pos: "2B" as PositionType, x: DEF_DEFAULT["2B"].x, y: DEF_DEFAULT["2B"].y, hasBall: false },
      { pos: "3B" as PositionType, x: DEF_DEFAULT["3B"].x, y: DEF_DEFAULT["3B"].y, hasBall: false },
      { pos: "SS" as PositionType, x: DEF_DEFAULT.SS.x, y: DEF_DEFAULT.SS.y, hasBall: false },
    ],
    tactic: "NORMAL" as TacticChoice,
    isPaused: false,
    gameSpeed: 1,
    isGameOver: false,
    skippedBottom5: false,
    stamina: {} as Record<number, number>,
    hitStopFrames: 0,
    impactEffect: 0,
    swingingFrames: 0,
  });

  const syncUI = useCallback(() => {
    const g = gameRef.current;
    setDisplayState({
      inning: g.inning,
      isTop: g.isTop,
      outs: g.outs,
      strikes: g.strikes,
      balls: g.balls,
      myScore: [...g.myScore],
      oppScore: [...g.oppScore],
      myHits: g.myHits,
      oppHits: g.oppHits,
      batterIdx: g.batterIdx,
      oppBatterIdx: g.oppBatterIdx,
      speedGun: g.speedGun,
      isGameOver: g.isGameOver,
      skippedBottom5: g.skippedBottom5,
    });
    setPlayerStamina({ ...g.stamina });
  }, []);

  const initNewMatch = useCallback((parsedTeam: UserTeam) => {
    setMatchResult(null);
    setIsPaused(false);
    setBanner(null);
    setHomeInEffect(false);
    setActiveContributors({});
    
    // 試合開始BGM ＆ プレイボールSE
    playBgm("playingmarch");
    playSe("playball");

    const season = parsedTeam.current_season || "SPRING";
    const rnd = parsedTeam.current_round || 1;
    let seasonLabel = "春季プレシーズン";
    if (season === "SUMMER") {
      seasonLabel = rnd === 4 ? "アジア大学選手権" : "夏の全国大会";
    } else if (season === "AUTUMN") {
      seasonLabel = (rnd === 8 || parsedTeam.has_won_autumn) ? "日米親善大学野球" : "秋季公式リーグ";
    }
    setLog([`【${seasonLabel} 第${rnd}戦】 プレイボール！`]);

    const g = gameRef.current;
    g.inning = 1;
    g.isTop = true;
    g.outs = 0;
    g.strikes = 0;
    g.balls = 0;
    g.myScore = [0, 0, 0, 0, 0];
    g.oppScore = [0, 0, 0, 0, 0];
    g.myHits = 0;
    g.oppHits = 0;
    g.batterIdx = 0;
    g.oppBatterIdx = 0;
    g.speedGun = null;
    g.runners = { first: null, second: null, third: null };
    g.movingRunners = [];
    g.stealingRunner = null;
    g.phase = "READY";
    g.currentPlayType = null;
    g.r3ChargedHome = false;
    g.timer = 0;
    g.isGameOver = false;
    g.skippedBottom5 = false;
    g.isPaused = false;
    g.hitStopFrames = 0;
    g.impactEffect = 0;
    g.swingingFrames = 0;
    g.ball = { x: FIELD.MOUND.x, y: FIELD.MOUND.y, z: 10, vx: 0, vy: 0, vz: 0, active: false, curve: 0, isBreaking: false };
    g.batter = { x: 215, y: 390, batAngle: 0.5, isSwinging: false, isLeft: false };
    g.fielders.forEach((f) => {
      f.x = DEF_DEFAULT[f.pos].x;
      f.y = DEF_DEFAULT[f.pos].y;
      f.hasBall = false;
    });

    const initialStamina: Record<number, number> = {};
    parsedTeam.players.forEach((p) => { initialStamina[p.id] = 100; });
    g.stamina = initialStamina;
    setPlayerStamina(initialStamina);

    const initialLocks: Record<number, number> = {};
    parsedTeam.order.batting_order.forEach((pId, idx) => {
      initialLocks[pId] = idx;
    });
    setSlotLocks(initialLocks);

    syncUI();
  }, [syncUI]);

  useEffect(() => {
    const saved = localStorage.getItem("bb6_myTeam");
    if (!saved) {
      router.replace("/");
      return;
    }
    try {
      const parsed: UserTeam = JSON.parse(saved);
      if (!parsed.current_season) parsed.current_season = "SPRING";
      setTeam(parsed);

      const opp = getSeasonOpponent(parsed);
      setOppTeamData(opp);

      initNewMatch(parsed);
    } catch (e) {
      router.replace("/");
    }
  }, [router, initNewMatch]);

  useEffect(() => { gameRef.current.isPaused = isPaused; }, [isPaused]);
  useEffect(() => { gameRef.current.gameSpeed = gameSpeed; }, [gameSpeed]);
  useEffect(() => { gameRef.current.tactic = currentTactic; }, [currentTactic]);

  const getFielderPlayer = useCallback((pos: PositionType): Player | undefined => {
    if (!team || !oppTeamData) return undefined;
    if (!displayState.isTop) {
      const pId = team.order.defense_positions[pos];
      return team.players.find((p) => p.id === pId);
    } else {
      const pId = oppTeamData.order?.defense_positions?.[pos];
      return oppTeamData.players.find((p) => p.id === pId) || oppTeamData.players.find((p) => p.main_position === pos);
    }
  }, [team, oppTeamData, displayState.isTop]);

  const handleOpenPlayerCard = useCallback((p: Player | undefined | null) => {
    if (!p) return;
    setIsPaused(true);
    setViewPlayer(p);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const g = gameRef.current;
      
      if (g.hitStopFrames > 0) {
        g.hitStopFrames--;
      } else if (!g.isPaused && !g.isGameOver) {
        if (g.gameSpeed === 1) {
          if (performance.now() % 32 < 16) {
            updateGameEngine(g);
          }
        } else {
          const loops = g.gameSpeed === 2 ? 1 : 3;
          for (let step = 0; step < loops; step++) {
            updateGameEngine(g);
          }
        }
      }

      drawFieldAndBall(ctx, g);

      const activeRunnersData: { x: number; y: number; player: Player }[] = [];
      if (g.movingRunners.length === 0) {
        if (g.runners.first) activeRunnersData.push({ x: FIELD.FIRST.x, y: FIELD.FIRST.y, player: g.runners.first });
        if (g.runners.second) activeRunnersData.push({ x: FIELD.SECOND.x, y: FIELD.SECOND.y, player: g.runners.second });
        if (g.runners.third) activeRunnersData.push({ x: FIELD.THIRD.x, y: FIELD.THIRD.y, player: g.runners.third });
      } else {
        g.movingRunners.forEach((r) => {
          if (r.active || r.destBase !== "HOME") {
            activeRunnersData.push({ x: r.curX, y: r.curY, player: r.player });
          }
        });
      }

      const isBatterRunning = g.movingRunners.some((r) => r.id === "batter" && r.active);
      const isBatterVisible = !isBatterRunning;

      const oppStartersLocal = oppTeamData?.order?.batting_order || oppTeamData?.players.slice(0, 6).map((p) => p.id) || [];
      const currentBatterPlayerLocal = g.isTop
        ? (team?.players.find((p) => p.id === team.order.batting_order[g.batterIdx]) || team?.players[0])
        : (oppTeamData?.players.find((p) => p.id === oppStartersLocal[g.oppBatterIdx]) || oppTeamData?.players[g.oppBatterIdx]);

      setEntities({
        fielders: g.fielders.map((f) => ({ pos: f.pos, x: f.x, y: f.y, player: getFielderPlayer(f.pos) })),
        batter: {
          x: g.batter.x,
          y: g.batter.y,
          batAngle: g.batter.batAngle,
          isLeft: g.batter.isLeft,
          visible: isBatterVisible,
          swingingFrames: g.swingingFrames,
          player: currentBatterPlayerLocal,
        },
        runners: activeRunnersData,
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [team, oppTeamData, getFielderPlayer]);

  const updateGameEngine = (g: typeof gameRef.current) => {
    if (g.isGameOver) return;
    g.timer++;

    if (g.impactEffect > 0) g.impactEffect--;

    // 走者移動（走力に応じた自然な速度）
    g.movingRunners.forEach((r) => {
      if (r.active && r.waypoints.length > 0) {
        const target = r.waypoints[0];
        const dx = target.x - r.curX;
        const dy = target.y - r.curY;
        const dist = Math.hypot(dx, dy);
        
        const runnerSpeed = 3.3 + ((r.player.speed ?? 50) - 50) * 0.015;

        if (dist > 5) {
          r.curX += (dx / dist) * runnerSpeed;
          r.curY += (dy / dist) * runnerSpeed;
        } else {
          r.curX = target.x;
          r.curY = target.y;
          r.waypoints.shift();

          if (r.waypoints.length === 0) {
            r.active = false;
          }
        }
      }
    });

    const oppStarters = oppTeamData?.order?.batting_order || oppTeamData?.players.slice(0, 6).map((p) => p.id) || [];
    const currentBatter = g.isTop
      ? (team?.players.find((p) => p.id === team.order.batting_order[g.batterIdx]) || team?.players[0])
      : (oppTeamData?.players.find((p) => p.id === oppStarters[g.oppBatterIdx]) || oppTeamData?.players[g.oppBatterIdx]);

    const currentPitcher = g.isTop
      ? (oppTeamData?.order?.defense_positions?.P
          ? oppTeamData.players.find((p) => p.id === oppTeamData.order.defense_positions.P)
          : oppTeamData?.players.find((p) => p.main_position === "P") || oppTeamData?.players[0])
      : (team?.players.find((p) => p.id === team.order.defense_positions.P) || team?.players[0]);

    const isLeft = isLeftHandBatter(currentBatter);
    g.batter.isLeft = isLeft;
    g.batter.x = isLeft ? FIELD.HOME.x + 55 : FIELD.HOME.x - 55;
    g.batter.y = FIELD.HOME.y - 5;

    // 1. READY
    if (g.phase === "READY") {
      if (g.timer > 45) {
        g.phase = "PITCHING";
        g.timer = 0;
        g.currentPlayType = null;
        g.r3ChargedHome = false;
        g.batter.batAngle = isLeft ? -0.5 : 0.5;
        g.swingingFrames = 0;

        if (!g.isTop && currentPitcher) {
          g.stamina[currentPitcher.id] = Math.max(5, (g.stamina[currentPitcher.id] ?? 100) - 2.5);
        }

        const pitcherStamina = currentPitcher ? (g.stamina[currentPitcher.id] ?? 100) : 100;
        const ctrlMod = pitcherStamina < 30 ? -0.15 : 0;
        const ctrlRate = currentPitcher ? (currentPitcher.control / 110) + ctrlMod : 0.65;
        const isStrikeZone = Math.random() < Math.max(0.40, Math.min(0.78, ctrlRate));

        const isBreaking = Math.random() < 0.40;
        g.ball.isBreaking = isBreaking;
        g.ball.x = FIELD.MOUND.x;
        g.ball.y = FIELD.MOUND.y;
        g.ball.z = 10;

        const pitcherP = currentPitcher ? (currentPitcher.pitch_speed ?? 65) : 65;
        g.speedGun = calcDisplaySpeed(pitcherP, isBreaking, pitcherStamina);

        const offset = isStrikeZone ? (Math.random() - 0.5) * 14 : (Math.random() > 0.5 ? 24 : -24);
        const targetX = FIELD.HOME.x + offset;

        g.ball.vx = (targetX - FIELD.MOUND.x) / 30;
        g.ball.vy = 4.8;
        g.ball.vz = -0.05;
        g.ball.curve = isBreaking ? (Math.random() > 0.5 ? 0.042 : -0.042) : 0;
        g.ball.active = true;

        // 盗塁判定
        const r1 = g.runners.first;
        const r2 = g.runners.second;
        let stealAttempt: { runner: Player; from: "FIRST" | "SECOND"; to: "SECOND" | "THIRD" } | null = null;

        if (r1 && !r2 && (r1.speed ?? 50) >= 75) {
          const mod = PERSONALITY_STEAL_MOD[r1.personality || "努力家"] || 1.0;
          const prob = ((r1.speed ?? 50) - 70) * 1.2 * mod;
          if (Math.random() * 100 < prob) {
            stealAttempt = { runner: r1, from: "FIRST", to: "SECOND" };
          }
        } else if (r2 && !g.runners.third && (r2.speed ?? 50) >= 75) {
          const mod = PERSONALITY_STEAL_MOD[r2.personality || "努力家"] || 1.0;
          const prob = ((r2.speed ?? 50) - 70) * 1.2 * mod * 0.4;
          if (Math.random() * 100 < prob) {
            stealAttempt = { runner: r2, from: "SECOND", to: "THIRD" };
          }
        }

        if (stealAttempt) {
          const oppCatcherId = g.isTop
            ? oppTeamData?.order?.defense_positions?.C
            : team?.order.defense_positions.C;
          const catcherPlayer = g.isTop
            ? (oppTeamData?.players.find((p) => p.id === oppCatcherId) || oppTeamData?.players[1])
            : (team?.players.find((p) => p.id === oppCatcherId) || team?.players[1]);
          const catcherArm = catcherPlayer?.arm ?? 65;

          const baseProb = 70 + ((stealAttempt.runner.speed ?? 50) - catcherArm) * 0.6;
          const pitchMod = isBreaking ? 5 : -5;
          const successProb = Math.max(15, Math.min(90, baseProb + pitchMod));
          const isSuccess = Math.random() * 100 < successProb;

          g.stealingRunner = {
            runner: stealAttempt.runner,
            fromBase: stealAttempt.from,
            toBase: stealAttempt.to,
            isSuccess,
          };

          g.stamina[stealAttempt.runner.id] = Math.max(5, (g.stamina[stealAttempt.runner.id] ?? 100) - 10);

          const startCoord = stealAttempt.from === "FIRST" ? FIELD.FIRST : FIELD.SECOND;
          const targetCoord = stealAttempt.to === "SECOND" ? FIELD.SECOND : FIELD.THIRD;
          g.movingRunners.push({
            id: "stealer",
            player: stealAttempt.runner,
            curX: startCoord.x,
            curY: startCoord.y,
            waypoints: [{ x: targetCoord.x, y: targetCoord.y }],
            active: true,
            destBase: stealAttempt.to,
          });

          setBanner({ text: "RUNNER GOES! 盗塁スタート!", color: "#d97706" });
          setLog((prev) => [`走者・${stealAttempt.runner.name}がスタートを切った！ 盗塁を仕掛ける！`, ...prev.slice(0, 6)]);
        } else {
          g.stealingRunner = null;
        }

        syncUI();
      }
    }
    // 2. PITCHING
    else if (g.phase === "PITCHING") {
      g.ball.x += g.ball.vx;
      g.ball.y += g.ball.vy;
      if (g.ball.isBreaking && g.ball.y > 315) g.ball.vx += g.ball.curve;

      if (g.ball.y >= FIELD.HOME.y - 12) {
        g.phase = "SWINGING";
        g.timer = 0;

        const isStrike = Math.abs(g.ball.x - FIELD.HOME.x) <= 15;
        const swingProb = isStrike ? 0.78 : 0.28;
        g.batter.isSwinging = Math.random() < swingProb;
      }
    }
    // 3. SWINGING
    else if (g.phase === "SWINGING") {
      if (g.batter.isSwinging) {
        g.batter.batAngle += isLeft ? 0.35 : -0.35;
        g.swingingFrames++;
      }

      if (g.timer > 6) {
        const isStrike = Math.abs(g.ball.x - FIELD.HOME.x) <= 15;

        // 見逃し・ボール
        if (!g.batter.isSwinging) {
          if (g.stealingRunner) {
            startStealThrowSequence(g);
            return;
          }
          handlePitchCount(g, isStrike ? "STRIKE" : "BALL", isStrike ? "見逃しストライク！" : "ボール！");
          return;
        }

        const batterStamina = currentBatter ? (g.stamina[currentBatter.id] ?? 100) : 100;
        const staminaTiredMod = batterStamina < 30 ? -0.18 : batterStamina < 50 ? -0.08 : 0;

        const contactVal = currentBatter ? currentBatter.contact : 50;
        const tacticMod = g.tactic === "MEET" ? 0.12 : g.tactic === "POWER" ? -0.1 : 0;
        const meetChance = 0.68 + (contactVal - 50) * 0.003 + tacticMod + staminaTiredMod;

        // 空振り
        if (Math.random() > meetChance) {
          if (g.stealingRunner) {
            startStealThrowSequence(g);
            return;
          }
          handlePitchCount(g, "STRIKE", "空振り！");
          return;
        }

        // 打球が飛んだ場合（IN_PLAY）
        g.stealingRunner = null;
        g.movingRunners = g.movingRunners.filter((r) => r.id !== "stealer");

        g.phase = "IN_PLAY";
        g.timer = 0;
        g.ball.curve = 0;
        g.ball.isBreaking = false;
        g.impactEffect = 8; 

        const hitRoll = Math.random();

        if (hitRoll < 0.20) {
          g.currentPlayType = "POP_FLY";
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
          g.ball.vx = Math.cos(angle) * 1.8;
          g.ball.vy = Math.sin(angle) * 1.8;
          g.ball.vz = 6.0;
          setBanner({ text: "POP FLY", color: "#475569" });
          g.hitStopFrames = 4;
        }
        else if (hitRoll < 0.68) {
          g.currentPlayType = "GROUND_BALL";
          const targetFielder = g.fielders[Math.floor(Math.random() * g.fielders.length)];
          const fAngle = Math.atan2(targetFielder.y - FIELD.HOME.y, targetFielder.x - FIELD.HOME.x);
          g.ball.vx = Math.cos(fAngle) * 6.0;
          g.ball.vy = Math.sin(fAngle) * 6.0;
          g.ball.vz = 0.5;
          setBanner({ text: "GROUND BALL", color: "#475569" });
          g.hitStopFrames = 6;

          const shouldChargeHome = g.runners.third ? (g.outs === 2 ? true : Math.random() < 0.65) : false;
          g.r3ChargedHome = shouldChargeHome;

          if (currentBatter) startGroundBallRunners(g, currentBatter, shouldChargeHome);
        }
        else if (hitRoll < 0.88) {
          g.currentPlayType = "CLEAN_HIT";
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
          g.ball.vx = Math.cos(angle) * 7.0;
          g.ball.vy = Math.sin(angle) * 7.0;
          g.ball.vz = 2.2;
          setBanner({ text: "HIT IN PLAY!", color: "#d97706" });
          g.hitStopFrames = 10;
          if (currentBatter) startHitRunners(g, "SINGLE", currentBatter);
        }
        else if (hitRoll < 0.96) {
          g.currentPlayType = "DOUBLE";
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
          g.ball.vx = Math.cos(angle) * 8.2;
          g.ball.vy = Math.sin(angle) * 8.2;
          g.ball.vz = 3.5;
          setBanner({ text: "2-BASE HIT!", color: "#16a34a" });
          g.hitStopFrames = 14; 
          if (currentBatter) startHitRunners(g, "DOUBLE", currentBatter);
        }
        else {
          g.currentPlayType = "HOMERUN";
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
          g.ball.vx = Math.cos(angle) * 9.5;
          g.ball.vy = Math.sin(angle) * 9.5;
          g.ball.vz = 8.0;
          setBanner({ text: "HOME RUN!!", color: "#d97706" });
          g.hitStopFrames = 20;
          if (currentBatter) startHitRunners(g, "HOMERUN", currentBatter);
        }
      }
    }
    // THROWING_STEAL（盗塁阻止クロスプレー）
    else if (g.phase === "THROWING_STEAL") {
      g.ball.x += g.ball.vx;
      g.ball.y += g.ball.vy;
      const targetBase = g.stealingRunner?.toBase === "SECOND" ? FIELD.SECOND : FIELD.THIRD;
      const ballDist = Math.hypot(g.ball.x - targetBase.x, g.ball.y - targetBase.y);

      if (ballDist < 18 || g.timer > 28) {
        const isSuccess = g.stealingRunner?.isSuccess;
        const runner = g.stealingRunner?.runner;
        const from = g.stealingRunner?.fromBase;
        const to = g.stealingRunner?.toBase;

        g.movingRunners = g.movingRunners.filter((r) => r.id !== "stealer");

        if (isSuccess && runner && to) {
          if (to === "SECOND") {
            g.runners.second = runner;
            if (from === "FIRST") g.runners.first = null;
          } else if (to === "THIRD") {
            g.runners.third = runner;
            if (from === "SECOND") g.runners.second = null;
          }
          setBanner({ text: "STOLEN BASE!! 盗塁成功!", color: "#16a34a" });
          setLog((prev) => [`見事なスタート！ 走者・${runner.name}が盗塁成功！`, ...prev.slice(0, 6)]);
        } else if (runner) {
          // 盗塁死SE
          playSe("out");
          g.outs++;
          if (from === "FIRST") g.runners.first = null;
          if (from === "SECOND") g.runners.second = null;
          setBanner({ text: "CAUGHT STEALING!! タッチアウト!", color: "#e11d48" });
          setLog((prev) => [`捕手の矢のような好送球！ タッチアウト！ 盗塁失敗！`, ...prev.slice(0, 6)]);

          if (g.outs >= 3) {
            g.stealingRunner = null;
            triggerInningChangeSequence(g, "盗塁死で 3アウト チェンジ！");
            return;
          }
        }

        g.stealingRunner = null;
        g.phase = "WAIT_NEXT";
        g.timer = 0;
        syncUI();
      }
    }
    // 4. IN_PLAY
    else if (g.phase === "IN_PLAY") {
      g.ball.x += g.ball.vx;
      g.ball.y += g.ball.vy;
      g.ball.z += g.ball.vz;
      g.ball.vz -= 0.22;

      if (g.ball.z <= 0) {
        g.ball.z = 0;
        g.ball.vz = -g.ball.vz * 0.4;
        g.ball.vx *= 0.82;
        g.ball.vy *= 0.82;
      }

      let closestFielder = g.fielders[0];
      let minDist = 9999;
      g.fielders.forEach((f) => {
        const d = Math.hypot(f.x - g.ball.x, f.y - g.ball.y);
        if (d < minDist) { minDist = d; closestFielder = f; }
      });

      const fdx = g.ball.x - closestFielder.x;
      const fdy = g.ball.y - closestFielder.y;
      const fdist = Math.hypot(fdx, fdy);
      if (fdist > 4) {
        closestFielder.x += (fdx / fdist) * 3.6;
        closestFielder.y += (fdy / fdist) * 3.6;
      }

      if (g.currentPlayType === "POP_FLY") {
        if (fdist < 22 || g.timer > 48) {
          if (!g.isTop && team) {
            const fielderId = team.order.defense_positions[closestFielder.pos];
            if (fielderId) g.stamina[fielderId] = Math.max(5, (g.stamina[fielderId] ?? 100) - 6);
          }
          executeAtBatResult(g, "OUT", "高々と上がったポップフライを掴んでアウト！");
          return;
        }
      }
      else if (g.currentPlayType === "GROUND_BALL") {
        if ((fdist < 20 && g.ball.z < 15) || g.timer > 58) {
          closestFielder.hasBall = true;
          g.timer = 0;
          g.ball.x = closestFielder.x;
          g.ball.y = closestFielder.y;
          g.ball.z = 10;

          if (!g.isTop && team) {
            const fielderId = team.order.defense_positions[closestFielder.pos];
            if (fielderId) g.stamina[fielderId] = Math.max(5, (g.stamina[fielderId] ?? 100) - 6);
          }

          if (g.runners.first && g.outs < 2) {
            g.phase = "THROWING_2B";
            const tdx = FIELD.SECOND.x - g.ball.x;
            const tdy = FIELD.SECOND.y - g.ball.y;
            const tdist = Math.hypot(tdx, tdy) || 1;
            g.ball.vx = (tdx / tdist) * 12.5;
            g.ball.vy = (tdy / tdist) * 12.5;
            setBanner({ text: "DOUBLE PLAY CHANCE!", color: "#d97706" });
          } else {
            g.phase = "THROWING";
            const tdx = FIELD.FIRST.x - g.ball.x;
            const tdy = FIELD.FIRST.y - g.ball.y;
            const tdist = Math.hypot(tdx, tdy) || 1;
            g.ball.vx = (tdx / tdist) * 12.0;
            g.ball.vy = (tdy / tdist) * 12.0;
          }
          g.ball.vz = 0;
          return;
        }
      }
      else if (g.currentPlayType === "CLEAN_HIT") {
        if (g.timer > 48) {
          executeAtBatResult(g, "SINGLE", "野手の間を鋭く抜けるクリーンヒット！", currentBatter);
          return;
        }
      }
      else if (g.currentPlayType === "DOUBLE") {
        if (g.timer > 52) {
          executeAtBatResult(g, "DOUBLE", "外野へ抜ける会心の2ベースヒット！", currentBatter);
          return;
        }
      }
      else if (g.currentPlayType === "HOMERUN") {
        if (g.timer > 58) {
          executeAtBatResult(g, "HOMERUN", "スタンドへ吸い込まれる特大ホームラン！！", currentBatter);
          return;
        }
      }
    }
    // 5. THROWING_2B
    else if (g.phase === "THROWING_2B") {
      g.ball.x += g.ball.vx;
      g.ball.y += g.ball.vy;
      const ballDist = Math.hypot(g.ball.x - FIELD.SECOND.x, g.ball.y - FIELD.SECOND.y);

      if (ballDist < 16 || g.timer > 30) {
        playSe("out"); // 2塁フォースアウト
        g.outs++;
        g.movingRunners = g.movingRunners.filter((r) => r.id !== "runner1");
        g.runners.first = null;

        if (!g.isTop && team) {
          const secondBaseId = team.order.defense_positions["2B"];
          if (secondBaseId) g.stamina[secondBaseId] = Math.max(5, (g.stamina[secondBaseId] ?? 100) - 5);
        }

        if (g.outs >= 3) {
          triggerInningChangeSequence(g, "2塁フォースアウト！ 3アウト チェンジ！");
          return;
        }

        g.phase = "THROWING_1B_DP";
        g.timer = 0;
        g.ball.x = FIELD.SECOND.x;
        g.ball.y = FIELD.SECOND.y;
        g.ball.z = 10;
        const tdx = FIELD.FIRST.x - FIELD.SECOND.x;
        const tdy = FIELD.FIRST.y - FIELD.SECOND.y;
        const tdist = Math.hypot(tdx, tdy) || 1;
        g.ball.vx = (tdx / tdist) * 13.5;
        g.ball.vy = (tdy / tdist) * 13.5;
        setBanner({ text: "TURN TWO! 1塁へ転送!", color: "#d97706" });
        setLog((prev) => ["2塁フォースアウト！ すぐさま1塁へ転送！", ...prev.slice(0, 6)]);
        syncUI();
      }
    }
    // 6. THROWING_1B_DP
    else if (g.phase === "THROWING_1B_DP") {
      g.ball.x += g.ball.vx;
      g.ball.y += g.ball.vy;

      const ballDist = Math.hypot(g.ball.x - FIELD.FIRST.x, g.ball.y - FIELD.FIRST.y);
      const batterRunner = g.movingRunners.find((r) => r.id === "batter");
      const runnerDist = batterRunner ? Math.hypot(batterRunner.curX - FIELD.FIRST.x, batterRunner.curY - FIELD.FIRST.y) : 999;

      if (ballDist < 16 || g.timer > 30) {
        g.strikes = 0; g.balls = 0;

        if (g.isTop && currentBatter) {
          g.stamina[currentBatter.id] = Math.max(5, (g.stamina[currentBatter.id] ?? 100) - 12);
        }

        if (g.isTop) g.batterIdx = (g.batterIdx + 1) % 6;
        else g.oppBatterIdx = (g.oppBatterIdx + 1) % 6;

        const isDoublePlay = runnerDist > 14;

        if (isDoublePlay) {
          playSe("out"); // 1塁併殺アウト
          g.outs++;
          g.movingRunners = g.movingRunners.filter((r) => r.id !== "batter");
          applyGroundAdvanceRunners(g);

          if (g.outs >= 3) {
            triggerInningChangeSequence(g, "ダブルプレー成立！ 3アウト チェンジ！");
          } else {
            let scored = 0;
            if (g.r3ChargedHome) {
              scored = 1;
              if (g.isTop) g.myScore[g.inning - 1] += 1;
              else g.oppScore[g.inning - 1] += 1;
              setHomeInEffect(true);
              setTimeout(() => setHomeInEffect(false), 800);
            }

            setBanner({ text: "DOUBLE PLAY!!", color: "#e11d48" });
            const scoreLog = scored > 0 ? "（その間に3塁走者が生還して1点獲得！）" : "";
            setLog((prev) => [`1塁もアウト！ 見事なダブルプレー成立！${scoreLog}`, ...prev.slice(0, 6)]);

            const curMy = g.myScore.reduce((a, b) => a + b, 0);
            const curOpp = g.oppScore.reduce((a, b) => a + b, 0);

            if (Math.abs(curMy - curOpp) >= 5) {
              triggerMatchEnd(g, true, "5点差コールドゲーム成立！");
              return;
            }

            if (!g.isTop && g.inning === 5 && curOpp > curMy) {
              triggerMatchEnd(g, false, `5回裏 サヨナラ決着！ ${oppTeamData?.shortName}の勝利！`);
              return;
            }

            g.phase = "WAIT_NEXT";
            g.timer = 0;
            syncUI();
          }
        } else {
          const bPlayer = currentBatter || (g.isTop ? team?.players[0] : oppTeamData?.players[0])!;
          
          let scored = 0;
          if (g.r3ChargedHome) {
            scored = 1;
            if (g.isTop) {
              g.myScore[g.inning - 1] += 1;
            } else {
              g.oppScore[g.inning - 1] += 1;
            }
            setHomeInEffect(true);
            setTimeout(() => setHomeInEffect(false), 800);
          }

          applyGroundAdvanceRunners(g);
          g.runners.first = bPlayer;

          setBanner({ text: scored > 0 ? "併殺崩れ ＆ 1点獲得！" : "SAFE! 併殺崩れ!", color: "#16a34a" });
          const scoreLog = scored > 0 ? " その間に3塁走者が生還して1点獲得！" : "";
          setLog((prev) => [`打者走者は俊足を飛ばして1塁セーフ！ 併殺崩れ！${scoreLog}`, ...prev.slice(0, 6)]);

          const curMy = g.myScore.reduce((a, b) => a + b, 0);
          const curOpp = g.oppScore.reduce((a, b) => a + b, 0);

          if (Math.abs(curMy - curOpp) >= 5) {
            triggerMatchEnd(g, true, "5点差コールドゲーム成立！");
            return;
          }

          if (!g.isTop && g.inning === 5 && curOpp > curMy) {
            triggerMatchEnd(g, false, `5回裏 サヨナラ決着！ ${oppTeamData?.shortName}の勝利！`);
            return;
          }

          g.phase = "WAIT_NEXT";
          g.timer = 0;
          syncUI();
        }
      }
    }
    // 7. THROWING
    else if (g.phase === "THROWING") {
      g.ball.x += g.ball.vx;
      g.ball.y += g.ball.vy;

      const ballDist = Math.hypot(g.ball.x - FIELD.FIRST.x, g.ball.y - FIELD.FIRST.y);
      const batterRunner = g.movingRunners.find((r) => r.id === "batter");
      const runnerDist = batterRunner ? Math.hypot(batterRunner.curX - FIELD.FIRST.x, batterRunner.curY - FIELD.FIRST.y) : 999;

      if (ballDist < 16 || g.timer > 30) {
        if (g.isTop && currentBatter) {
          g.stamina[currentBatter.id] = Math.max(5, (g.stamina[currentBatter.id] ?? 100) - 12);
        }

        const isBatterOut = runnerDist > 14;

        if (!isBatterOut) {
          executeAtBatResult(g, "SINGLE", "俊足を飛ばしてセーフ！ 内野安打！", currentBatter);
        } else {
          playSe("out"); // 1塁ゴロアウト
          g.outs++;
          g.strikes = 0; g.balls = 0;
          g.movingRunners = g.movingRunners.filter((r) => r.id !== "batter");

          if (g.isTop) g.batterIdx = (g.batterIdx + 1) % 6;
          else g.oppBatterIdx = (g.oppBatterIdx + 1) % 6;

          if (g.outs >= 3) {
            setHomeInEffect(false);
            triggerInningChangeSequence(g, "内野ゴロ、1塁アウト！ 3アウト チェンジ！");
            return;
          }

          if (g.r3ChargedHome && g.runners.third) {
            g.phase = "THROWING_HOME";
            g.timer = 0;
            g.ball.x = FIELD.FIRST.x;
            g.ball.y = FIELD.FIRST.y;
            g.ball.z = 10;
            const tdx = FIELD.HOME.x - FIELD.FIRST.x;
            const tdy = FIELD.HOME.y - FIELD.FIRST.y;
            const tdist = Math.hypot(tdx, tdy) || 1;
            g.ball.vx = (tdx / tdist) * 12.5;
            g.ball.vy = (tdy / tdist) * 12.5;
            setBanner({ text: "CROSS PLAY AT HOME!", color: "#d97706" });
            setLog((prev) => ["1塁アウト！ ファーストがホームへ転送、本塁クロスプレー！", ...prev.slice(0, 6)]);
            syncUI();
            return;
          }

          applyGroundAdvanceRunners(g);

          setBanner({ text: "OUT!", color: "#e11d48" });
          setLog((prev) => ["内野ゴロ、1塁アウト！ 走者は進塁！", ...prev.slice(0, 6)]);
          g.phase = "WAIT_NEXT";
          g.timer = 0;
          syncUI();
        }
      }
    }
    // 8. THROWING_HOME
    else if (g.phase === "THROWING_HOME") {
      g.ball.x += g.ball.vx;
      g.ball.y += g.ball.vy;

      const ballDist = Math.hypot(g.ball.x - FIELD.HOME.x, g.ball.y - FIELD.HOME.y);
      const r3Runner = g.movingRunners.find((r) => r.id === "runner3");
      const r3Dist = r3Runner ? Math.hypot(r3Runner.curX - FIELD.HOME.x, r3Runner.curY - FIELD.HOME.y) : 999;

      if (ballDist < 16 || g.timer > 30) {
        if (g.isTop && r3Runner) {
          g.stamina[r3Runner.player.id] = Math.max(5, (g.stamina[r3Runner.player.id] ?? 100) - 15);
        }

        const isSafeAtHome = r3Dist <= 16;

        if (isSafeAtHome) {
          setBanner({ text: "SAFE!! 得点！", color: "#16a34a" });
          setHomeInEffect(true);
          setTimeout(() => setHomeInEffect(false), 800);

          if (g.isTop) {
            g.myScore[g.inning - 1] += 1;
            setLog((prev) => ["本塁クロスプレー、間一髪セーフ！ 1点獲得！", ...prev.slice(0, 6)]);
          } else {
            g.oppScore[g.inning - 1] += 1;
            setLog((prev) => ["本塁クロスプレー、相手走者が生還... 1点献上！", ...prev.slice(0, 6)]);
          }

          const curMy = g.myScore.reduce((a, b) => a + b, 0);
          const curOpp = g.oppScore.reduce((a, b) => a + b, 0);

          if (Math.abs(curMy - curOpp) >= 5) {
            triggerMatchEnd(g, true, "5点差コールドゲーム成立！");
            return;
          }

          if (!g.isTop && g.inning === 5 && curOpp > curMy) {
            triggerMatchEnd(g, false, `5回裏 サヨナラ決着！ ${oppTeamData?.shortName}の勝利！`);
            return;
          }
        } else {
          playSe("out"); // 本塁タッチアウト
          g.outs++;
          setBanner({ text: "DOUBLE PLAY!!", color: "#e11d48" });
          setLog((prev) => ["本塁タッチアウト！ 併殺（ダブルプレー）成立！", ...prev.slice(0, 6)]);
        }

        g.runners.third = null;
        g.movingRunners = g.movingRunners.filter((r) => r.id !== "runner3");

        applyGroundAdvanceRunners(g);

        if (g.outs >= 3) {
          triggerInningChangeSequence(g, "本塁タッチアウト！ 3アウト チェンジ！");
        } else {
          g.phase = "WAIT_NEXT";
          g.timer = 0;
          syncUI();
        }
      }
    }
    else if (g.phase === "INNING_CHANGE_WAIT") {
      if (g.timer > 65) {
        handleInningChange(g);
      }
    }
    else if (g.phase === "WAIT_NEXT") {
      const isAnyRunnerMoving = g.movingRunners.some((r) => r.active);
      if ((!isAnyRunnerMoving && g.timer > 30) || g.timer > 110) {
        resetPositions(g);
        g.phase = "READY";
        g.timer = 0;
        setBanner(null);
      }
    }
  };

  const startStealThrowSequence = (g: typeof gameRef.current) => {
    g.phase = "THROWING_STEAL";
    g.timer = 0;
    g.ball.x = FIELD.HOME.x;
    g.ball.y = FIELD.HOME.y;
    g.ball.z = 10;
    const targetCoord = g.stealingRunner?.toBase === "SECOND" ? FIELD.SECOND : FIELD.THIRD;
    const tdx = targetCoord.x - FIELD.HOME.x;
    const tdy = targetCoord.y - FIELD.HOME.y;
    const tdist = Math.hypot(tdx, tdy) || 1;
    g.ball.vx = (tdx / tdist) * 14.0;
    g.ball.vy = (tdy / tdist) * 14.0;
    g.ball.vz = 0;
    setBanner({ text: "THROW TO BASE! 捕手送球!", color: "#d97706" });
    syncUI();
  };

  const triggerInningChangeSequence = (g: typeof gameRef.current, logText: string) => {
    playSe("out"); // 攻守交代SE
    setBanner({ text: "3アウト チェンジ！", color: "#e11d48" });
    setLog((prev) => [logText, ...prev.slice(0, 6)]);
    g.phase = "INNING_CHANGE_WAIT";
    g.timer = 0;
    syncUI();
  };

  const applyGroundAdvanceRunners = (g: typeof gameRef.current) => {
    const nextRunners = { first: null as Player | null, second: null as Player | null, third: null as Player | null };
    
    if (g.runners.third) {
      if (g.r3ChargedHome) {
        if (g.runners.second) nextRunners.third = g.runners.second;
      } else {
        nextRunners.third = g.runners.third;
        if (g.runners.second) nextRunners.second = g.runners.second;
      }
    } else {
      if (g.runners.second) nextRunners.third = g.runners.second;
    }

    g.runners = nextRunners;
  };

  const startGroundBallRunners = (g: typeof gameRef.current, batterPlayer: Player, r3ChargeHome: boolean) => {
    const list: MovingRunner[] = [];
    list.push({ id: "batter", player: batterPlayer, curX: FIELD.HOME.x, curY: FIELD.HOME.y, waypoints: [{ x: FIELD.FIRST.x, y: FIELD.FIRST.y }], active: true, destBase: "FIRST" });
    if (g.runners.first) list.push({ id: "runner1", player: g.runners.first, curX: FIELD.FIRST.x, curY: FIELD.FIRST.y, waypoints: [{ x: FIELD.SECOND.x, y: FIELD.SECOND.y }], active: true, destBase: "SECOND" });
    if (g.runners.second) list.push({ id: "runner2", player: g.runners.second, curX: FIELD.SECOND.x, curY: FIELD.SECOND.y, waypoints: [{ x: FIELD.THIRD.x, y: FIELD.THIRD.y }], active: true, destBase: "THIRD" });
    if (g.runners.third && r3ChargeHome) list.push({ id: "runner3", player: g.runners.third, curX: FIELD.THIRD.x, curY: FIELD.THIRD.y, waypoints: [{ x: FIELD.HOME.x, y: FIELD.HOME.y }], active: true, destBase: "HOME" });
    g.movingRunners = list;
  };

  const startHitRunners = (g: typeof gameRef.current, hitType: "SINGLE" | "DOUBLE" | "HOMERUN", batterPlayer: Player) => {
    const list: MovingRunner[] = [];
    const batterWaypoints = hitType === "HOMERUN" ? [ { x: FIELD.FIRST.x, y: FIELD.FIRST.y }, { x: FIELD.SECOND.x, y: FIELD.SECOND.y }, { x: FIELD.THIRD.x, y: FIELD.THIRD.y }, { x: FIELD.HOME.x, y: FIELD.HOME.y } ] : hitType === "DOUBLE" ? [ { x: FIELD.FIRST.x, y: FIELD.FIRST.y }, { x: FIELD.SECOND.x, y: FIELD.SECOND.y } ] : [{ x: FIELD.FIRST.x, y: FIELD.FIRST.y }];
    list.push({ id: "batter", player: batterPlayer, curX: FIELD.HOME.x, curY: FIELD.HOME.y, waypoints: batterWaypoints, active: true, destBase: hitType === "HOMERUN" ? "HOME" : hitType === "DOUBLE" ? "SECOND" : "FIRST" });
    
    if (g.runners.first) {
      const r1Waypoints = hitType === "HOMERUN" ? [ { x: FIELD.SECOND.x, y: FIELD.SECOND.y }, { x: FIELD.THIRD.x, y: FIELD.THIRD.y }, { x: FIELD.HOME.x, y: FIELD.HOME.y } ] : hitType === "DOUBLE" ? [ { x: FIELD.SECOND.x, y: FIELD.SECOND.y }, { x: FIELD.THIRD.x, y: FIELD.THIRD.y } ] : [{ x: FIELD.SECOND.x, y: FIELD.SECOND.y }];
      list.push({ id: "runner1", player: g.runners.first, curX: FIELD.FIRST.x, curY: FIELD.FIRST.y, waypoints: r1Waypoints, active: true, destBase: hitType === "HOMERUN" ? "HOME" : hitType === "DOUBLE" ? "THIRD" : "SECOND" });
    }
    
    if (g.runners.second) {
      const r2Waypoints = hitType === "SINGLE" ? [{ x: FIELD.THIRD.x, y: FIELD.THIRD.y }] : [ { x: FIELD.THIRD.x, y: FIELD.THIRD.y }, { x: FIELD.HOME.x, y: FIELD.HOME.y } ];
      list.push({ id: "runner2", player: g.runners.second, curX: FIELD.SECOND.x, curY: FIELD.SECOND.y, waypoints: r2Waypoints, active: true, destBase: hitType === "SINGLE" ? "THIRD" : "HOME" });
    }
    
    if (g.runners.third) {
      list.push({ id: "runner3", player: g.runners.third, curX: FIELD.THIRD.x, curY: FIELD.THIRD.y, waypoints: [{ x: FIELD.HOME.x, y: FIELD.HOME.y }], active: true, destBase: "HOME" });
    }
    g.movingRunners = list;
  };

  const handlePitchCount = (g: typeof gameRef.current, type: "STRIKE" | "BALL", text: string) => {
    g.phase = "WAIT_NEXT";
    g.timer = 0;

    const oppStarters = oppTeamData?.order?.batting_order || oppTeamData?.players.slice(0, 6).map((p) => p.id) || [];
    const currentBatter = g.isTop
      ? (team?.players.find((p) => p.id === team.order.batting_order[g.batterIdx]) || team?.players[0])
      : (oppTeamData?.players.find((p) => p.id === oppStarters[g.oppBatterIdx]) || oppTeamData?.players[g.oppBatterIdx]);

    if (type === "STRIKE") {
      playSe("strike"); // ストライクSE
      g.strikes++;
      if (g.strikes >= 3) {
        playSe("out"); // 三振アウトSE
        g.outs++;
        if (g.isTop && currentBatter) {
          g.stamina[currentBatter.id] = Math.max(5, (g.stamina[currentBatter.id] ?? 100) - 10);
        }

        if (g.isTop) g.batterIdx = (g.batterIdx + 1) % 6;
        else g.oppBatterIdx = (g.oppBatterIdx + 1) % 6;

        if (g.outs >= 3) {
          triggerInningChangeSequence(g, "空振り三振！ 3アウト チェンジ！");
          return;
        }

        setBanner({ text: "STRIKE OUT!!", color: "#e11d48" });
        setLog((prev) => ["空振り三振！ バッターアウト！", ...prev.slice(0, 6)]);
        syncUI();
        return;
      }
      setBanner({ text, color: "#e11d48" });
    } else {
      playSe("ball"); // ボールSE
      g.balls++;
      if (g.balls >= 4) {
        setBanner({ text: "FOUR BALL (四球)", color: "#2563eb" });
        if (currentBatter) executeAtBatResult(g, "WALK", "四球を選んで出塁！", currentBatter);
        return;
      }
      setBanner({ text, color: "#2563eb" });
    }
    syncUI();
  };

  const executeAtBatResult = (
    g: typeof gameRef.current,
    outcome: "OUT" | "SINGLE" | "DOUBLE" | "HOMERUN" | "WALK",
    logMsg: string,
    batterPlayer?: Player
  ) => {
    g.phase = "WAIT_NEXT";
    g.timer = 0;
    g.strikes = 0;
    g.balls = 0;

    const bPlayer = batterPlayer || (g.isTop ? team?.players[0] : oppTeamData?.players[0])!;

    if (g.isTop && bPlayer) {
      const runFatigue = outcome === "HOMERUN" ? 18 : outcome === "DOUBLE" ? 14 : outcome === "SINGLE" ? 8 : 4;
      g.stamina[bPlayer.id] = Math.max(5, (g.stamina[bPlayer.id] ?? 100) - runFatigue);
    }

    if (g.isTop && outcome !== "OUT") {
      if (g.runners.first) g.stamina[g.runners.first.id] = Math.max(5, (g.stamina[g.runners.first.id] ?? 100) - 8);
      if (g.runners.second) g.stamina[g.runners.second.id] = Math.max(5, (g.stamina[g.runners.second.id] ?? 100) - 8);
      if (g.runners.third) g.stamina[g.runners.third.id] = Math.max(5, (g.stamina[g.runners.third.id] ?? 100) - 10);
    }

    if (outcome === "OUT") {
      playSe("out"); // アウトSE
      g.outs++;
      g.movingRunners = g.movingRunners.filter((r) => r.id !== "batter");

      if (g.isTop) g.batterIdx = (g.batterIdx + 1) % 6;
      else g.oppBatterIdx = (g.oppBatterIdx + 1) % 6;

      if (g.outs >= 3) {
        triggerInningChangeSequence(g, `${logMsg} 3アウト チェンジ！`);
        return;
      }
      setBanner({ text: "OUT!", color: "#e11d48" });
    } else {
      let scored = 0;
      const r1 = g.runners.first;
      const r2 = g.runners.second;
      const r3 = g.runners.third;
      const nextRunners: { first: Player | null; second: Player | null; third: Player | null } = {
        first: null,
        second: null,
        third: null,
      };

      if (g.isTop && bPlayer) {
        setActiveContributors((prev) => ({
          ...prev,
          [bPlayer.id]: (prev[bPlayer.id] || 0) + (outcome === "HOMERUN" ? 3 : outcome === "DOUBLE" ? 2 : 1),
        }));
      }

      if (outcome === "HOMERUN") {
        setBanner({ text: "HOME RUN!!", color: "#d97706" });
        scored = 1 + (r1 ? 1 : 0) + (r2 ? 1 : 0) + (r3 ? 1 : 0);
      } else if (outcome === "DOUBLE") {
        setBanner({ text: "2-BASE HIT!!", color: "#16a34a" });
        if (r3) scored++;
        if (r2) scored++;
        if (r1) nextRunners.third = r1;
        nextRunners.second = bPlayer;
      } else if (outcome === "SINGLE") {
        setBanner({ text: "SAFE!!", color: "#16a34a" });
        if (r3) scored++;
        if (r2) nextRunners.third = r2;
        if (r1) nextRunners.second = r1;
        nextRunners.first = bPlayer;
      } 
      else if (outcome === "WALK") {
        if (r1) {
          if (r2) {
            if (r3) {
              scored++;
              nextRunners.third = r2;
            } else {
              nextRunners.third = r2;
            }
            nextRunners.second = r1;
          } else {
            nextRunners.second = r1;
            nextRunners.third = r3;
          }
          nextRunners.first = bPlayer;
        } else {
          nextRunners.first = bPlayer;
          nextRunners.second = r2;
          nextRunners.third = r3;
        }
      }

      g.runners = nextRunners;

      if (g.isTop) {
        if (outcome !== "WALK") g.myHits++;
        if (scored > 0) {
          g.myScore[g.inning - 1] += scored;
          logMsg += ` 【${scored}点獲得！】`;
          setHomeInEffect(true);
          setTimeout(() => setHomeInEffect(false), 800);
        }
        g.batterIdx = (g.batterIdx + 1) % 6;
      } else {
        if (outcome !== "WALK") g.oppHits++;
        if (scored > 0) {
          g.oppScore[g.inning - 1] += scored;
          logMsg += ` 【${scored}点献上...】`;
          setHomeInEffect(true);
          setTimeout(() => setHomeInEffect(false), 800);
        }
        g.oppBatterIdx = (g.oppBatterIdx + 1) % 6;
      }

      const curMy = g.myScore.reduce((a, b) => a + b, 0);
      const curOpp = g.oppScore.reduce((a, b) => a + b, 0);
      syncUI();

      if (!g.isTop && g.inning === 5 && curOpp > curMy) {
        triggerMatchEnd(g, false, `5回裏 サヨナラ決着！ ${oppTeamData?.shortName}の勝利！`);
        return;
      }

      if (Math.abs(curMy - curOpp) >= 5) {
        triggerMatchEnd(g, true, "5点差コールドゲーム成立！");
        return;
      }
    }

    setLog((prev) => [logMsg, ...prev.slice(0, 6)]);
    syncUI();
  };

  const handleInningChange = (g: typeof gameRef.current) => {
    g.outs = 0;
    g.strikes = 0;
    g.balls = 0;
    g.runners = { first: null, second: null, third: null };
    g.movingRunners = [];
    g.stealingRunner = null;
    resetPositions(g);
    setBanner(null);

    if (!g.isTop && team) {
      Object.entries(team.order.defense_positions).forEach(([pos, pId]) => {
        if (pos !== "P" && pId) {
          g.stamina[pId] = Math.max(5, (g.stamina[pId] ?? 100) - 10);
        }
      });
    }

    if (team) {
      team.order.bench_ids.forEach((bId) => {
        g.stamina[bId] = 100;
      });
    }

    if (g.isTop) {
      if (g.inning === 5) {
        const curMy = g.myScore.reduce((a, b) => a + b, 0);
        const curOpp = g.oppScore.reduce((a, b) => a + b, 0);
        if (curMy < curOpp) {
          g.skippedBottom5 = true;
          syncUI();
          triggerMatchEnd(g, false, `5回表終了 規定により後攻・${oppTeamData?.shortName}の勝利！`);
          return;
        }
      }

      g.isTop = false;
      g.phase = "READY";
      g.timer = 0;
      setLog((l) => [`--- ${g.inning}回表終了 攻守交代（控え組のスタミナ全快！） ---`, ...l]);
    } else {
      if (g.inning >= 5) {
        triggerMatchEnd(g, false, "規定の5回が終了！");
        return;
      }
      g.inning++;
      g.isTop = true;
      g.phase = "READY";
      g.timer = 0;
      setLog((l) => [`=== ${g.inning}回表の攻撃へ（控え組のスタミナ全快！） ===`, ...l]);
    }
    syncUI();
  };

  const triggerMatchEnd = (g: typeof gameRef.current, isCold: boolean, reason: string) => {
    g.isGameOver = true;

    // 試合終了SE ＆ 表彰式・エンディングBGM
    playSe("gameset");
    playBgm("ending");

    const myFinal = g.myScore.reduce((a, b) => a + b, 0);
    const oppFinal = g.oppScore.reduce((a, b) => a + b, 0);

    let resultType: "WIN" | "DRAW" | "LOSE" = "DRAW";
    let earnedTp = 40;

    if (myFinal > oppFinal) {
      resultType = "WIN";
      earnedTp = isCold ? 100 : 80;
    } else if (myFinal < oppFinal) {
      resultType = "LOSE";
      earnedTp = 20;
    }

    const grownList: MatchGrowthPlayer[] = [];

    if (team) {
      try {
        const growthCount = Math.random() < 0.5 ? 2 : 3;
        const pool = [...team.players];
        const selectedPlayers: Player[] = [];

        const currentPitcherId = team.order.defense_positions.P;
        const finalContributors = { ...activeContributors, [currentPitcherId]: (activeContributors[currentPitcherId] || 0) + 2 };

        for (let i = 0; i < growthCount; i++) {
          if (pool.length === 0) break;
          const weights = pool.map((p) => 1 + (finalContributors[p.id] || 0));
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          let r = Math.random() * totalWeight;

          let pickedIdx = 0;
          for (let j = 0; j < pool.length; j++) {
            r -= weights[j];
            if (r <= 0) {
              pickedIdx = j;
              break;
            }
          }

          selectedPlayers.push(pool[pickedIdx]);
          pool.splice(pickedIdx, 1);
        }

        const updatedPlayers = team.players.map((p) => {
          const isChosen = selectedPlayers.some((sp) => sp.id === p.id);
          if (!isChosen) return p;

          const updated = { ...p };
          let statLabel = "ミート";

          if (updated.main_position === "P") {
            const isSpd = Math.random() > 0.5;
            statLabel = isSpd ? "球速" : "制球";
            if (isSpd) updated.pitch_speed = Math.min(99, (updated.pitch_speed || 65) + 1);
            else updated.control = Math.min(99, updated.control + 1);
            grownList.push({ player: updated, statName: statLabel, val: isSpd ? updated.pitch_speed : updated.control });
          } else {
            const stats = ["contact", "power", "speed", "fielding", "arm"] as const;
            const chosen = stats[Math.floor(Math.random() * stats.length)];
            const labels: Record<string, string> = { contact: "ミート", power: "パワー", speed: "走力", fielding: "守備力", arm: "肩力" };
            statLabel = labels[chosen];
            (updated as any)[chosen] = Math.min(99, (updated as any)[chosen] + 1);
            grownList.push({ player: updated, statName: statLabel, val: (updated as any)[chosen] });
          }

          return updated;
        });

        const currentSeason: SeasonPhase = team.current_season || "SPRING";
        const currentRnd = team.current_round || 1;

        let nextSeason: SeasonPhase = currentSeason;
        let nextRound = currentRnd + 1;
        let isSeasonEnd = false;
        let transitionMsg = "";
        let hasWonSummer = team.has_won_summer || false;
        let hasWonAutumn = team.has_won_autumn || false;

        if (currentSeason === "SPRING") {
          if (currentRnd < 4) {
            nextRound = currentRnd + 1;
          } else {
            nextSeason = "SUMMER";
            nextRound = 1;
            hasWonSummer = false;
            transitionMsg = "【春季プレシーズン全4試合完走！ 夏の全国大学トーナメントへ進出！】";
          }
        } else if (currentSeason === "SUMMER") {
          if (currentRnd === 1) {
            nextRound = 2;
          } else if (currentRnd === 2) {
            nextRound = 3;
          } else if (currentRnd === 3) {
            if (resultType === "WIN") {
              nextRound = 4;
              hasWonSummer = true;
              transitionMsg = "【全国大学トーナメント優勝！ 特別試合【アジア大学選手権】へ進出！】";
            } else {
              nextSeason = "AUTUMN";
              nextRound = 1;
              transitionMsg = "【夏のトーナメント終了！ 秋の大学公式リーグへ！】";
            }
          } else if (currentRnd >= 4) {
            nextSeason = "AUTUMN";
            nextRound = 1;
            transitionMsg = "【アジア大学選手権 激闘終了！ 秋の大学公式リーグへ！】";
          }
        } else if (currentSeason === "AUTUMN") {
          if (currentRnd <= 7) {
            try {
              recordRoundResults(currentRnd, myFinal, oppFinal, team.team_name);
            } catch (e) {
              console.warn("順位表更新スキップ:", e);
            }
          }

          if (currentRnd < 7) {
            nextRound = currentRnd + 1;
          } else if (currentRnd === 7) {
            const leagueData = loadLeagueData(team.team_name);
            const isChampion = leagueData.standings[0]?.teamId === 0;

            if (isChampion) {
              nextRound = 8;
              hasWonAutumn = true;
              transitionMsg = "【秋季公式リーグ制覇！ 優勝特典【日米親善大学野球・全米カレッジ選抜戦】へ進出！】";
            } else {
              isSeasonEnd = true;
              transitionMsg = "【秋の大学公式リーグ全日程終了！ 4年生引退・新歓ドラフトへ】";
            }
          } else if (currentRnd >= 8) {
            isSeasonEnd = true;
            transitionMsg = "【日米親善大学野球 激闘終了！ 4年生引退・新歓ドラフトへ】";
          }
        }

        if (isSeasonEnd) {
          const oppIds = new Set<number>();
          OPPONENT_UNIVERSITIES.forEach((t) => t.players?.forEach((p) => oppIds.add(p.id)));

          const teamWithGrownPlayers = {
            ...team,
            tp_funds: team.tp_funds + earnedTp,
            players: updatedPlayers,
          };

          const { updatedTeam: graduatedTeam, graduatedPlayers } = processYearEndGraduation(teamWithGrownPlayers, oppIds);

          resetLeagueForNewSeason(graduatedTeam.team_name);
          growOpponentTeams(graduatedTeam.current_year, resultType === "WIN");

          graduatedTeam.current_season = "SPRING";
          graduatedTeam.current_round = 1;
          graduatedTeam.has_won_summer = false;
          graduatedTeam.has_won_autumn = false;

          localStorage.setItem("bb6_myTeam", JSON.stringify(graduatedTeam));
          setTeam(graduatedTeam);

          setMatchResult({
            isFinished: true,
            isCold,
            resultType,
            earnedTp,
            reason: `${reason} ${transitionMsg}`,
            finalMy: myFinal,
            finalOpp: oppFinal,
            grownPlayers: grownList,
            isSeasonEnd: true,
            graduatedCount: graduatedPlayers.length,
            transitionMsg,
          });
          return;
        }

        const updatedTeam: UserTeam = {
          ...team,
          tp_funds: team.tp_funds + earnedTp,
          current_season: nextSeason,
          current_round: nextRound,
          has_won_summer: hasWonSummer,
          has_won_autumn: hasWonAutumn,
          players: updatedPlayers,
        };

        localStorage.setItem("bb6_myTeam", JSON.stringify(updatedTeam));
        setTeam(updatedTeam);

        setMatchResult({
          isFinished: true,
          isCold,
          resultType,
          earnedTp,
          reason: `${reason} ${transitionMsg}`,
          finalMy: myFinal,
          finalOpp: oppFinal,
          grownPlayers: grownList,
          isSeasonEnd: false,
          transitionMsg,
        });
      } catch (err) {
        console.error("試合後保存エラー:", err);
      }
    }
  };

  const resetPositions = (g: typeof gameRef.current) => {
    g.ball.x = FIELD.MOUND.x;
    g.ball.y = FIELD.MOUND.y;
    g.ball.z = 10;
    g.ball.vx = 0; g.ball.vy = 0; g.ball.vz = 0;
    g.ball.active = false;
    g.batter.batAngle = g.batter.isLeft ? -0.5 : 0.5;
    g.batter.isSwinging = false;
    g.swingingFrames = 0;
    g.impactEffect = 0;
    g.movingRunners = [];
    g.stealingRunner = null;
    g.fielders.forEach((f) => { f.x = DEF_DEFAULT[f.pos].x; f.y = DEF_DEFAULT[f.pos].y; f.hasBall = false; });
  };

  const drawFieldAndBall = (ctx: CanvasRenderingContext2D, g: typeof gameRef.current) => {
    ctx.clearRect(0, 0, 540, 440);

    ctx.fillStyle = "#2d5a37"; ctx.fillRect(0, 0, 540, 440);

    ctx.beginPath();
    ctx.arc(FIELD.HOME.x, FIELD.HOME.y, 325, Math.PI * 1.18, Math.PI * 1.82);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff35";
    ctx.stroke();

    ctx.fillStyle = "#8d5b3d";
    ctx.beginPath();
    ctx.moveTo(FIELD.HOME.x, FIELD.HOME.y);
    ctx.lineTo(FIELD.FIRST.x, FIELD.FIRST.y);
    ctx.lineTo(FIELD.SECOND.x, FIELD.SECOND.y);
    ctx.lineTo(FIELD.THIRD.x, FIELD.THIRD.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#ffffff90";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(FIELD.HOME.x, FIELD.HOME.y);
    ctx.lineTo(FIELD.FIRST.x + 75, FIELD.FIRST.y - 70);
    ctx.moveTo(FIELD.HOME.x, FIELD.HOME.y);
    ctx.lineTo(FIELD.THIRD.x - 75, FIELD.THIRD.y - 70);
    ctx.stroke();

    ctx.fillStyle = "#a26b48";
    ctx.beginPath();
    ctx.arc(FIELD.MOUND.x, FIELD.MOUND.y, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(FIELD.MOUND.x - 6, FIELD.MOUND.y - 2, 12, 3);
    
    const drawBase = (x: number, y: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-6, -6, 12, 12);
      ctx.restore();
    };
    drawBase(FIELD.FIRST.x, FIELD.FIRST.y);
    drawBase(FIELD.SECOND.x, FIELD.SECOND.y);
    drawBase(FIELD.THIRD.x, FIELD.THIRD.y);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(FIELD.HOME.x - 7, FIELD.HOME.y);
    ctx.lineTo(FIELD.HOME.x + 7, FIELD.HOME.y);
    ctx.lineTo(FIELD.HOME.x + 7, FIELD.HOME.y + 7);
    ctx.lineTo(FIELD.HOME.x, FIELD.HOME.y + 12);
    ctx.lineTo(FIELD.HOME.x - 7, FIELD.HOME.y + 7);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#ffffff70";
    ctx.lineWidth = 1;
    ctx.strokeRect(FIELD.HOME.x - 52, FIELD.HOME.y - 18, 22, 38);
    ctx.strokeRect(FIELD.HOME.x + 30, FIELD.HOME.y - 18, 22, 38);

    if (g.swingingFrames > 0 && g.swingingFrames < 8) {
      ctx.save();
      const originX = g.batter.isLeft ? g.batter.x - 12 : g.batter.x + 12;
      const originY = g.batter.y;
      ctx.translate(originX, originY);

      let startAngle: number;
      let currentAngle: number;
      let counterclockwise: boolean;

      if (g.batter.isLeft) {
        startAngle = Math.PI - (-0.5);
        currentAngle = Math.atan2(-Math.sin(g.batter.batAngle), -Math.cos(g.batter.batAngle));
        counterclockwise = false;
      } else {
        startAngle = 0.5;
        currentAngle = g.batter.batAngle;
        counterclockwise = true;
      }
      
      const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 48);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(0.7, `rgba(255,255,255,${0.65 - g.swingingFrames * 0.06})`);
      gradient.addColorStop(1, "rgba(255,255,255,0)");

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 48, startAngle, currentAngle, counterclockwise);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
    }

    if (g.impactEffect > 0) {
      ctx.save();
      ctx.translate(FIELD.HOME.x, FIELD.HOME.y - 15);
      const alpha = g.impactEffect / 8;
      
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        const r = i % 2 === 0 ? 30 + Math.random() * 10 : 10;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(253, 224, 71, ${alpha})`;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.stroke();
      ctx.restore();
    }

    if (g.ball.active || g.phase === "IN_PLAY" || g.phase === "THROWING" || g.phase === "THROWING_2B" || g.phase === "THROWING_1B_DP" || g.phase === "THROWING_HOME" || g.phase === "THROWING_STEAL") {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.arc(g.ball.x, g.ball.y, Math.max(2, 4 - g.ball.z * 0.05), 0, Math.PI * 2);
      ctx.fill();

      const ballDrawY = g.ball.y - g.ball.z;
      const r = Math.max(3.5, 4.5 + g.ball.z * 0.07);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(g.ball.x, ballDrawY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = g.ball.isBreaking ? "#3b82f6" : "#ef4444";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  };

  const handleReturnClubhouse = () => {
    setMatchResult(null);
    router.push("/");
  };

  if (!team || !oppTeamData) return null;

  const getPlayerAvatarUrl = (p: Player | undefined | null) => {
    if (!p) return "/901.jpg";
    if (p.image_url && p.image_url.trim() !== "" && p.image_url !== "NaN") {
      if (p.image_url.startsWith("http")) return p.image_url;
      return p.image_url.startsWith("/") ? p.image_url : `/${p.image_url}`;
    }
    return "/901.jpg";
  };

  const oppStarters = oppTeamData.order?.batting_order || oppTeamData.players.slice(0, 6).map((p) => p.id);

  const myTotal = displayState.myScore.reduce((a, b) => a + b, 0);
  const oppTotal = displayState.oppScore.reduce((a, b) => a + b, 0);

  const handleExecuteSubstitution = () => {
    if (subTargetSlotIdx === null || !subTargetBenchId || !team) return;

    const outPlayerId = team.order.batting_order[subTargetSlotIdx];
    const outPlayer = team.players.find((p) => p.id === outPlayerId);
    const inPlayer = team.players.find((p) => p.id === subTargetBenchId);
    if (!outPlayer || !inPlayer) return;

    if (slotLocks[inPlayer.id] !== undefined && slotLocks[inPlayer.id] !== subTargetSlotIdx) {
      alert(`この選手は既に【${slotLocks[inPlayer.id] + 1}番打順】に固定されているため、${subTargetSlotIdx + 1}番の席には交代できません！`);
      return;
    }

    const newOrder: TeamOrder = {
      ...team.order,
      batting_order: [...team.order.batting_order],
      defense_positions: { ...team.order.defense_positions },
      dp_ids: [...team.order.dp_ids],
      bench_ids: team.order.bench_ids.filter((id) => id !== subTargetBenchId).concat(outPlayerId),
    };

    newOrder.batting_order[subTargetSlotIdx] = inPlayer.id;

    for (const pos of Object.keys(newOrder.defense_positions) as PositionType[]) {
      if (newOrder.defense_positions[pos] === outPlayerId) {
        newOrder.defense_positions[pos] = inPlayer.id;
      }
    }

    const dpIdx = newOrder.dp_ids.indexOf(outPlayerId);
    if (dpIdx !== -1) newOrder.dp_ids[dpIdx] = inPlayer.id;

    const g = gameRef.current;
    if (g.runners.first?.id === outPlayerId) g.runners.first = inPlayer;
    if (g.runners.second?.id === outPlayerId) g.runners.second = inPlayer;
    if (g.runners.third?.id === outPlayerId) g.runners.third = inPlayer;
    g.movingRunners.forEach((mr) => {
      if (mr.player.id === outPlayerId) mr.player = inPlayer;
    });

    setSlotLocks((prev) => ({
      ...prev,
      [inPlayer.id]: subTargetSlotIdx,
    }));

    const updatedTeam = { ...team, order: newOrder };
    setTeam(updatedTeam);

    setLog((prev) => [`【選手交代】${subTargetSlotIdx + 1}番の席：${outPlayer.name} ➔ ${inPlayer.name}（スタミナ${Math.round(g.stamina[inPlayer.id] ?? 100)}%）`, ...prev.slice(0, 6)]);

    setSubSuccessMsg(`${subTargetSlotIdx + 1}番：${inPlayer.name} への交代が完了しました！`);
    setTimeout(() => setSubSuccessMsg(null), 2500);

    setSubTargetSlotIdx(null);
    setSubTargetBenchId(null);
  };

  const renderStaminaBadge = (playerId: number) => {
    const rawVal = playerStamina[playerId] ?? 100;
    const val = Math.round(rawVal);
    const color = val >= 60 ? "bg-emerald-500" : val >= 35 ? "bg-amber-500" : "bg-rose-500";
    return (
      <div className="flex items-center gap-1.5 w-full mt-1">
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${val}%` }} />
        </div>
        <span className={`text-[9px] font-mono font-black shrink-0 ${val < 35 ? "text-rose-600 animate-pulse" : "text-slate-600"}`}>
          {val}%
        </span>
      </div>
    );
  };

  const currentSeason: SeasonPhase = team.current_season || "SPRING";
  const getSeasonBadgeText = () => {
    if (currentSeason === "SPRING") {
      const titles = ["紅白戦A", "紅白戦B", "実業団選抜戦", "大学オールスター戦"];
      return `春季PS 第${team.current_round}戦 (${titles[team.current_round - 1] || "オープン戦"}) / 5イニング制`;
    }
    if (currentSeason === "SUMMER") {
      if (team.current_round === 4 || team.has_won_summer) return "アジア大学選手権 (国際親善試合) / 5イニング制";
      const rounds = ["1回戦", "準決勝", "決勝戦"];
      return `全国大学トーナメント ${rounds[team.current_round - 1] || `${team.current_round}回戦`} / 5イニング制`;
    }
    if (team.current_round === 8 || team.has_won_autumn) {
      return "日米親善決戦 (全米カレッジ選抜戦) / 5イニング制";
    }
    return `秋季公式リーグ 第${team.current_round}節 / 5イニング制`;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-3 md:p-6 font-sans select-none relative overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* トップバー */}
        <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition text-slate-800 flex items-center gap-1.5 text-xs font-bold">
            <ChevronLeft size={16} /> クラブハウスへ戻る
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1">
              {currentSeason === "SUMMER" && <Flame size={12} className="text-orange-600" />}
              {getSeasonBadgeText()}
            </span>

            {/* 音のオン／オフ切り替えボタン */}
            <SoundToggle />

            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition ${
                isPaused ? "bg-amber-600 text-white animate-pulse" : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              {isPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} />}
              {isPaused ? "試合再開" : "作戦タイム"}
            </button>

            <button
              onClick={() => { setIsPaused(true); setIsSubModalOpen(true); }}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <ArrowRightLeft size={13} /> 自由交代（スタミナ回復）
            </button>

            <button
              onClick={() => setGameSpeed((s) => (s === 1 ? 2 : s === 2 ? 3 : 1))}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-200 rounded-xl text-xs font-bold font-mono border border-slate-300 text-slate-800 flex items-center gap-1 w-12 justify-center"
            >
              <FastForward size={13} /> {gameSpeed}x
            </button>
          </div>
        </div>

        {/* スコアボード */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700 font-mono font-bold">
                <th className="py-1 text-left px-3 text-slate-800">TEAM</th>
                {[1, 2, 3, 4, 5].map((inn) => {
                  const isCurrentInning = inn === displayState.inning && !displayState.isGameOver;
                  return (
                    <th
                      key={inn}
                      className={`w-10 transition-all ${
                        isCurrentInning
                          ? "bg-amber-400 text-slate-950 font-black rounded-t-md"
                          : ""
                      }`}
                    >
                      {inn}
                    </th>
                  );
                })}
                <th className="w-12 font-black text-slate-900">R</th>
                <th className="w-10 font-black text-slate-800">H</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              <tr className="border-b border-slate-100">
                <td className="py-1.5 px-3 text-left font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> 青葉女子大
                </td>
                {displayState.myScore.map((s, i) => {
                  const isCurrentCell = (i + 1 === displayState.inning) && displayState.isTop && !displayState.isGameOver;
                  return (
                    <td
                      key={i}
                      className={`transition-all ${
                        isCurrentCell
                          ? "bg-amber-100 font-black text-amber-950 ring-2 ring-amber-400"
                          : i + 1 <= displayState.inning
                          ? "font-black text-slate-900"
                          : "text-slate-400 font-bold"
                      }`}
                    >
                      {i + 1 <= displayState.inning ? s : "-"}
                    </td>
                  );
                })}
                <td className="font-black text-amber-800 bg-amber-50">{myTotal}</td>
                <td className="font-black text-slate-800">{displayState.myHits}</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 text-left font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: oppTeamData.color }} />
                  {oppTeamData.shortName}
                </td>
                {displayState.oppScore.map((s, i) => {
                  const isCurrentCell = (i + 1 === displayState.inning) && !displayState.isTop && !displayState.isGameOver;
                  let valText = "-";
                  if (i === 4 && (displayState.skippedBottom5 || (displayState.isGameOver && displayState.inning === 5 && displayState.isTop && oppTotal > myTotal))) {
                    valText = "X";
                  } else if (i + 1 < displayState.inning || (i + 1 === displayState.inning && !displayState.isTop) || (displayState.isGameOver && i + 1 <= displayState.inning)) {
                    valText = s.toString();
                  }
                  return (
                    <td
                      key={i}
                      className={`transition-all ${
                        isCurrentCell
                          ? "bg-amber-100 font-black text-amber-950 ring-2 ring-amber-400"
                          : valText === "X"
                          ? "font-black text-rose-600 bg-rose-50"
                          : valText !== "-"
                          ? "font-black text-slate-900"
                          : "text-slate-400 font-bold"
                      }`}
                    >
                      {valText}
                    </td>
                  );
                })}
                <td className="font-black text-slate-900 bg-slate-100">{oppTotal}</td>
                <td className="font-black text-slate-800">{displayState.oppHits}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* メインエリア */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* 左：自軍打順 */}
          <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> 青葉女子大（自軍）
              </h3>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 transition-all ${
                displayState.isTop
                  ? "bg-emerald-600 text-white animate-pulse"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {displayState.isTop ? <><Swords size={12} /> 攻撃中</> : <><ShieldHalf size={12} /> 守備中</>}
              </span>
            </div>
            <div className="space-y-1.5">
              {team.order.batting_order.map((id, idx) => {
                const p = team.players.find((pl) => pl.id === id);
                const isCurrentBatter = displayState.isTop && displayState.batterIdx === idx;
                const pos = Object.entries(team.order.defense_positions).find(([_, pId]) => pId === id)?.[0] || "DP";
                const isLeft = isLeftHandBatter(p);
                const staminaVal = Math.round(playerStamina[id] ?? 100);

                return (
                  <div
                    key={idx}
                    onClick={() => handleOpenPlayerCard(p)}
                    className={`p-2 rounded-xl border transition flex items-center gap-2.5 text-xs cursor-pointer hover:border-amber-400 ${
                      isCurrentBatter
                        ? "bg-amber-50 border-amber-400 shadow-sm ring-2 ring-amber-400"
                        : staminaVal < 35
                        ? "bg-rose-50/70 border-rose-300"
                        : "bg-slate-50/80 border-slate-200"
                    }`}
                    title="クリックして能力カードを表示（試合一時停止）"
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-black text-[10px] ${isCurrentBatter ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-800"}`}>{idx + 1}</span>
                    
                    <div className="relative w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-700 shrink-0 shadow-md ring-1 ring-slate-300">
                      <img src={getPlayerAvatarUrl(p)} alt={p?.name || ""} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/901.jpg"; }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-bold flex items-center justify-between text-slate-900">
                        <span className="truncate">{p?.name}</span>
                        <div className="flex items-center gap-1">
                          {staminaVal < 35 && (
                            <span className="text-[9px] font-black bg-rose-600 text-white px-1 rounded animate-pulse">疲労</span>
                          )}
                          <span className={`text-[9px] px-1 rounded font-bold ${isLeft ? "bg-blue-100 text-blue-800 border border-blue-200" : "bg-slate-200 text-slate-800"}`}>
                            {pos}
                          </span>
                        </div>
                      </div>
                      {p && renderStaminaBadge(p.id)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 中央：グラウンドCanvas ＆ BSOランプ */}
          <div className="lg:col-span-6 flex flex-col items-center space-y-3">
            <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-3 shadow-sm flex flex-col items-center relative overflow-hidden">
              
              <div className="w-full flex items-center justify-between px-2 pb-2 mb-2 border-b border-slate-100 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-950 text-white px-3 py-1 rounded-xl shadow-md border border-slate-700">
                    <span className="text-sm font-black text-amber-400 font-mono">
                      {displayState.inning}回
                    </span>
                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded tracking-wider flex items-center gap-0.5 ${
                      displayState.isTop ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                    }`}>
                      {displayState.isTop ? "▲ 表 (攻撃)" : "▼ 裏 (守備)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 px-2 py-1 rounded-xl">
                    <div className="flex items-center gap-1">
                      <span className="font-black text-blue-700 text-[10px]">B</span>
                      <span className={`w-2 h-2 rounded-full ${displayState.balls >= 1 ? "bg-blue-600" : "bg-slate-300"}`} />
                      <span className={`w-2 h-2 rounded-full ${displayState.balls >= 2 ? "bg-blue-600" : "bg-slate-300"}`} />
                      <span className={`w-2 h-2 rounded-full ${displayState.balls >= 3 ? "bg-blue-600" : "bg-slate-300"}`} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-black text-amber-600 text-[10px]">S</span>
                      <span className={`w-2 h-2 rounded-full ${displayState.strikes >= 1 ? "bg-amber-500" : "bg-slate-300"}`} />
                      <span className={`w-2 h-2 rounded-full ${displayState.strikes >= 2 ? "bg-amber-500" : "bg-slate-300"}`} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-black text-rose-600 text-[10px]">O</span>
                      <span className={`w-2 h-2 rounded-full ${displayState.outs >= 1 ? "bg-rose-500" : "bg-slate-300"}`} />
                      <span className={`w-2 h-2 rounded-full ${displayState.outs >= 2 ? "bg-rose-500" : "bg-slate-300"}`} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {displayState.speedGun ? (
                    <div className="flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-lg border border-slate-700 shadow-sm animate-in fade-in duration-150">
                      <Gauge size={12} className="text-amber-400" />
                      <span className="font-black text-amber-300 font-mono text-[11px]">{displayState.speedGun.kmh} <span className="text-[9px] font-normal text-slate-200">km/h</span></span>
                      <span className="text-[9px] bg-slate-800 text-slate-200 px-1 py-0.2 rounded border border-slate-700 font-bold">{displayState.speedGun.ballType}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 font-mono font-bold">SPEED: --- km/h</div>
                  )}
                </div>
              </div>

              {/* グラウンドコンテナ */}
              <div className="relative w-full max-w-[540px] aspect-[540/440] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={540}
                  height={440}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* 野手アイコン（パーセンテージ指定でレスポンシブに完全追従） */}
                {entities.fielders.map((f) => {
                  const isMyFielder = !displayState.isTop;
                  return (
                    <div
                      key={f.pos}
                      onClick={() => handleOpenPlayerCard(f.player)}
                      style={{
                        left: `${(f.x / 540) * 100}%`,
                        top: `${(f.y / 440) * 100}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      className="absolute z-10 transition-transform duration-75 flex flex-col items-center cursor-pointer hover:scale-110 active:scale-95"
                      title={`${f.player?.name || f.pos}（クリックで選手詳細＆停止）`}
                    >
                      <div className={`relative w-11 h-11 sm:w-13 sm:h-13 md:w-16 md:h-16 rounded-full overflow-hidden bg-slate-800 shadow-xl ${
                        isMyFielder ? "border-[2.5px] sm:border-[3.5px] border-white ring-1 ring-slate-400/50" : "border-[2.5px] sm:border-[3.5px] border-slate-950 ring-1 ring-white/30"
                      }`}>
                        <img src={getPlayerAvatarUrl(f.player)} alt={f.pos} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/901.jpg"; }} />
                        <span className="absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-white border border-slate-400 shadow text-[8px] sm:text-[9px] md:text-[10px] font-black text-slate-900 flex items-center justify-center">
                          {f.pos}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* 打者アイコン（パーセンテージ指定でレスポンシブに完全追従） */}
                {entities.batter.visible && (
                  <div
                    onClick={() => handleOpenPlayerCard(entities.batter.player)}
                    style={{
                      left: `${(entities.batter.x / 540) * 100}%`,
                      top: `${(entities.batter.y / 440) * 100}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className="absolute z-10 transition-transform duration-75 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95"
                    title={`${entities.batter.player?.name || "打者"}（クリックで選手詳細＆停止）`}
                  >
                    <div
                      style={{
                        transform: `rotate(${entities.batter.batAngle}rad)`,
                        transformOrigin: entities.batter.isLeft ? "right center" : "left center",
                      }}
                      className={`absolute ${entities.batter.isLeft ? "right-5 sm:right-7" : "left-5 sm:left-7"} w-6 sm:w-8 h-1 sm:h-1.5 bg-amber-600 rounded-r border border-amber-900 z-0`}
                    />
                    <div className={`relative w-11 h-11 sm:w-13 sm:h-13 md:w-16 md:h-16 rounded-full overflow-hidden bg-slate-800 shadow-xl z-10 ${
                      displayState.isTop ? "border-[2.5px] sm:border-[3.5px] border-white ring-2 ring-amber-400/80" : "border-[2.5px] sm:border-[3.5px] border-slate-950 ring-2 ring-rose-500/80"
                    }`}>
                      <img src={getPlayerAvatarUrl(entities.batter.player)} alt="Batter" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/901.jpg"; }} />
                      <span className="absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-white border border-slate-400 shadow text-[9px] sm:text-[10px] md:text-[11px] font-black text-slate-900 flex items-center justify-center">
                        打
                      </span>
                    </div>
                  </div>
                )}

                {/* 走者アイコン（パーセンテージ指定でレスポンシブに完全追従） */}
                {entities.runners.map((r, idx) => {
                  const isMyTeamRunner = displayState.isTop;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleOpenPlayerCard(r.player)}
                      style={{
                        left: `${(r.x / 540) * 100}%`,
                        top: `${(r.y / 440) * 100}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      className="absolute z-10 transition-transform duration-75 flex flex-col items-center cursor-pointer hover:scale-110 active:scale-95"
                      title={`${r.player.name}（クリックで選手詳細＆停止）`}
                    >
                      <div className={`relative w-11 h-11 sm:w-13 sm:h-13 md:w-16 md:h-16 rounded-full overflow-hidden bg-slate-800 shadow-xl animate-pulse ${
                        isMyTeamRunner ? "border-[2.5px] sm:border-[3.5px] border-white ring-2 ring-blue-500" : "border-[2.5px] sm:border-[3.5px] border-slate-950 ring-2 ring-rose-500"
                      }`}>
                        <img src={getPlayerAvatarUrl(r.player)} alt={r.player.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/901.jpg"; }} />
                        <span className="absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-white border border-slate-400 shadow text-[9px] sm:text-[10px] md:text-[11px] font-black text-slate-900 flex items-center justify-center">
                          走
                        </span>
                      </div>
                    </div>
                  );
                })}

                {homeInEffect && (
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-amber-500 text-white font-black text-xs sm:text-sm px-4 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-lg border-2 border-white animate-bounce pointer-events-none z-20">
                    ⚡ ホームイン！ ＋1点獲得！
                  </div>
                )}

                {banner && (
                  <div
                    style={{ backgroundColor: banner.color }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-black text-base sm:text-xl px-5 sm:px-7 py-2 sm:py-3 rounded-2xl shadow-2xl animate-bounce border-2 border-white pointer-events-none z-20 whitespace-nowrap"
                  >
                    {banner.text}
                  </div>
                )}
              </div>
            </div>

            {/* 采配指示バー */}
            <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-800 shrink-0">采配指示:</span>
              <div className="grid grid-cols-4 gap-1.5 flex-1">
                {(["NORMAL", "MEET", "POWER", "BUNT"] as TacticChoice[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setCurrentTactic(t); setIsPaused(false); }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                      currentTactic === t
                        ? "bg-amber-100 border-amber-400 text-amber-950 shadow-sm font-black"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {t === "NORMAL" && "おまかせ"}
                    {t === "MEET" && "ミート"}
                    {t === "POWER" && "強振"}
                    {t === "BUNT" && "小技"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右：相手打順 */}
          <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: oppTeamData.color }} />
                {oppTeamData.name}
              </h3>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 transition-all ${
                !displayState.isTop
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {!displayState.isTop ? <><Swords size={12} /> 攻撃中</> : <><ShieldHalf size={12} /> 守備中</>}
              </span>
            </div>
            <div className="space-y-1.5">
              {oppStarters.map((pId, idx) => {
                const p = oppTeamData.players.find((pl) => pl.id === pId) || oppTeamData.players[idx];
                const isCurrentBatter = !displayState.isTop && displayState.oppBatterIdx === idx;
                const isLeft = isLeftHandBatter(p);
                const pos = Object.entries(oppTeamData.order?.defense_positions || {}).find(([_, id]) => id === p?.id)?.[0] || p?.main_position || "-";

                return (
                  <div
                    key={idx}
                    onClick={() => handleOpenPlayerCard(p)}
                    className={`p-2 rounded-xl border transition flex items-center gap-2.5 text-xs cursor-pointer hover:border-amber-400 ${
                      isCurrentBatter ? "bg-amber-50 border-amber-400 shadow-sm ring-2 ring-amber-400" : "bg-slate-50/80 border-slate-200"
                    }`}
                    title="クリックして能力カードを表示（試合一時停止）"
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-black text-[10px] ${isCurrentBatter ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-800"}`}>{idx + 1}</span>
                    
                    <div className="relative w-8 h-8 rounded-full border-2 border-slate-950 overflow-hidden bg-slate-700 shrink-0 shadow-md ring-1 ring-slate-400">
                      <img src={getPlayerAvatarUrl(p)} alt={p?.name || ""} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/901.jpg"; }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-bold flex items-center gap-1 text-slate-900">
                        <span className="truncate">{p?.name}</span>
                        <span className={`text-[9px] px-1 rounded font-bold ${isLeft ? "bg-blue-100 text-blue-800 border border-blue-200" : "bg-slate-200 text-slate-800"}`}>
                          {isLeft ? "左打" : "右打"}
                        </span>
                        {isCurrentBatter && <span className="text-[9px] font-black bg-amber-600 text-white px-1.5 rounded animate-pulse">打席</span>}
                      </div>
                      <div className="text-[10px] text-slate-700 font-mono font-medium">{pos} / ミ{p?.contact} パ{p?.power}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-black text-slate-800 block mb-1">実況ダイジェスト</span>
              <div className="space-y-1 max-h-[85px] overflow-y-auto text-[11px] font-mono pr-1">
                {log.map((item, idx) => (
                  <div key={idx} className={idx === 0 ? "text-amber-900 font-black" : "text-slate-700 font-medium"}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 選手交代モーダル */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in select-none">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-amber-600" />
                <h3 className="text-base font-black text-slate-900">選手交代（出入り自由・複数交代可）</h3>
              </div>
              <button
                onClick={() => { setIsSubModalOpen(false); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {subSuccessMsg ? (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-2.5 text-xs font-black flex items-center gap-1.5 animate-in fade-in">
                <Check size={16} className="text-emerald-600" /> {subSuccessMsg}
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-950 font-bold leading-relaxed">
                ※①交代枠（グラウンド）と②ベンチ選手を選んで「交代を適用」を押すと交代します。何人でも続けて交代できます。
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs font-black text-emerald-800 flex items-center gap-1">
                  <Users size={14} /> ① 交代させたい打順の席（グラウンド）
                </span>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {team.order.batting_order.map((id, slotIdx) => {
                    const p = team.players.find((pl) => pl.id === id);
                    const isSelected = subTargetSlotIdx === slotIdx;
                    const pos = Object.entries(team.order.defense_positions).find(([_, pid]) => pid === id)?.[0] || "DP";

                    return (
                      <div
                        key={id}
                        onClick={() => {
                          setSubTargetSlotIdx(slotIdx);
                          if (subTargetBenchId && slotLocks[subTargetBenchId] !== undefined && slotLocks[subTargetBenchId] !== slotIdx) {
                            setSubTargetBenchId(null);
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex flex-col cursor-pointer transition text-xs ${
                          isSelected ? "bg-amber-100 border-amber-500 ring-2 ring-amber-400 font-bold" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-slate-600 font-black">{slotIdx + 1}番</span>
                            <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.2 rounded font-black">{pos}</span>
                            <span className="font-black text-slate-900 truncate">{p?.name}</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleOpenPlayerCard(p); }} className="text-slate-400 hover:text-amber-600 p-1">
                            <Info size={14} />
                          </button>
                        </div>
                        {p && renderStaminaBadge(p.id)}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-black text-blue-800 flex items-center gap-1">
                  <Users size={14} /> ② 投入する控え選手（ベンチ待機組）
                </span>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {team.order.bench_ids.length === 0 ? (
                    <div className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl">
                      ベンチ控え選手がいません
                    </div>
                  ) : (
                    team.order.bench_ids.map((id) => {
                      const p = team.players.find((pl) => pl.id === id);
                      const isSelected = subTargetBenchId === id;
                      const lockedSlot = slotLocks[id];
                      const isSlotMismatch = subTargetSlotIdx !== null && lockedSlot !== undefined && lockedSlot !== subTargetSlotIdx;

                      return (
                        <div
                          key={id}
                          onClick={() => {
                            if (!isSlotMismatch) setSubTargetBenchId(id);
                          }}
                          className={`p-2.5 rounded-xl border flex flex-col transition text-xs ${
                            isSlotMismatch ? "opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed" : isSelected ? "bg-blue-100 border-blue-500 ring-2 ring-blue-400 font-bold cursor-pointer" : "bg-slate-50 border-slate-200 hover:border-slate-300 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="bg-blue-100 text-blue-900 text-[10px] px-1.5 py-0.2 rounded font-black border border-blue-200">
                                {p?.main_position}
                              </span>
                              <span className="font-black text-slate-900 truncate">{p?.name}</span>
                              {lockedSlot !== undefined ? (
                                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold font-mono">
                                  {lockedSlot + 1}番専用
                                </span>
                              ) : (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">
                                  枠フリー
                                </span>
                              )}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleOpenPlayerCard(p); }} className="text-slate-400 hover:text-blue-600 p-1">
                              <Info size={14} />
                            </button>
                          </div>
                          {p && renderStaminaBadge(p.id)}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <button
                onClick={handleExecuteSubstitution}
                disabled={subTargetSlotIdx === null || !subTargetBenchId}
                className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-black py-3 rounded-2xl shadow transition active:scale-95 text-xs flex items-center justify-center gap-1.5"
              >
                <ArrowRightLeft size={16} /> この交代を適用する
              </button>
              <button
                onClick={() => { setIsSubModalOpen(false); setIsPaused(false); }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-black py-3 px-5 rounded-2xl shadow transition active:scale-95 text-xs flex items-center justify-center gap-1.5"
              >
                交代を完了して試合に戻る
              </button>
            </div>
          </div>
        </div>
      )}

      {viewPlayer && (
        <PlayerCardModal player={viewPlayer} onClose={() => setViewPlayer(null)} />
      )}

      {/* 試合終了リザルトモーダル */}
      {matchResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-5">
            
            {matchResult.resultType === "WIN" && (
              <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-amber-50 border border-amber-200 text-amber-600">
                <Trophy size={32} />
              </div>
            )}
            {matchResult.resultType === "DRAW" && (
              <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-blue-50 border border-blue-200 text-blue-600">
                <Scale size={32} />
              </div>
            )}
            {matchResult.resultType === "LOSE" && (
              <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-slate-100 border border-slate-300 text-slate-600">
                <AlertCircle size={32} />
              </div>
            )}
            
            <div className="space-y-1">
              <span className={`text-[10px] font-black tracking-widest px-3 py-0.5 rounded-full uppercase border ${
                matchResult.resultType === "WIN"
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : matchResult.resultType === "DRAW"
                  ? "bg-blue-100 text-blue-900 border-blue-300"
                  : "bg-slate-100 text-slate-700 border-slate-300"
              }`}>
                {matchResult.isCold ? "COLD GAME (5点差コールド)" : "GAME SET (規定回数終了)"}
              </span>

              <h2 className="text-2xl font-black text-slate-900 mt-1">
                {matchResult.resultType === "WIN"
                  ? "青葉女子大学 勝利！"
                  : matchResult.resultType === "DRAW"
                  ? "引き分け（GAME DRAW）"
                  : `${oppTeamData.shortName}の勝利`}
              </h2>
              <p className="text-xs text-slate-700 font-bold">{matchResult.reason}</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-around">
              <div>
                <span className="text-xs text-slate-700 font-black block">青葉女子大</span>
                <span className="text-2xl font-black text-amber-700 font-mono">{matchResult.finalMy}</span>
              </div>
              <span className="text-xl font-black text-slate-400">-</span>
              <div>
                <span className="text-xs text-slate-700 font-black block">{oppTeamData.shortName}</span>
                <span className="text-2xl font-black text-slate-900 font-mono">{matchResult.finalOpp}</span>
              </div>
            </div>

            {matchResult.grownPlayers.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-left space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900">
                  <Sparkles size={14} className="text-emerald-600" />
                  実戦経験による成長（{matchResult.grownPlayers.length}名）
                </div>
                <div className="space-y-1 text-xs">
                  {matchResult.grownPlayers.map((gp, idx) => (
                    <div key={idx} className="flex items-center justify-between font-mono bg-white/70 px-2.5 py-1 rounded-xl border border-emerald-100">
                      <span className="font-bold text-slate-800">{gp.player.name}</span>
                      <span className="font-bold text-emerald-800">
                        {gp.statName} <span className="font-black text-emerald-700">+{1}</span> ({gp.val})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {matchResult.isSeasonEnd && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-left space-y-1 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs font-black text-blue-900">
                  <GraduationCap size={15} className="text-blue-600" />
                  シーズン終了・世代交代のお知らせ
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                  4年生（{matchResult.graduatedCount || 0}名）が晴れて卒業・引退しました。在校生は1学年進級し、春の入部ドラフト画面へ進みます！
                </p>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-center justify-between text-xs font-bold text-amber-950">
              <span>獲得部費ボーナス:</span>
              <span className="font-mono text-sm text-amber-800 font-black">+{matchResult.earnedTp} 万円</span>
            </div>

            <button
              onClick={() => {
                if (matchResult.isSeasonEnd) {
                  router.push("/scout-spring");
                } else {
                  handleReturnClubhouse();
                }
              }}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-3.5 rounded-2xl shadow-lg transition active:scale-95 text-xs block text-center"
            >
              {matchResult.isSeasonEnd
                ? "シーズン表彰式 ＆ 新入生ドラフトへ"
                : "クラブハウスへ帰還する（次戦へ）"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}