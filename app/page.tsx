// app/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { UserTeam, Player, PositionType, LeagueData, SeasonPhase, LeagueTeam } from "@/types/baseball";
import { loadLeagueData, OPPONENT_UNIVERSITIES } from "@/lib/league";
import { getScrimmageTeamA, getScrimmageTeamB, getCorporateAllStars, getCollegeAllStars, getAsiaAllStars, getUsaAllStars } from "@/lib/specialTeams";
import PlayerCardModal from "@/components/PlayerCardModal";
import SoundToggle from "@/components/SoundToggle";
import { playBgm } from "@/lib/sound";
import { 
  Trophy, Dumbbell, Building2, Play, Users, MessageSquare, 
  Sparkles, Award, ChevronRight, HelpCircle, Shield, Crown, Flame, Zap, Gauge, X, CheckCircle2, Clock,
  Coffee, Heart
} from "lucide-react";
import Link from "next/link";

interface TitleRankEntry {
  rank: number;
  name: string;
  team: string;
  isMyTeam: boolean;
  score: string;
  detail: string;
}

/**
 * 季節および勝敗分岐に応じた対戦相手の決定
 */
function getSeasonOpponent(team: UserTeam): LeagueTeam {
  const season: SeasonPhase = team.current_season || "SPRING";
  const rnd = team.current_round || 1;

  let oppList = OPPONENT_UNIVERSITIES;
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("bb6_league_opponents");
    if (saved) {
      try { oppList = JSON.parse(saved); } catch {}
    }
  }

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
    // 敗退フラグに応じた対戦相手分岐
    if (!team.has_lost_summer) {
      if (rnd === 1) return oppList[6] || oppList[0]; // 富士見
      if (rnd === 2) return oppList[2] || oppList[1]; // 黒潮（準決勝）
      return oppList[1] || oppList[0];                // 白百合（決勝）
    } else {
      if (rnd === 2) return oppList[4] || oppList[0]; // 紅蓮（敗者復活1回戦）
      return oppList[0] || oppList[3];                // 桜華学院（3位決定戦）
    }
  }

  if (season === "AUTUMN" && (rnd === 8 || team.has_won_autumn)) {
    return getUsaAllStars();
  }
  
  return oppList[rnd - 1] || oppList[0];
}

