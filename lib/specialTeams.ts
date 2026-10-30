// lib/specialTeams.ts
import { Player, LeagueTeam, UserTeam, TeamOrder, PositionType } from "@/types/baseball";
import { OPPONENT_UNIVERSITIES } from "@/lib/league";
import { ASIA_PLAYERS, generateTeamOrder } from "@/lib/draft";

// ==========================================
// 1. 文化部助っ人選手マスター（10名）
//    各組の不足枠を埋める個性豊かな学内助っ人
// ==========================================
export const CULTURE_CLUB_PLAYERS: Record<string, Player> = {
  // ① 料理部：中華鍋で鍛えた手首と無尽蔵のスタミナ
  COOKING: {
    id: 801,
    name: "料理部・早乙女みちる",
    main_position: "C",
    grade: 2,
    batting_hand: "R",
    image_url: "/901.jpg",
    contact: 76, power: 60, speed: 64, arm: 72, fielding: 74,
    pitch_speed: 55, control: 55, stamina: 95,
    personality: "努力家",
    nickname: "フライパンの魔術師",
    description: "毎日の中華鍋煽りで鍛え抜かれた無尽蔵のスタミナとリスト。バントと右打ちの名手。",
  },
  // ② マンガ部：Gペンの軌道をボールに再現する魔球の使い手
  MANGA: {
    id: 802,
    name: "マンガ部・神代コミック",
    main_position: "P",
    grade: 2,
    batting_hand: "L",
    image_url: "/901.jpg",
    contact: 68, power: 50, speed: 42, arm: 68, fielding: 64,
    pitch_speed: 65, control: 84, stamina: 60, breaking_ball: 88,
    personality: "お調子者",
    nickname: "締め切り直前の魔術師",
    description: "締め切り直前の超集中力でストライクゾーンの四隅を突く技巧派。",
  },
  // ③ 服飾部：ミシンのステップワークで内野安打量産
  SEWING: {
    id: 803,
    name: "服飾部・針生ミシン",
    main_position: "2B",
    grade: 1,
    batting_hand: "L",
    image_url: "/901.jpg",
    contact: 66, power: 45, speed: 88, arm: 64, fielding: 78,
    pitch_speed: 50, control: 50,
    personality: "マイペース",
    nickname: "ダイヤモンドの仕立て屋",
    description: "ミシンを踏む精密なステップで内野安打を量産する俊足ガール。",
  },
  // ④ 囲碁部：相手打者の配球と打球方向を数十手先まで読み切る頭脳派
  IGO: {
    id: 804,
    name: "囲碁部・九段盤子",
    main_position: "3B",
    grade: 3,
    batting_hand: "R",
    image_url: "/901.jpg",
    contact: 80, power: 52, speed: 56, arm: 76, fielding: 86,
    pitch_speed: 55, control: 65,
    personality: "頭脳派",
    nickname: "全局を見通す定石",
    description: "数手先を読んだポジショニングで打球を正面でさばくインテリジェンス。",
  },
  // ⑤ 天文部：夜空の観測で鍛えた広角視野と正確なスローイング
  ASTRONOMY: {
    id: 805,
    name: "天文部・星野ステラ",
    main_position: "SS",
    grade: 2,
    batting_hand: "R",
    image_url: "/901.jpg",
    contact: 72, power: 55, speed: 78, arm: 82, fielding: 80,
    pitch_speed: 50, control: 50,
    personality: "クール",
    nickname: "銀河のパトロール",
    description: "望遠鏡の精密なアングル調整が生む正確な送球が武器。",
  },
  // ⑥ 演劇部：舞台で鍛えた発声と全身を使った豪快なフルスイング
  DRAMA: {
    id: 806,
    name: "演劇部・舞台カレン",
    main_position: "1B",
    grade: 3,
    batting_hand: "R",
    image_url: "/901.jpg",
    contact: 65, power: 84, speed: 58, arm: 70, fielding: 68,
    pitch_speed: 50, control: 50,
    personality: "熱血",
    nickname: "劇場のダイナマイト",
    description: "大舞台で培った度胸とパンチ力でスタンドインを狙う長距離砲。",
  },
  // ⑦ 茶道部：静寂の中で培った動体視力とブレない下半身
  TEA: {
    id: 807,
    name: "茶道部・千利休子",
    main_position: "C",
    grade: 1,
    batting_hand: "R",
    image_url: "/901.jpg",
    contact: 74, power: 58, speed: 60, arm: 76, fielding: 82,
    pitch_speed: 50, control: 50,
    personality: "努力家",
    nickname: "静寂の司令塔",
    description: "正座で鍛え上げた強靭な体幹でワンバウンド投球を後逸しない堅実捕手。",
  },
  // ⑧ 軽音部：ドラムのリズムキープで球速以上の伸びを放つ
  BAND: {
    id: 808,
    name: "軽音部・弦巻ロック",
    main_position: "3B",
    grade: 2,
    batting_hand: "L",
    image_url: "/901.jpg",
    contact: 70, power: 76, speed: 72, arm: 78, fielding: 70,
    pitch_speed: 55, control: 50,
    personality: "お調子者",
    nickname: "ビートスラッガー",
    description: "抜群のリズム感で変化球を芯で捉えるクラッチヒッター。",
  },
  // ⑨ 写真部：決定的な一瞬を逃さない超高速クイックモーション
  PHOTO: {
    id: 809,
    name: "写真部・影山シャッター",
    main_position: "P",
    grade: 2,
    batting_hand: "R",
    image_url: "/901.jpg",
    contact: 58, power: 48, speed: 66, arm: 76, fielding: 74,
    pitch_speed: 74, control: 78, stamina: 72, breaking_ball: 80,
    personality: "クール",
    nickname: "一瞬のファインダー",
    description: "球離れが見えにくい独特のフォームから切れ味鋭いスライダーを投じる。",
  },
  // ⑩ 文芸部：相手投手の配球傾向を完全に読み切る選球眼
  NOVEL: {
    id: 810,
    name: "文芸部・栞野ノベル",
    main_position: "SS",
    grade: 3,
    batting_hand: "L",
    image_url: "/901.jpg",
    contact: 78, power: 50, speed: 70, arm: 68, fielding: 76,
    pitch_speed: 50, control: 50,
    personality: "頭脳派",
    nickname: "行間を読む選球眼",
    description: "膨大なデータをインプットし、カウントごとの球種をズバリ予測する。",
  },
};

// 助っ人リスト（前半5名・後半5名）
const HELPERS_FIRST_HALF = [
  CULTURE_CLUB_PLAYERS.COOKING,
  CULTURE_CLUB_PLAYERS.MANGA,
  CULTURE_CLUB_PLAYERS.SEWING,
  CULTURE_CLUB_PLAYERS.IGO,
  CULTURE_CLUB_PLAYERS.ASTRONOMY,
];

const HELPERS_SECOND_HALF = [
  CULTURE_CLUB_PLAYERS.DRAMA,
  CULTURE_CLUB_PLAYERS.TEA,
  CULTURE_CLUB_PLAYERS.BAND,
  CULTURE_CLUB_PLAYERS.PHOTO,
  CULTURE_CLUB_PLAYERS.NOVEL,
];

/**
 * 青葉部員10名を「主人公」「仲間A(4名)」「仲間B(5名)」に分割するヘルパー
 */
export function splitAobaMembers(userTeam: UserTeam) {
  const proto = userTeam.players.find((p) => p.is_protagonist) || userTeam.players[0];
  const teammates = userTeam.players.filter((p) => p.id !== proto.id);
  const half = Math.floor(teammates.length / 2);
  const groupA = teammates.slice(0, half); // 4名
  const groupB = teammates.slice(half);    // 5名
  return { proto, groupA, groupB };
}