export default function ClubhousePage() {
  const router = useRouter();

  const [team, setTeam] = useState<UserTeam | null>(null);
  const [league, setLeague] = useState<LeagueData | null>(null);
  const [loading, setLoading] = useState(true);

  const [protagonist, setProtagonist] = useState<Player | null>(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);

  const [viewPlayer, setViewPlayer] = useState<Player | null>(null);
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  const [rankingTab, setRankingTab] = useState<"BATTER" | "PITCHER">("BATTER");
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // 突発カフェお誘いイベント
  const [cafeInvite, setCafeInvite] = useState<{ partnerId: number; partnerName: string } | null>(null);

  useEffect(() => {
    playBgm("clubhouse");

    const saved = localStorage.getItem("bb6_myTeam");
    if (!saved) {
      router.replace("/title");
      return;
    }
    try {
      const parsed: UserTeam = JSON.parse(saved);
      
      // 人数不足ガード：10名未満（4年生引退直後）なら新歓スカウトへ強制誘導
      if (parsed.players && parsed.players.length < 10) {
        router.replace("/scout-spring");
        return;
      }

      if (!parsed.current_season) parsed.current_season = "SPRING";
      setTeam(parsed);

      const lData = loadLeagueData(parsed.team_name);
      setLeague(lData);

      const activeProto = parsed.players.find((p) => p.is_protagonist);
      if (activeProto) {
        setProtagonist(activeProto);
        localStorage.setItem("bb6_custom_protagonist", JSON.stringify(activeProto));
      } else {
        const customProtoStr = localStorage.getItem("bb6_custom_protagonist");
        if (customProtoStr) {
          try {
            const parsedCustom = JSON.parse(customProtoStr);
            const existsInTeam = parsed.players.find((p) => p.id === parsedCustom.id);
            setProtagonist(existsInTeam || parsed.players[0]);
          } catch {
            setProtagonist(parsed.players[0]);
          }
        } else {
          setProtagonist(parsed.players[0]);
        }
      }

      // ★【改善】カフェ突発お誘いチェック（古い節の倉持の居座りを完全消去！）
      const currentRnd = parsed.current_round || 1;
      const currentSeason = parsed.current_season || "SPRING";
      const lastCafe = (parsed as any).last_cafe_round || 0;
      const savedInvite = localStorage.getItem("bb6_cafe_invite");

      let validInvite: { partnerId: number; partnerName: string; round?: number; season?: string } | null = null;

      if (savedInvite) {
        try {
          const parsedInvite = JSON.parse(savedInvite);
          // 節とシーズンが合致している場合のみ有効とする
          if (parsedInvite.round === currentRnd && parsedInvite.season === currentSeason) {
            validInvite = parsedInvite;
            setCafeInvite(parsedInvite);
          } else {
            // ★ 過去の節のゴミデータ（倉持）は即座に完全破棄！
            localStorage.removeItem("bb6_cafe_invite");
            setCafeInvite(null);
          }
        } catch {
          localStorage.removeItem("bb6_cafe_invite");
          setCafeInvite(null);
        }
      }

      // 有効なお誘いがなく、今節まだカフェに行っていない場合に22%でランダム選出
      if (!validInvite && lastCafe !== currentRnd && Math.random() < 0.22) {
        const teammates = parsed.players.filter((p) => !p.is_protagonist);
        if (teammates.length > 0) {
          const picked = teammates[Math.floor(Math.random() * teammates.length)];
          const newInvite = {
            partnerId: picked.id,
            partnerName: picked.name,
            round: currentRnd,
            season: currentSeason,
          };
          localStorage.setItem("bb6_cafe_invite", JSON.stringify(newInvite));
          setCafeInvite(newInvite);
        }
      }
    } catch (e) {
      router.replace("/title");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // 夏のトーナメント進捗リストの動的生成
  const summerSchedule = useMemo(() => {
    if (!team) return [];
    const rnd = team.current_round || 1;
    const hasLost = team.has_lost_summer || false;

    let oppList = OPPONENT_UNIVERSITIES;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bb6_league_opponents");
      if (saved) {
        try { oppList = JSON.parse(saved); } catch {}
      }
    }

    const r1 = { rnd: 1, title: "1回戦", opp: oppList[6]?.name || "富士見女子大学", desc: "全国の初戦！ 堅守の曲者を突破せよ" };

    if (!hasLost) {
      return [
        r1,
        { rnd: 2, title: "準決勝", opp: oppList[2]?.name || "黒潮海洋大学", desc: "韋駄天軍団！ 機動力野球を封じ込めろ" },
        { rnd: 3, title: "決勝戦", opp: oppList[1]?.name || "白百合女子大学", desc: "名門決戦！ 優勝でアジア選手権へ！" },
        { rnd: 4, title: "★特別試合", opp: "アジア大学選抜 (Asia)", desc: "国際決戦！ アジアの逸材10名に挑む" },
      ];
    } else {
      if (rnd === 2) {
        return [
          r1,
          { rnd: 2, title: "敗者復活戦", opp: oppList[4]?.name || "紅蓮体育大学", desc: "5〜8位決定トーナメント初戦！" },
          { rnd: 3, title: "5位決定戦", opp: oppList[3]?.name || "帝都経済大学", desc: "順位決定トーナメント最終戦！" },
          { rnd: 4, title: "大会終了", opp: "---", desc: "秋季公式リーグへ向けて調整" },
        ];
      } else {
        return [
          r1,
          { rnd: 2, title: "準決勝", opp: oppList[2]?.name || "黒潮海洋大学", desc: "韋駄天軍団！ 機動力野球を封じ込めろ" },
          { rnd: 3, title: "3位決定戦", opp: oppList[0]?.name || "桜華学院大学", desc: "全国3位を懸けた伝統校とのプライド対決！" },
          { rnd: 4, title: "大会終了", opp: "---", desc: "秋季公式リーグへ向けて調整" },
        ];
      }
    }
  }, [team]);

  if (loading || !team || !league) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const season: SeasonPhase = team.current_season || "SPRING";
  const opponent = getSeasonOpponent(team);

  const myStanding = league.standings.find((s) => s.teamId === 0) || {
    wins: 0, losses: 0, draws: 0, points: 0, runsFor: 0, runsAgainst: 0, diff: 0
  };

  const getPlayer = (id?: number) => (id ? team.players.find((p) => p.id === id) : undefined);

  const getPlayerAvatarUrl = (p?: Player | null) => {
    if (!p) return "/901.jpg";
    if (p.image_url && p.image_url.trim() !== "" && p.image_url !== "NaN") {
      if (p.image_url.startsWith("http")) return p.image_url;
      return p.image_url.startsWith("/") ? p.image_url : `/${p.image_url}`;
    }
    return "/901.jpg";
  };

  const oppFeature = opponent?.feature || opponent?.desc || "大学女子野球屈指の実力校";

  const aceGen = (team as any).ace_generation || 1;
  const isSecondGenOrLater = aceGen >= 2;

  const getSeasonDialogue = () => {
    if (cafeInvite) {
      return [
        `ねえねえ！ ${cafeInvite.partnerName.split(" ")[0]}から『練習終わったらカフェ寄っていかない？』ってお誘い受けてるよ！ ごちそうになっちゃおう！`,
        "カフェでゆっくり話すと、スタミナを増やしたり新しい守備位置の適性を開拓できるよ！",
      ];
    }
    if (season === "SPRING") {
      return [
        "まず初めに、「オーダー変更」で戦力を確認、次に「全体練習」や「放課後カフェ」で仲間を強化、それから「試合を開始する」へ進んでね！",
        isSecondGenOrLater
          ? `先輩たちから伝統のマウンドを受け継ぎました！ ${aceGen}代目エースとして、今年も青葉旋風を巻き起こしてみせます！`
          : `現在は春のプレシーズン！ 第${team.current_round}戦は【${opponent.name}】との一戦だよ！ 新入生の適性をしっかり試そう！`,
        "紅白戦は青葉部員をシャッフルした真剣勝負！ 敵味方両面から仲間の実力を肌で体感できるよ！",
        "第3戦の実業団チームに勝利すると、企業から特別スポンサー料（多額の部費）が支給されるよ！",
        "春の全4試合を完走すると、夏の全国大学トーナメントへ進出できるよ！",
      ];
    }
    if (season === "SUMMER") {
      if (team.current_round === 4 || team.has_won_summer) {
        return [
          "全国大会優勝、おめでとう！ ついにアジア最強『アジア大学選抜』との国際親善試合だよ！",
          "アジア各地から集ったトップ選手たちを相手に、青葉のチームワークを見せつけよう！",
        ];
      }
      if (team.has_lost_summer) {
        return [
          `準決勝は惜しかったけど、まだ終わりじゃないよ！ 第${team.current_round}戦は【${opponent.name}】との3位決定戦！`,
          "全国3位の栄誉を勝ち取って、秋の公式リーグへ弾みをつけよう！",
          "負けた悔しさを力に変えて、最後の一球まで全力で戦い抜こう！",
        ];
      }
      return [
        `夏の全国大学トーナメントが開幕！ 第${team.current_round}戦の相手は【${opponent.name}】だよ！`,
        "トーナメントで優勝すれば、アジアの精鋭が集う『アジア大学選抜』との特別マッチに挑戦できるよ！",
        "夏の試合で得た部費は練習やカフェ、設備投資に注ぎ込んで、秋の本番に向けて選手を一気に覚醒させよう！",
      ];
    }
    if (team.current_round === 8 || team.has_won_autumn) {
      return [
        "秋季リーグ制覇、本当におめでとう！ そして…ついに世界最強『全米カレッジ選抜』との日米決戦だよ！",
        "本場アメリカの160km/h超の剛腕＆怪力スラッガー軍団！ 4年生最後の舞台、全力でぶつかろう！",
        "この日米親善試合が終われば、4年生は名誉の卒業となるよ。歴史に名を刻む大金星を掴み取ろう！",
      ];
    }
    return [
      `いよいよ秋の本番、大学公式リーグ第${team.current_round}節！ 相手は【${opponent.name}】だよ！`,
      "秋は全8大学による総当たり戦！ 4年生の先輩たちと一緒に、悲願のリーグ制覇を目指そう！",
      "秋季リーグで優勝すると、王者特典として『全米カレッジ選抜』との日米親善決戦に挑めるよ！",
      "第7節が終わると4年生は卒業・引退となるよ。悔いのない戦いを繰り広げよう！",
    ];
  };

  const dialogues = [
    ...getSeasonDialogue(),
    "部費が貯まったら『グラウンド整備』に投資しよう！ 設備は引退してもずっとチームに残るよ！",
    "走力75以上の選手は、隙があれば果敢に盗塁（スチール）を仕掛けてチャンスを広げてくれるよ！",
    "私にできることがあれば何でも言ってね。マウンドは絶対に守り抜いてみせるよ！",
  ];

  const currentDialogue = dialogues[dialogueIndex % dialogues.length];

  const playedMatches = Math.max(1, myStanding.wins + myStanding.losses + myStanding.draws);
  const protoLastName = protagonist?.name.split(" ")[0] || "神崎";
  const batter1LastName = team.players[1]?.name.split(" ")[0] || "林田";
  const batter2LastName = team.players[2]?.name.split(" ")[0] || "伊藤";

  const protoAB = playedMatches * 3;
  const protoHits = Math.max(1, Math.round(protoAB * 0.40));
  const protoAvg = (protoHits / protoAB).toFixed(3).replace(/^0+/, "");

  const b1AB = playedMatches * 3;
  const b1Hits = Math.max(1, Math.round(b1AB * 0.33));
  const b1Avg = (b1Hits / b1AB).toFixed(3).replace(/^0+/, "");

  const protoHR = Math.min(playedMatches, Math.floor(playedMatches * 0.5) + (myStanding.wins > 0 ? 1 : 0));
  const protoRBI = Math.max(1, playedMatches * 2 - (myStanding.losses > 0 ? 1 : 0));

  const myAceWins = myStanding.wins;
  const myAceLosses = myStanding.losses;
  const myAceInnings = playedMatches * 4;
  const myAceER = Math.max(0, playedMatches + myStanding.losses * 2 - myStanding.wins);
  const myAceERA = myAceInnings > 0 ? ((myAceER * 5) / myAceInnings).toFixed(2) : "0.00";
  const myAceSO = playedMatches * 4 + (myStanding.wins * 2);

  const rival1Standing = league.standings.find((s) => s.teamId === 1) || { wins: 0, losses: 0 };
  const rival2Standing = league.standings.find((s) => s.teamId === 2) || { wins: 0, losses: 0 };
  const rival3Standing = league.standings.find((s) => s.teamId === 3) || { wins: 0, losses: 0 };
  const rival4Standing = league.standings.find((s) => s.teamId === 4) || { wins: 0, losses: 0 };

  const BATTING_RANKINGS: { title: string; unit: string; list: TitleRankEntry[] }[] = [
    {
      title: "首位打者（打率）",
      unit: "",
      list: [
        { rank: 1, name: `${protoLastName}（あなた）`, team: "青葉女子大", isMyTeam: true, score: `${protoAvg}`, detail: `${protoAB}打数 ${protoHits}安打` },
        { rank: 2, name: "一条 麗香", team: "桜華学院", isMyTeam: false, score: ".364", detail: `${playedMatches * 3}打数 ${Math.max(1, Math.round(playedMatches * 3 * 0.364))}安打` },
        { rank: 3, name: "天野 緋奈", team: "紅蓮体育", isMyTeam: false, score: ".350", detail: `${playedMatches * 3}打数 ${Math.max(1, Math.round(playedMatches * 3 * 0.350))}安打` },
        { rank: 4, name: batter1LastName, team: "青葉女子大", isMyTeam: true, score: `${b1Avg}`, detail: `${b1AB}打数 ${b1Hits}安打` },
        { rank: 5, name: "大黒 摩耶", team: "黒潮海洋", isMyTeam: false, score: ".308", detail: `${playedMatches * 3}打数 ${Math.max(1, Math.round(playedMatches * 3 * 0.308))}安打` },
      ],
    },
    {
      title: "本塁打王（HR）",
      unit: "本",
      list: [
        { rank: 1, name: "天野 緋奈", team: "紅蓮体育", isMyTeam: false, score: `${Math.max(1, Math.round(playedMatches * 0.6))}本`, detail: `長打率 .750` },
        { rank: 2, name: `${protoLastName}（あなた）`, team: "青葉女子大", isMyTeam: true, score: `${protoHR}本`, detail: `長打率 .620` },
        { rank: 3, name: "大黒 摩耶", team: "黒潮海洋", isMyTeam: false, score: `${Math.max(0, Math.floor(playedMatches * 0.4))}本`, detail: `長打率 .550` },
        { rank: 4, name: "一条 麗香", team: "桜華学院", isMyTeam: false, score: `${Math.max(0, Math.floor(playedMatches * 0.3))}本`, detail: `長打率 .500` },
        { rank: 5, name: batter2LastName, team: "青葉女子大", isMyTeam: true, score: `${Math.max(0, Math.floor(playedMatches * 0.2))}本`, detail: `長打率 .450` },
      ],
    },
    {
      title: "打点王（打点）",
      unit: "打点",
      list: [
        { rank: 1, name: `${protoLastName}（あなた）`, team: "青葉女子大", isMyTeam: true, score: `${protoRBI}打点`, detail: `得点圏 .400` },
        { rank: 2, name: "天野 緋奈", team: "紅蓮体育", isMyTeam: false, score: `${Math.max(1, playedMatches * 2 - 1)}打点`, detail: `得点圏 .375` },
        { rank: 3, name: "一条 麗香", team: "桜華学院", isMyTeam: false, score: `${Math.max(1, playedMatches)}打点`, detail: `得点圏 .333` },
        { rank: 4, name: batter1LastName, team: "青葉女子大", isMyTeam: true, score: `${Math.max(0, playedMatches - 1)}打点`, detail: `得点圏 .286` },
        { rank: 5, name: "大黒 摩耶", team: "黒潮海洋", isMyTeam: false, score: `${Math.max(0, playedMatches - 1)}打点`, detail: `得点圏 .250` },
      ],
    },
  ];

  const winRankPool = [
    { name: `${protoLastName}（あなた）`, team: "青葉女子大", isMyTeam: true, wins: myAceWins, losses: myAceLosses },
    { name: "橘 炎華", team: "紅蓮体育", isMyTeam: false, wins: rival1Standing.wins, losses: rival1Standing.losses },
    { name: "白銀 怜奈", team: "白百合", isMyTeam: false, wins: rival2Standing.wins, losses: rival2Standing.losses },
    { name: "高千穂 響", team: "帝都経済", isMyTeam: false, wins: rival3Standing.wins, losses: rival3Standing.losses },
    { name: "不動 巌", team: "富士見", isMyTeam: false, wins: rival4Standing.wins, losses: rival4Standing.losses },
  ].sort((a, b) => b.wins - a.wins || a.losses - b.losses);

  const PITCHING_RANKINGS: { title: string; unit: string; list: TitleRankEntry[] }[] = [
    {
      title: "最優秀防御率",
      unit: "",
      list: [
        { rank: 1, name: `${protoLastName}（あなた）`, team: "青葉女子大", isMyTeam: true, score: `${myAceERA}`, detail: `${myAceInnings}回 ${myAceER}自責点` },
        { rank: 2, name: "白銀 怜奈", team: "白百合", isMyTeam: false, score: "1.80", detail: `${playedMatches * 4}回 ${playedMatches}自責点` },
        { rank: 3, name: "橘 炎華", team: "紅蓮体育", isMyTeam: false, score: "2.10", detail: `${playedMatches * 4}回 ${playedMatches + 1}自責点` },
        { rank: 4, name: "高千穂 響", team: "帝都経済", isMyTeam: false, score: "2.80", detail: `${playedMatches * 4}回 ${playedMatches + 2}自責点` },
        { rank: 5, name: "不動 巌", team: "富士見", isMyTeam: false, score: "3.20", detail: `${playedMatches * 4}回 ${playedMatches + 2}自責点` },
      ],
    },
    {
      title: "最多奪三振",
      unit: "奪三振",
      list: [
        { rank: 1, name: `${protoLastName}（あなた）`, team: "青葉女子大", isMyTeam: true, score: `${myAceSO}個`, detail: `奪三振率 9.5` },
        { rank: 2, name: "橘 炎華", team: "紅蓮体育", isMyTeam: false, score: `${Math.max(2, playedMatches * 4)}個`, detail: `奪三振率 8.8` },
        { rank: 3, name: "白銀 怜奈", team: "白百合", isMyTeam: false, score: `${Math.max(1, playedMatches * 3)}個`, detail: `奪三振率 7.5` },
        { rank: 4, name: "高千穂 響", team: "帝都経済", isMyTeam: false, score: `${Math.max(1, playedMatches * 3 - 1)}個`, detail: `奪三振率 6.8` },
        { rank: 5, name: "不動 巌", team: "富士見", isMyTeam: false, score: `${Math.max(1, playedMatches * 2)}個`, detail: `奪三振率 6.0` },
      ],
    },
    {
      title: "最多勝利",
      unit: "勝",
      list: winRankPool.map((item, idx) => ({
        rank: idx + 1,
        name: item.name,
        team: item.team,
        isMyTeam: item.isMyTeam,
        score: `${item.wins}勝`,
        detail: `${item.wins}勝${item.losses}敗 勝率${(item.wins + item.losses > 0 ? (item.wins / (item.wins + item.losses)).toFixed(3).replace(/^0+/, "") : ".000")}`,
      })),
    },
  ];

  const getMatchCardBadgeText = () => {
    if (season === "SPRING") {
      const titles = ["学内紅白戦 A", "学内紅白戦 B", "全日本実業団選抜戦", "大学オールスター戦"];
      return `春季プレシーズン 第${team.current_round}戦（${titles[team.current_round - 1] || "オープン戦"}）`;
    }
    if (season === "SUMMER") {
      if (team.current_round === 4 || team.has_won_summer) return "アジア大学選手権（国際大会）";
      if (!team.has_lost_summer) {
        const stages = ["1回戦", "準決勝", "決勝戦"];
        return `全国大学トーナメント ${stages[team.current_round - 1] || `${team.current_round}回戦`}`;
      } else {
        return team.current_round === 2 
          ? "全国大学トーナメント 敗者復活戦（5〜8位決定戦）" 
          : "全国大学トーナメント 3位決定戦";
      }
    }
    if (team.current_round === 8 || team.has_won_autumn) {
      return "日米親善決戦（全米カレッジ選抜戦）";
    }
    return `秋季公式リーグ 第${team.current_round}節`;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans select-none p-3 md:p-6 pb-24">
      <div className="max-w-7xl mx-auto space-y-5">
        
        {/* トップヘッダー */}
        <div className="bg-white border border-slate-200/80 p-3.5 md:p-4 rounded-3xl shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black text-slate-900">
                  {team.team_name}
                </h1>
                <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md font-mono">
                  第{team.current_year}期生
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border font-mono ${
                  season === "SPRING"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : season === "SUMMER"
                    ? "bg-orange-50 text-orange-800 border-orange-300"
                    : "bg-blue-50 text-blue-800 border-blue-300"
                }`}>
                  {season === "SPRING" ? "🌸 春季シーズン" : season === "SUMMER" ? "🔥 夏季トーナメント" : "🍁 秋季公式リーグ"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold">
                {season === "SPRING"
                  ? `春季プレシーズン（第${team.current_round}/4戦） 新歓オープン戦 ＆ 適性テスト`
                  : season === "SUMMER"
                  ? team.has_lost_summer
                    ? `全国大学トーナメント（順位決定戦） 全国3位決定戦`
                    : `全国大学トーナメント（第${team.current_round}戦） 全国覇者決定戦`
                  : (team.current_round === 8 || team.has_won_autumn)
                  ? `日米親善大学野球選手権（全米カレッジ選抜戦） 世界頂上決戦`
                  : `6人制大学公式リーグ（現在 第${team.current_round}/7節）`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl flex items-center gap-2.5 shadow-inner">
              <span className="text-xs text-slate-500 font-bold">部費残高</span>
              <span className="text-xl font-mono font-black text-amber-700">
                {team.tp_funds.toLocaleString()} <span className="text-xs text-slate-600 font-normal">万円</span>
              </span>
            </div>

            <SoundToggle />

            <button
              onClick={() => setIsHelpOpen(true)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-700 transition"
              title="ルール・用語解説"
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </div>

        {/* メインエリア */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* 左側：部室 ＆ 主人公ナビゲーター */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="relative w-full h-[400px] md:h-[440px] rounded-3xl overflow-hidden shadow-xl border border-slate-300">
              <img
                src="/room.jpg"
                alt="野球部室"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent pointer-events-none" />

              <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                <span className="bg-slate-900/85 backdrop-blur-md text-amber-300 border border-amber-400/30 text-xs font-black px-3 py-1 rounded-xl shadow">
                  青葉女子大 野球部室
                </span>
                <button
                  onClick={() => setIsRankingOpen(true)}
                  className="bg-white/95 hover:bg-white text-slate-900 text-xs font-black px-3 py-1.5 rounded-xl shadow transition flex items-center gap-1.5 active:scale-95 border border-slate-200"
                >
                  <Award size={15} className="text-amber-600" /> 個人タイトルランキング (TOP 5)
                </button>
              </div>

              {/* 突発カフェお誘いバナー（部室内表示） */}
              {cafeInvite && (
                <div className="absolute top-4 right-4 z-10 animate-bounce duration-1000">
                  <Link
                    href="/cafe"
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-black px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 border-2 border-white transition active:scale-95"
                  >
                    <Coffee size={15} className="animate-spin duration-3000" />
                    <span>{cafeInvite.partnerName.split(" ")[0]} からお誘い！（無料）</span>
                  </Link>
                </div>
              )}

              {protagonist && (
                <div
                  onClick={() => setDialogueIndex((prev) => prev + 1)}
                  className="absolute bottom-0 left-2 md:left-6 w-56 md:w-64 h-[330px] md:h-[370px] cursor-pointer group transition-transform active:scale-95"
                  title="クリックして話しかける"
                >
                  <img
                    src={getPlayerAvatarUrl(protagonist)}
                    alt={protagonist.name}
                    className="w-full h-full object-cover object-top rounded-t-3xl drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)] border-t-2 border-x-2 border-white/60"
                  />
                  <div className="absolute bottom-2 inset-x-2 bg-slate-900/90 backdrop-blur-sm text-white py-1 px-2 rounded-xl text-center shadow border border-white/20">
                    <span className="text-[10px] font-black text-amber-400 block">
                      {isSecondGenOrLater ? `${aceGen}代目エース（主役）` : "新入生エース（あなた）"}
                    </span>
                    <span className="text-xs font-black truncate block">{protagonist.name}</span>
                  </div>
                </div>
              )}

              <div className="absolute bottom-5 right-4 left-60 md:left-72">
                <div
                  onClick={() => setDialogueIndex((prev) => prev + 1)}
                  className="bg-white/95 backdrop-blur-md border-2 border-amber-400/80 p-3.5 md:p-4 rounded-3xl shadow-2xl relative cursor-pointer hover:bg-white transition"
                >
                  <div className="flex items-center gap-1.5 text-amber-900 text-[10px] font-black uppercase tracking-wider mb-1">
                    <MessageSquare size={13} className="text-amber-600" /> タップで会話・アドバイス
                  </div>
                  <p className="text-xs md:text-sm font-black text-slate-900 leading-relaxed">
                    「{currentDialogue}」
                  </p>
                </div>
              </div>
            </div>

            {/* ミニ内野守備布陣バー */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-emerald-600" />
                <span className="text-xs font-black text-slate-900">現在のスタメン守備陣</span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {(["P", "C", "1B", "2B", "3B", "SS"] as PositionType[]).map((pos) => {
                  const pId = team.order.defense_positions[pos];
                  const p = getPlayer(pId);
                  return (
                    <div
                      key={pos}
                      onClick={() => p && setViewPlayer(p)}
                      className="flex items-center gap-1 bg-slate-50 border border-slate-200 hover:border-amber-400 px-2 py-1 rounded-xl cursor-pointer transition shrink-0"
                    >
                      <span className="bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.2 rounded font-mono">
                        {pos}
                      </span>
                      <span className="font-bold text-slate-800 text-[11px] truncate max-w-[50px]">
                        {p?.name.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Link
                href="/order"
                className="text-xs text-amber-700 hover:text-amber-800 font-black flex items-center gap-0.5 shrink-0"
              >
                オーダー変更 <ChevronRight size={14} />
              </Link>
            </div>

          </div>

          {/* 右側：次戦カード ＆ 季節別インテリジェント表示 */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="bg-amber-100 text-amber-900 text-[11px] font-black px-3 py-1 rounded-full border border-amber-300">
                  {getMatchCardBadgeText()}
                </span>
                <span className="text-xs text-slate-700 font-bold">5イニング制 / 5点差コールド</span>
              </div>

              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-slate-700 block">
                  {oppFeature}
                </span>
                <div className="text-xl font-black flex items-center justify-center gap-2 pt-1">
                  <span className="text-emerald-700">青葉女子大</span>
                  <span className="text-xs text-slate-600 font-normal">vs</span>
                  <span style={{ color: opponent.color }}>{opponent.name}</span>
                </div>
              </div>

              <Link
                href="/match"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-4 rounded-2xl shadow-xl transition active:scale-95 text-base flex items-center justify-center gap-2 block text-center"
              >
                <Play size={20} fill="currentColor" /> 試合を開始する（プレイボール）
              </Link>
            </div>

            {season === "SPRING" && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 md:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Sparkles size={15} className="text-emerald-600" /> 春季プレシーズン日程（全4試合）
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">新入生テスト ＆ 腕試し</span>
                </div>

                <div className="space-y-2 text-xs font-medium">
                  {[
                    { 
                      rnd: 1, 
                      title: "学内紅白戦 A", 
                      sub: "自軍(部員5名＋助っ人5名) vs 敵軍(仲間B 5名＋助っ人5名)", 
                      desc: "新歓紅白戦！ 仲間Bチームの実力を敵目線で体感" 
                    },
                    { 
                      rnd: 2, 
                      title: "学内紅白戦 B", 
                      sub: "敵味方シャッフル！ 自軍(部員6名) vs 敵軍(仲間A 4名＋助っ人6名)", 
                      desc: "スタメン争奪！ 仲間Aチームと真剣勝負" 
                    },
                    { 
                      rnd: 3, 
                      title: "全日本実業団選抜", 
                      sub: "大日本バイオ、サクラ重工などの企業選抜", 
                      desc: "大人の野球！ 勝利で特別スポンサー料" 
                    },
                    { 
                      rnd: 4, 
                      title: "六大学オールスター", 
                      sub: "ライバル7大学の看板選手ドリームチーム", 
                      desc: "春の集大成！ 秋のライバルお披露目" 
                    },
                  ].map((item) => {
                    const isDone = team.current_round > item.rnd;
                    const isCurrent = team.current_round === item.rnd;

                    return (
                      <div
                        key={item.rnd}
                        className={`p-2.5 rounded-2xl border flex items-center justify-between transition ${
                          isCurrent
                            ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400/50 shadow-sm"
                            : isDone
                            ? "bg-slate-50/70 border-slate-200 opacity-60"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-black text-xs ${
                            isDone
                              ? "bg-emerald-600 text-white"
                              : isCurrent
                              ? "bg-amber-600 text-white animate-pulse"
                              : "bg-slate-200 text-slate-600"
                          }`}>
                            {isDone ? <CheckCircle2 size={14} /> : item.rnd}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900">{item.title}</span>
                              {isCurrent && (
                                <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded">
                                  NEXT
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block">{item.sub}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 shrink-0">{item.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {season === "SUMMER" && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 md:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Flame size={15} className="text-orange-600" /> 全国大学トーナメント進捗
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">完全順位決定トーナメント</span>
                </div>

                <div className="space-y-2 text-xs font-medium">
                  {summerSchedule.map((item) => {
                    const isDone = team.current_round > item.rnd;
                    const isCurrent = team.current_round === item.rnd;

                    return (
                      <div
                        key={item.rnd}
                        className={`p-2.5 rounded-2xl border flex items-center justify-between transition ${
                          isCurrent
                            ? "bg-orange-50 border-orange-400 ring-2 ring-orange-400/50 shadow-sm"
                            : isDone
                            ? "bg-slate-50/70 border-slate-200 opacity-60"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-black text-xs ${
                            isDone
                              ? "bg-emerald-600 text-white"
                              : isCurrent
                              ? "bg-orange-600 text-white animate-pulse"
                              : "bg-slate-200 text-slate-600"
                          }`}>
                            {isDone ? <CheckCircle2 size={14} /> : item.rnd}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900">{item.title}</span>
                              <span className="text-[10px] text-slate-500">vs {item.opp}</span>
                              {isCurrent && (
                                <span className="bg-orange-500 text-white font-black text-[9px] px-1.5 py-0.2 rounded">
                                  NOW
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block">{item.desc}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {season === "AUTUMN" && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 md:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Trophy size={15} className="text-amber-600" /> 秋季公式リーグ順位表
                  </h3>
                  <span className="text-[10px] text-slate-700 font-mono font-bold">勝点制（勝2/分1）</span>
                </div>

                {(team.current_round === 8 || team.has_won_autumn) && (
                  <div className="bg-blue-900 text-white p-2.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md animate-pulse">
                    <span className="flex items-center gap-1.5">
                      <Crown size={15} className="text-amber-400" /> 秋季リーグ制覇！ 優勝特典【日米親善決戦】進出中！
                    </span>
                    <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black">
                      USA戦
                    </span>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse text-xs">
                    <thead>
                      <tr className="text-slate-700 font-mono font-bold border-b border-slate-100">
                        <th className="py-1 text-left px-2">順</th>
                        <th className="text-left px-2">大学名</th>
                        <th className="w-8">勝</th>
                        <th className="w-8">負</th>
                        <th className="w-8">分</th>
                        <th className="w-10">得失</th>
                        <th className="w-10 font-black text-slate-900">勝点</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono divide-y divide-slate-100">
                      {league.standings.map((s, idx) => {
                        const isMe = s.teamId === 0;
                        return (
                          <tr key={s.teamId} className={isMe ? "bg-amber-50/80 font-black text-amber-950" : "text-slate-800"}>
                            <td className="py-2 px-2 text-left font-black">{idx + 1}</td>
                            <td className="px-2 text-left font-sans font-bold truncate max-w-[100px]">
                              {s.teamName}
                            </td>
                            <td>{s.wins}</td>
                            <td>{s.losses}</td>
                            <td>{s.draws}</td>
                            <td>{s.diff > 0 ? `+${s.diff}` : s.diff}</td>
                            <td className="font-black text-amber-800">{s.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* 下部メニュー（3大コマンド） */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          <Link
            href="/training"
            className="bg-white border border-slate-200/80 hover:border-amber-400 p-4 rounded-3xl shadow-sm transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center group-hover:scale-105 transition shadow-sm shrink-0">
                <Dumbbell size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-700 transition truncate">
                  全体練習・特訓合宿
                </h3>
                <p className="text-[11px] text-slate-600 font-bold mt-0.5 truncate">
                  方針別の底上げ ＆ 特訓合宿で大成功とスキル覚醒
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400 group-hover:text-amber-700 transition shrink-0 ml-1" />
          </Link>

          <Link
            href="/cafe"
            className={`border p-4 rounded-3xl shadow-sm transition flex items-center justify-between group relative overflow-hidden ${
              cafeInvite
                ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/60"
                : "bg-white border-slate-200/80 hover:border-amber-400"
            }`}
          >
            {cafeInvite && (
              <span className="absolute top-2 right-2 bg-amber-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                お誘い中 (無料)
              </span>
            )}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center group-hover:scale-105 transition shadow-sm shrink-0">
                <Coffee size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 group-hover:text-orange-600 transition truncate flex items-center gap-1.5">
                  放課後カフェ
                  <span className="text-[9px] text-orange-700 bg-orange-100 px-1.5 py-0.2 rounded font-mono font-bold">1節1回</span>
                </h3>
                <p className="text-[11px] text-slate-600 font-bold mt-0.5 truncate">
                  {cafeInvite ? `${cafeInvite.partnerName.split(" ")[0]} とお茶して能力UP！` : "スタミナ上限UP ＆ 新ポジション適性を開拓"}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400 group-hover:text-orange-600 transition shrink-0 ml-1" />
          </Link>

          <Link
            href="/facilities"
            className="bg-white border border-slate-200/80 hover:border-emerald-400 p-4 rounded-3xl shadow-sm transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition shadow-sm shrink-0">
                <Building2 size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition truncate">
                  グラウンド整備・設備
                </h3>
                <p className="text-[11px] text-slate-600 font-bold mt-0.5 truncate">
                  部費を投じて本拠地を発展 ＆ 永続パッシブバフ
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-700 transition shrink-0 ml-1" />
          </Link>

        </div>

      </div>

      {/* 個人タイトルランキング モーダル */}
      {isRankingOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in select-none">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 md:p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[90vh] flex flex-col justify-between">
            
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Award size={22} className="text-amber-600" />
                  <div>
                    <h3 className="text-base md:text-lg font-black text-slate-900">
                      大学公式リーグ 個人タイトル争い（TOP 5）
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">
                      現在 リーグ第{team.current_round}節（消化 {myStanding.wins + myStanding.losses + myStanding.draws}試合）時点
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsRankingOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3">
                <button
                  onClick={() => setRankingTab("BATTER")}
                  className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                    rankingTab === "BATTER"
                      ? "bg-amber-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Flame size={15} /> 打撃タイトル（打率・本塁打・打点）
                </button>
                <button
                  onClick={() => setRankingTab("PITCHER")}
                  className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                    rankingTab === "PITCHER"
                      ? "bg-amber-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Gauge size={15} /> 投手タイトル（防御率・奪三振・勝利数）
                </button>
              </div>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 py-1 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(rankingTab === "BATTER" ? BATTING_RANKINGS : PITCHING_RANKINGS).map((category) => (
                  <div key={category.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                    <span className="text-xs font-black text-slate-900 border-b border-slate-200 pb-1 block">
                      {category.title}
                    </span>

                    <div className="space-y-1.5 text-xs">
                      {category.list.map((entry) => (
                        <div
                          key={entry.rank}
                          className={`p-2 rounded-xl border flex items-center justify-between font-mono transition ${
                            entry.isMyTeam
                              ? "bg-amber-100/80 border-amber-300 font-black text-amber-950 shadow-sm"
                              : "bg-white border-slate-200 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-4 text-center font-black shrink-0">
                              {entry.rank === 1 ? (
                                <Crown size={14} className="text-amber-600 inline" />
                              ) : (
                                `${entry.rank}`
                              )}
                            </span>
                            <div className="truncate">
                              <span className="font-sans font-bold block truncate max-w-[85px]">
                                {entry.name}
                              </span>
                              <span className="text-[9px] text-slate-500 font-sans block">
                                {entry.team}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-black text-slate-900 block">{entry.score}</span>
                            <span className="text-[9px] text-slate-500 block">{entry.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-bold">
                ※黄色ハイライトは青葉女子大学の選手です
              </span>
              <button
                onClick={() => setIsRankingOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-2 rounded-xl text-xs transition"
              >
                部室へ戻る
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ルール心得モーダル */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <HelpCircle size={20} className="text-amber-600" /> ゲームの基本ルール・心得
            </h3>
            <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed max-h-72 overflow-y-auto pr-1">
              <p>・<strong>年間4シーズン制</strong>：春（プレシーズン4戦） ➔ 夏（全国トーナメント3戦＋アジア戦） ➔ 秋（公式リーグ7節＋全米決戦） ➔ 冬（世代交代・ドラフト）のサイクルで進行します。</p>
              <p>・<strong>放課後カフェ</strong>：1節に1回、仲間とお茶をしてスタミナや守備適性を強化できます。たまに部員から無料のお誘いが来ることも！</p>
              <p>・<strong>6人制野球</strong>：投手・捕手・一塁・二塁・三塁・遊撃の6名で守り、外野手はいません。抜けた打球は長打になります。</p>
              <p>・<strong>学内紅白戦（春季第1・2戦）</strong>：自チームの部員を2組に分け、文化部助っ人を交えて対戦！ 敵味方を入れ替えながら全員の適性を把握できます。</p>
              <p>・<strong>盗塁（スチール）システム</strong>：走力75以上の選手は、性格に応じた確率で自動スタート！ 捕手の肩力との勝負になります。</p>
              <p>・<strong>打順スロット固定</strong>：選手は最初に打席へ入った打順の席（1〜6番）に固定されます。別の打順へ入ることはできません。</p>
              <p>・<strong>フットサル式交代</strong>：試合中は何度でもベンチへ交代できます。ベンチで休んだ選手はイニング終了時にスタミナが全快します。</p>
              <p>・<strong>5点差コールド ＆ 5回表終了ゲームセット</strong>：5点差がついた時点で試合終了。また5回表終了時に後攻がリードしている場合、裏を行わずに即時終了（X表示）となります。</p>
            </div>
            <button
              onClick={() => setIsHelpOpen(false)}
              className="w-full bg-slate-900 text-white font-black py-3 rounded-2xl text-xs"
            >
              理解した
            </button>
          </div>
        </div>
      )}

      {viewPlayer && (
        <PlayerCardModal player={viewPlayer} onClose={() => setViewPlayer(null)} />
      )}

    </div>
  );
}