// ==========================================
// 2. 春 第1戦：学内紅白戦 A
// ==========================================
/**
 * 第1戦 敵軍（青葉・白組A）
 * 仲間B(5名) ＋ 助っ人後半5名 ＝ 計10名（スタメン6名 / ベンチ4名）
 */
export function getScrimmageTeamA(userTeam: UserTeam): LeagueTeam {
  const { groupB } = splitAobaMembers(userTeam);
  const oppRoster: Player[] = [...groupB, ...HELPERS_SECOND_HALF];
  const order = generateTeamOrder(oppRoster);

  return {
    id: 881,
    name: "青葉女子大学・白組（春季紅白戦A）",
    shortName: "青葉・白組",
    initial: "白",
    color: "#2563eb",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "新歓紅白戦第1弾！ 仲間Bチーム（5名）＋文化部助っ人との真剣テストマッチ",
    feature: "普段は味方の部員が敵として登場！ 相手目線で仲間の実力を肌で体感しよう",
    strength: { pitch: 72, contact: 74, power: 68, speed: 70, defense: 74 },
    players: oppRoster,
    order,
  };
}

/**
 * 第1戦 自軍操作ロスター（青葉・紅組A）
 * 主人公(1名) ＋ 仲間A(4名) ＋ 助っ人前半5名 ＝ 計10名（部員5名スタメン＋助っ人1名／ベンチ助っ人4名）
 */
export function getScrimmageUserTeamA(userTeam: UserTeam): { players: Player[]; order: TeamOrder } {
  const { proto, groupA } = splitAobaMembers(userTeam);
  const roster: Player[] = [proto, ...groupA, ...HELPERS_FIRST_HALF];
  const order = generateTeamOrder(roster);
  return { players: roster, order };
}

// ==========================================
// 3. 春 第2戦：学内紅白戦 B（敵味方シャッフル）
// ==========================================
/**
 * 第2戦 敵軍（青葉・白組B）
 * 仲間A(4名) ＋ 助っ人6名 ＝ 計10名（部員4名スタメン＋助っ人2名／ベンチ助っ人4名）
 */
export function getScrimmageTeamB(userTeam: UserTeam): LeagueTeam {
  const { groupA } = splitAobaMembers(userTeam);
  // 助っ人6名（805〜810）
  const oppHelpers = [CULTURE_CLUB_PLAYERS.ASTRONOMY, ...HELPERS_SECOND_HALF];
  const oppRoster: Player[] = [...groupA, ...oppHelpers];
  const order = generateTeamOrder(oppRoster);

  return {
    id: 882,
    name: "青葉女子大学・白組（春季紅白戦B）",
    shortName: "青葉・白組",
    initial: "白",
    color: "#dc2626",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    desc: "新歓紅白戦第2弾！ 第1戦と敵味方をシャッフルしたスタメン争奪マッチ",
    feature: "第1戦で味方だった仲間Aが敵に回る！ 2試合で部員全員の実力を見極めよう",
    strength: { pitch: 74, contact: 76, power: 70, speed: 72, defense: 76 },
    players: oppRoster,
    order,
  };
}

/**
 * 第2戦 自軍操作ロスター（青葉・紅組B）
 * 主人公(1名) ＋ 仲間B(5名) ＋ 助っ人4名 ＝ 計10名（部員6名全員スタメン／ベンチ助っ人4名）
 */
export function getScrimmageUserTeamB(userTeam: UserTeam): { players: Player[]; order: TeamOrder } {
  const { proto, groupB } = splitAobaMembers(userTeam);
  const helpers4 = HELPERS_FIRST_HALF.slice(0, 4);
  const roster: Player[] = [proto, ...groupB, ...helpers4];
  const order = generateTeamOrder(roster);
  return { players: roster, order };
}

// ==========================================
// 4. 春 第3戦：全日本実業団オールスターズ
// ==========================================
export function getCorporateAllStars(): LeagueTeam {
  const corporatePlayers: Player[] = [
    {
      id: 811,
      name: "帝都トランスポート",
      main_position: "SS",
      grade: 4,
      batting_hand: "L",
      image_url: "/901.jpg",
      contact: 78, power: 58, speed: 92, arm: 76, fielding: 84,
      pitch_speed: 60, control: 55,
      personality: "熱血",
      nickname: "特急ダイヤのリードオフマン",
    },
    {
      id: 812,
      name: "大和精密工業",
      main_position: "2B",
      grade: 4,
      batting_hand: "R",
      image_url: "/901.jpg",
      contact: 80, power: 54, speed: 75, arm: 74, fielding: 88,
      pitch_speed: 55, control: 55,
      personality: "努力家",
      nickname: "1ミリの狂いもない職人守備",
    },
    {
      id: 813,
      name: "大日本バイオ製薬",
      main_position: "1B",
      grade: 4,
      batting_hand: "L",
      image_url: "/901.jpg",
      contact: 84, power: 86, speed: 64, arm: 75, fielding: 78,
      pitch_speed: 60, control: 55,
      personality: "頭脳派",
      nickname: "劇薬クリーンナップ",
    },
    {
      id: 814,
      name: "サクラ重工",
      main_position: "3B",
      grade: 4,
      batting_hand: "R",
      image_url: "/901.jpg",
      contact: 72, power: 94, speed: 58, arm: 82, fielding: 72,
      pitch_speed: 60, control: 50,
      personality: "お調子者",
      nickname: "鋼鉄の放物線スラッガー",
    },
    {
      id: 815,
      name: "東洋ロジスティクス",
      main_position: "C",
      grade: 4,
      batting_hand: "R",
      image_url: "/901.jpg",
      contact: 70, power: 74, speed: 58, arm: 88, fielding: 86,
      pitch_speed: 60, control: 55,
      personality: "クール",
      nickname: "鉄壁の配送レーザービーム",
    },
    {
      id: 816,
      name: "ニッポンフライト航空",
      main_position: "P",
      grade: 4,
      batting_hand: "R",
      image_url: "/901.jpg",
      contact: 62, power: 55, speed: 65, arm: 84, fielding: 78,
      pitch_speed: 80, control: 86, stamina: 85, breaking_ball: 82,
      personality: "クール",
      nickname: "音速のキャプテンエース",
    },
    {
      id: 817,
      name: "セントラル商事",
      main_position: "1B",
      grade: 4,
      batting_hand: "R",
      image_url: "/901.jpg",
      contact: 74, power: 76, speed: 76, arm: 74, fielding: 72,
      pitch_speed: 55, control: 55,
    },
    {
      id: 818,
      name: "ベイサイド化学",
      main_position: "P",
      grade: 4,
      batting_hand: "L",
      image_url: "/901.jpg",
      contact: 58, power: 50, speed: 60, arm: 72, fielding: 74,
      pitch_speed: 72, control: 82, stamina: 75, breaking_ball: 88,
    },
  ];

  const order = generateTeamOrder(corporatePlayers);

  return {
    id: 883,
    name: "全日本実業団オールスターズ",
    shortName: "実業団選抜",
    initial: "企",
    color: "#0f766e",
    badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
    desc: "社会人女子野球の最高峰！ 洗練された大人の技とパワーを誇る企業選抜チーム",
    feature: "実業団のエリート選手が集結。勝利すれば高額の部費スポンサー料を獲得！",
    strength: { pitch: 84, contact: 82, power: 86, speed: 78, defense: 85 },
    players: corporatePlayers,
    order,
  };
}

// ==========================================
// 5. 春 第4戦：六大学カレッジ・オールスターズ
// ==========================================
export function getCollegeAllStars(savedOpponents?: LeagueTeam[]): LeagueTeam {
  const baseTeams = savedOpponents && savedOpponents.length > 0 ? savedOpponents : OPPONENT_UNIVERSITIES;
  const allStarPlayers: Player[] = [];

  baseTeams.forEach((t) => {
    const star = t.players?.find((p) => p.main_position === "P") || t.players?.[0];
    if (star) allStarPlayers.push(star);
    const cleanup = t.players?.find((p) => (p.power ?? 0) >= 80 && p.id !== star?.id);
    if (cleanup && allStarPlayers.length < 10) allStarPlayers.push(cleanup);
  });

  const selected = allStarPlayers.slice(0, 8);
  const order = generateTeamOrder(selected);

  return {
    id: 884,
    name: "六大学カレッジ・オールスターズ",
    shortName: "大学選抜",
    initial: "星",
    color: "#7c3aed",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "ライバル7校の看板選手が集結！ 大学女子野球選抜ドリームチーム",
    feature: "紅蓮の剛腕、白百合の鉄壁守備、黒潮の韋駄天が一つになった最強軍団！",
    strength: { pitch: 86, contact: 84, power: 88, speed: 82, defense: 86 },
    players: selected,
    order,
  };
}

// ==========================================
// 6. 夏 優勝特典：アジア大学選抜（Asia All-Stars）
// ==========================================
export function getAsiaAllStars(): LeagueTeam {
  const asiaRoster = [...ASIA_PLAYERS];
  const order = generateTeamOrder(asiaRoster);

  return {
    id: 885,
    name: "アジア大学選抜（Asia All-Stars）",
    shortName: "アジア選抜",
    initial: "亜",
    color: "#ea580c",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
    desc: "アジア大学選手権王者！ 各国のスーパースターが集結した国際選抜",
    feature: "夏の全国トーナメント覇者だけが挑める国際決戦！ 翌春ドラフトの予習にも！",
    strength: { pitch: 88, contact: 85, power: 86, speed: 84, defense: 84 },
    players: asiaRoster,
    order,
  };
}

// ==========================================
// 7. 春の4試合取得ヘルパー関数
// ==========================================
export function getSpringPreSeasonOpponent(
  springRound: number,
  userTeam: UserTeam,
  savedOpponents?: LeagueTeam[]
): LeagueTeam {
  switch (springRound) {
    case 1:
      return getScrimmageTeamA(userTeam);
    case 2:
      return getScrimmageTeamB(userTeam);
    case 3:
      return getCorporateAllStars();
    case 4:
    default:
      return getCollegeAllStars(savedOpponents);
  }
}

// ==========================================
// 8. 秋 リーグ優勝特典：全米カレッジ選抜（USA All-Stars）
//    ID 256〜265 の米国スーパースター軍団
// ==========================================
export const USA_PLAYERS: Player[] = [
  {
    id: 256,
    name: "ジェシカ・ミラー",
    main_position: "P",
    grade: 3,
    batting_hand: "R",
    image_url: "/256.jpg",
    contact: 74, power: 80, speed: 76, arm: 92, fielding: 84,
    pitch_speed: 92,
    control: 82, stamina: 90, breaking_ball: 86,
    personality: "熱血",
    nickname: "カリフォルニア・エクスプレス",
    description: "全米最速を誇る剛腕エース。打撃でも鋭い打球を連発する投打の二刀流。",
  },
  {
    id: 257,
    name: "エミリー・クラーク",
    main_position: "C",
    grade: 4,
    batting_hand: "R",
    image_url: "/257.jpg",
    contact: 80, power: 86, speed: 64, arm: 94, fielding: 90,
    pitch_speed: 60, control: 55,
    personality: "頭脳派",
    nickname: "全米No.1コマンダー",
    description: "強肩強打の司令塔。盗塁を一切許さないレーザービーム送球と的確なリードが武器。",
  },
  {
    id: 258,
    name: "アシュリー・スミス",
    main_position: "1B",
    grade: 4,
    batting_hand: "L",
    image_url: "/258.jpg",
    contact: 78, power: 96, speed: 58, arm: 82, fielding: 78,
    pitch_speed: 55, control: 50,
    personality: "お調子者",
    nickname: "テキサス・モンスター",
    description: "全米大学屈指のスラッガー。芯で捉えた打球はすべて場外へと消え去る。",
  },
  {
    id: 259,
    name: "クロエ・ジョンソン",
    main_position: "2B",
    grade: 2,
    batting_hand: "R",
    image_url: "/259.jpg",
    contact: 86, power: 68, speed: 84, arm: 80, fielding: 92,
    pitch_speed: 50, control: 50,
    personality: "クール",
    nickname: "ダイヤモンドの芸術家",
    description: "華麗なグラブ捌きと正確無比なミート力。守備範囲の広さは全米屈指。",
  },
  {
    id: 260,
    name: "マディソン・ウィリアムズ",
    main_position: "3B",
    grade: 3,
    batting_hand: "R",
    image_url: "/260.jpg",
    contact: 82, power: 88, speed: 72, arm: 88, fielding: 84,
    pitch_speed: 60, control: 55,
    personality: "努力家",
    nickname: "鉄壁のホットコーナー",
    description: "強烈なライナーを軽々とさばき、得点圏では確実にランナーを還す勝負師。",
  },
  {
    id: 261,
    name: "サマンサ・テイラー",
    main_position: "SS",
    grade: 4,
    batting_hand: "L",
    image_url: "/261.jpg",
    contact: 88, power: 76, speed: 94, arm: 86, fielding: 94,
    pitch_speed: 60, control: 55,
    personality: "熱血",
    nickname: "全米カレッジキャプテン",
    description: "走攻守すべてが超一流の主将。高い出塁率と俊足でチームを勝利に導く。",
  },
  {
    id: 262,
    name: "オリビア・ブラウン",
    main_position: "P",
    grade: 2,
    batting_hand: "L",
    image_url: "/262.jpg",
    contact: 65, power: 70, speed: 68, arm: 85, fielding: 80,
    pitch_speed: 86, control: 88, stamina: 82, breaking_ball: 92,
    personality: "クール",
    nickname: "サウスポー・ドクターK",
    description: "鋭いスクリューとスライダーで三振の山を築く強力リリーフサウスポー。",
  },
  {
    id: 263,
    name: "ソフィア・デイビス",
    main_position: "1B",
    grade: 3,
    batting_hand: "R",
    image_url: "/263.jpg",
    contact: 76, power: 92, speed: 60, arm: 76, fielding: 74,
    pitch_speed: 50, control: 50,
    personality: "マイペース",
    nickname: "全米代打の切り札",
  },
  {
    id: 264,
    name: "アバ・ウィルソン",
    main_position: "SS",
    grade: 1,
    batting_hand: "L",
    image_url: "/264.jpg",
    contact: 80, power: 58, speed: 96, arm: 78, fielding: 86,
    pitch_speed: 50, control: 50,
    personality: "お調子者",
    nickname: "スピードスター",
  },
  {
    id: 265,
    name: "イザベラ・トーマス",
    main_position: "C",
    grade: 2,
    batting_hand: "R",
    image_url: "/265.jpg",
    contact: 75, power: 80, speed: 66, arm: 86, fielding: 86,
    pitch_speed: 55, control: 50,
    personality: "努力家",
    nickname: "万能サブ捕手",
  },
];

export function getUsaAllStars(): LeagueTeam {
  const usaRoster = [...USA_PLAYERS];
  const order = generateTeamOrder(usaRoster);

  return {
    id: 886,
    name: "全米カレッジ選抜（USA All-Stars）",
    shortName: "全米選抜",
    initial: "米",
    color: "#1e3a8a",
    badgeColor: "bg-blue-900 text-white border-blue-700",
    desc: "全米大学女子野球の頂点！ メジャー級の体格とパワーを誇る世界最強軍団",
    feature: "秋季リーグ制覇の王者のみが挑める世界最高峰マッチ！ 勝利で伝説へ！",
    strength: { pitch: 92, contact: 88, power: 94, speed: 86, defense: 90 },
    players: usaRoster,
    order,
  };
}