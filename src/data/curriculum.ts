import type { KnowledgePoint, Subject, University } from "../types";

export const SUBJECTS: Subject[] = [
  { id: "math1a", name: "数学I・A", color: "#5b8def" },
  { id: "english", name: "英語（文法）", color: "#e0685f" },
  { id: "chem", name: "化学基礎", color: "#4bb98f" },
];

/**
 * 知識観点マスタ。
 * weight は頻出度（1: たまに 〜 3: 頻出）。ペース計算の重みになる。
 * prereqIds が観点の依存関係で、マップの1本道の順序をそのまま決める。
 */
export const POINTS: KnowledgePoint[] = [
  // ---------- 数学I・A ----------
  {
    id: "m-expand",
    subjectId: "math1a",
    unit: "数と式",
    name: "展開の公式",
    prereqIds: [],
    weight: 2,
    questions: [
      { id: "m-expand-1", prompt: "(x + 3)(x − 5) を展開せよ", answer: "x² − 2x − 15" },
      { id: "m-expand-2", prompt: "(2x − 1)² を展開せよ", answer: "4x² − 4x + 1" },
      { id: "m-expand-3", prompt: "(a + b)(a − b) を展開せよ", answer: "a² − b²" },
    ],
  },
  {
    id: "m-factor",
    subjectId: "math1a",
    unit: "数と式",
    name: "因数分解（たすきがけ）",
    prereqIds: ["m-expand"],
    weight: 3,
    questions: [
      { id: "m-factor-1", prompt: "2x² + 5x + 3 を因数分解せよ", answer: "(x + 1)(2x + 3)" },
      { id: "m-factor-2", prompt: "x² − 7x + 12 を因数分解せよ", answer: "(x − 3)(x − 4)" },
      { id: "m-factor-3", prompt: "3x² − 10x − 8 を因数分解せよ", answer: "(3x + 2)(x − 4)" },
    ],
  },
  {
    id: "m-sqrt",
    subjectId: "math1a",
    unit: "数と式",
    name: "平方根の有理化",
    prereqIds: ["m-expand"],
    weight: 2,
    questions: [
      { id: "m-sqrt-1", prompt: "1 / (√3 − 1) を有理化せよ", answer: "(√3 + 1) / 2" },
      { id: "m-sqrt-2", prompt: "√12 − √27 を簡単にせよ", answer: "−√3（2√3 − 3√3）" },
    ],
  },
  {
    id: "m-ineq",
    subjectId: "math1a",
    unit: "数と式",
    name: "1次不等式と絶対値",
    prereqIds: ["m-expand"],
    weight: 2,
    questions: [
      { id: "m-ineq-1", prompt: "|x − 2| < 5 を解け", answer: "−3 < x < 7" },
      { id: "m-ineq-2", prompt: "−3x + 1 ≧ 7 を解け", answer: "x ≦ −2（両辺を負で割るので不等号が反転）" },
    ],
  },
  {
    id: "m-quad-graph",
    subjectId: "math1a",
    unit: "二次関数",
    name: "平方完成と頂点",
    prereqIds: ["m-factor"],
    weight: 3,
    questions: [
      { id: "m-quad-graph-1", prompt: "y = x² − 6x + 5 の頂点を求めよ", answer: "(3, −4)　y = (x − 3)² − 4" },
      { id: "m-quad-graph-2", prompt: "y = 2x² + 8x + 3 の頂点を求めよ", answer: "(−2, −5)　y = 2(x + 2)² − 5" },
    ],
  },
  {
    id: "m-quad-solve",
    subjectId: "math1a",
    unit: "二次関数",
    name: "解の公式と判別式",
    prereqIds: ["m-quad-graph", "m-sqrt"],
    weight: 3,
    questions: [
      { id: "m-quad-solve-1", prompt: "x² − 3x + 1 = 0 を解け", answer: "x = (3 ± √5) / 2" },
      { id: "m-quad-solve-2", prompt: "x² + kx + 4 = 0 が重解をもつ k を求めよ", answer: "k = ±4（D = k² − 16 = 0）" },
    ],
  },
  {
    id: "m-quad-ineq",
    subjectId: "math1a",
    unit: "二次関数",
    name: "二次不等式",
    prereqIds: ["m-quad-solve", "m-ineq"],
    weight: 3,
    questions: [
      { id: "m-quad-ineq-1", prompt: "x² − 5x + 6 > 0 を解け", answer: "x < 2 または x > 3" },
      { id: "m-quad-ineq-2", prompt: "x² − 4x ≦ 0 を解け", answer: "0 ≦ x ≦ 4" },
    ],
  },
  {
    id: "m-trig-ratio",
    subjectId: "math1a",
    unit: "図形と計量",
    name: "三角比の定義と相互関係",
    prereqIds: ["m-sqrt"],
    weight: 2,
    questions: [
      { id: "m-trig-ratio-1", prompt: "sin²θ + cos²θ = ? ", answer: "1" },
      { id: "m-trig-ratio-2", prompt: "cos150° の値は？", answer: "−√3 / 2" },
    ],
  },
  {
    id: "m-sine-law",
    subjectId: "math1a",
    unit: "図形と計量",
    name: "正弦定理",
    prereqIds: ["m-trig-ratio"],
    weight: 3,
    questions: [
      { id: "m-sine-law-1", prompt: "正弦定理の式を書け", answer: "a / sinA = b / sinB = c / sinC = 2R" },
      { id: "m-sine-law-2", prompt: "外接円の半径 R を求めたいとき使う定理は？", answer: "正弦定理（2R = a / sinA）" },
    ],
  },
  {
    id: "m-cosine-law",
    subjectId: "math1a",
    unit: "図形と計量",
    name: "余弦定理",
    prereqIds: ["m-trig-ratio"],
    weight: 3,
    questions: [
      { id: "m-cosine-law-1", prompt: "余弦定理の式を書け", answer: "a² = b² + c² − 2bc·cosA" },
      { id: "m-cosine-law-2", prompt: "3辺の長さが分かっているとき角を求める定理は？", answer: "余弦定理（cosA = (b² + c² − a²) / 2bc）" },
    ],
  },
  {
    id: "m-count",
    subjectId: "math1a",
    unit: "場合の数と確率",
    name: "順列と組合せの使い分け",
    prereqIds: [],
    weight: 3,
    questions: [
      { id: "m-count-1", prompt: "5人から3人を選ぶ方法は何通り？", answer: "10通り（₅C₃ = 10。順序を区別しないので組合せ）" },
      { id: "m-count-2", prompt: "5人から3人を選んで1列に並べる方法は？", answer: "60通り（₅P₃ = 60。順序を区別するので順列）" },
    ],
  },
  {
    id: "m-prob-cond",
    subjectId: "math1a",
    unit: "場合の数と確率",
    name: "条件付き確率",
    prereqIds: ["m-count"],
    weight: 2,
    questions: [
      { id: "m-prob-cond-1", prompt: "条件付き確率 P(B|A) の定義式は？", answer: "P(B|A) = P(A∩B) / P(A)" },
      { id: "m-prob-cond-2", prompt: "「AとBが独立」を式で書くと？", answer: "P(A∩B) = P(A)·P(B)" },
    ],
  },

  // ---------- 英語（文法） ----------
  {
    id: "e-tense",
    subjectId: "english",
    unit: "動詞",
    name: "時制の一致",
    prereqIds: [],
    weight: 3,
    questions: [
      { id: "e-tense-1", prompt: "He said that he ( ) busy. 適切な形は？", answer: "was（主節が過去なら従属節も過去にそろえる）" },
      { id: "e-tense-2", prompt: "時制の一致が起きない代表的な場合は？", answer: "不変の真理・現在も続く習慣・歴史上の事実" },
    ],
  },
  {
    id: "e-perfect",
    subjectId: "english",
    unit: "動詞",
    name: "現在完了と過去形の区別",
    prereqIds: ["e-tense"],
    weight: 3,
    questions: [
      { id: "e-perfect-1", prompt: "yesterday と一緒に使えないのは現在完了か過去形か？", answer: "現在完了（明確な過去の一点を示す語とは共起しない）" },
      { id: "e-perfect-2", prompt: "I ( have lived / lived ) here since 2020. 正しいのは？", answer: "have lived（since は現在完了とセット）" },
    ],
  },
  {
    id: "e-passive",
    subjectId: "english",
    unit: "動詞",
    name: "受動態",
    prereqIds: ["e-tense"],
    weight: 2,
    questions: [
      { id: "e-passive-1", prompt: "受動態の基本形は？", answer: "be動詞 + 過去分詞（+ by ...）" },
      { id: "e-passive-2", prompt: "「彼は驚いた」を受動態で", answer: "He was surprised (at ...)（感情動詞は受動態になる）" },
    ],
  },
  {
    id: "e-modal",
    subjectId: "english",
    unit: "助動詞",
    name: "助動詞 + have + 過去分詞",
    prereqIds: ["e-perfect"],
    weight: 3,
    questions: [
      { id: "e-modal-1", prompt: "must have done の意味は？", answer: "〜したにちがいない（過去の推量）" },
      { id: "e-modal-2", prompt: "should have done の意味は？", answer: "〜すべきだったのに（実際はしなかった）" },
    ],
  },
  {
    id: "e-subjunctive",
    subjectId: "english",
    unit: "仮定法",
    name: "仮定法過去・過去完了",
    prereqIds: ["e-modal"],
    weight: 3,
    questions: [
      { id: "e-subjunctive-1", prompt: "If I ( ) rich, I would buy it. 適切な形は？", answer: "were（仮定法過去。現在の事実に反する仮定）" },
      { id: "e-subjunctive-2", prompt: "仮定法過去完了の形は？", answer: "If + had + 過去分詞, 主語 + would have + 過去分詞" },
    ],
  },
  {
    id: "e-relative",
    subjectId: "english",
    unit: "関係詞",
    name: "関係代名詞と関係副詞の区別",
    prereqIds: [],
    weight: 3,
    questions: [
      { id: "e-relative-1", prompt: "後ろが完全文なら関係代名詞・関係副詞のどちら？", answer: "関係副詞（where / when / why / how）" },
      { id: "e-relative-2", prompt: "This is the house ( ) I was born. 適切な語は？", answer: "where（後ろが完全文なので関係副詞）" },
    ],
  },
  {
    id: "e-relative-what",
    subjectId: "english",
    unit: "関係詞",
    name: "関係代名詞 what",
    prereqIds: ["e-relative"],
    weight: 2,
    questions: [
      { id: "e-relative-what-1", prompt: "what が導く節の働きは？", answer: "名詞節（〜すること／もの）。先行詞を含む" },
      { id: "e-relative-what-2", prompt: "what he said の意味は？", answer: "彼が言ったこと" },
    ],
  },
  {
    id: "e-participle",
    subjectId: "english",
    unit: "準動詞",
    name: "分詞構文",
    prereqIds: ["e-passive"],
    weight: 2,
    questions: [
      { id: "e-participle-1", prompt: "分詞構文で受動の意味なら先頭は？", answer: "Being + 過去分詞（Being は省略されることが多い）" },
      { id: "e-participle-2", prompt: "主節と主語が違う分詞構文を何という？", answer: "独立分詞構文" },
    ],
  },
  {
    id: "e-infinitive",
    subjectId: "english",
    unit: "準動詞",
    name: "不定詞と動名詞の使い分け",
    prereqIds: ["e-passive"],
    weight: 3,
    questions: [
      { id: "e-infinitive-1", prompt: "remember to do と remember doing の違いは？", answer: "to do は これからすること、doing は したこと" },
      { id: "e-infinitive-2", prompt: "動名詞のみを目的語にとる動詞を3つ", answer: "enjoy / finish / avoid（他に mind, give up など）" },
    ],
  },
  {
    id: "e-comparison",
    subjectId: "english",
    unit: "比較",
    name: "比較の重要構文",
    prereqIds: [],
    weight: 2,
    questions: [
      { id: "e-comparison-1", prompt: "no more than と not more than の違いは？", answer: "no more than は「たった〜しか」、not more than は「多くとも〜」" },
      { id: "e-comparison-2", prompt: "「AはBに劣らず〜だ」の構文は？", answer: "A is no less ... than B" },
    ],
  },

  // ---------- 化学基礎 ----------
  {
    id: "c-atom",
    subjectId: "chem",
    unit: "物質の構成",
    name: "原子の構造と同位体",
    prereqIds: [],
    weight: 2,
    questions: [
      { id: "c-atom-1", prompt: "質量数とは何の和か？", answer: "陽子の数 + 中性子の数" },
      { id: "c-atom-2", prompt: "同位体どうしで異なるのは？", answer: "中性子の数（陽子の数は同じ）" },
    ],
  },
  {
    id: "c-bond",
    subjectId: "chem",
    unit: "物質の構成",
    name: "化学結合の種類",
    prereqIds: ["c-atom"],
    weight: 3,
    questions: [
      { id: "c-bond-1", prompt: "金属と非金属の間にできる結合は？", answer: "イオン結合" },
      { id: "c-bond-2", prompt: "非金属どうしの結合は？", answer: "共有結合" },
    ],
  },
  {
    id: "c-mol",
    subjectId: "chem",
    unit: "物質量と化学反応式",
    name: "molの定義と換算",
    prereqIds: ["c-atom"],
    weight: 3,
    questions: [
      { id: "c-mol-1", prompt: "1 mol の粒子数は？", answer: "6.02 × 10²³ 個（アボガドロ定数）" },
      { id: "c-mol-2", prompt: "標準状態で気体1 molの体積は？", answer: "22.4 L" },
      { id: "c-mol-3", prompt: "水 36 g は何 mol か（H₂O = 18）", answer: "2 mol" },
    ],
  },
  {
    id: "c-equation",
    subjectId: "chem",
    unit: "物質量と化学反応式",
    name: "化学反応式の係数と量的関係",
    prereqIds: ["c-mol", "c-bond"],
    weight: 3,
    questions: [
      { id: "c-equation-1", prompt: "係数比は何の比を表すか？", answer: "物質量（mol）の比" },
      { id: "c-equation-2", prompt: "2H₂ + O₂ → 2H₂O で H₂ 4 mol から生じる水は？", answer: "4 mol" },
    ],
  },
  {
    id: "c-concentration",
    subjectId: "chem",
    unit: "物質量と化学反応式",
    name: "濃度の計算",
    prereqIds: ["c-mol"],
    weight: 2,
    questions: [
      { id: "c-concentration-1", prompt: "モル濃度の定義式は？", answer: "溶質の物質量(mol) ÷ 溶液の体積(L)" },
      { id: "c-concentration-2", prompt: "質量パーセント濃度の分母は？", answer: "溶液の質量（溶媒ではない）" },
    ],
  },
  {
    id: "c-acid-base",
    subjectId: "chem",
    unit: "酸と塩基",
    name: "酸・塩基の定義とpH",
    prereqIds: ["c-concentration"],
    weight: 3,
    questions: [
      { id: "c-acid-base-1", prompt: "ブレンステッド・ローリーの定義で酸とは？", answer: "H⁺ を与えるもの" },
      { id: "c-acid-base-2", prompt: "pH 3 の水溶液の [H⁺] は？", answer: "1 × 10⁻³ mol/L" },
    ],
  },
  {
    id: "c-titration",
    subjectId: "chem",
    unit: "酸と塩基",
    name: "中和滴定の計算",
    prereqIds: ["c-acid-base", "c-equation"],
    weight: 3,
    questions: [
      { id: "c-titration-1", prompt: "中和の量的関係の式は？", answer: "酸の価数 × モル濃度 × 体積 = 塩基の価数 × モル濃度 × 体積" },
      { id: "c-titration-2", prompt: "弱酸を強塩基で滴定するときの指示薬は？", answer: "フェノールフタレイン（中和点が塩基性側）" },
    ],
  },
  {
    id: "c-redox",
    subjectId: "chem",
    unit: "酸化還元",
    name: "酸化数の決め方",
    prereqIds: ["c-bond"],
    weight: 3,
    questions: [
      { id: "c-redox-1", prompt: "単体の原子の酸化数は？", answer: "0" },
      { id: "c-redox-2", prompt: "化合物中の H と O の酸化数は原則？", answer: "H は +1、O は −2" },
      { id: "c-redox-3", prompt: "酸化されたとき酸化数はどうなる？", answer: "増加する（電子を失う）" },
    ],
  },
];

/**
 * 志望校マスタ。
 * ※ 入試科目・重みはプロトタイプ用のサンプルデータで、実際の募集要項ではありません。
 */
export const UNIVERSITIES: University[] = [
  {
    id: "u-national",
    name: "国公立大（サンプル）",
    faculties: [
      {
        id: "f-science",
        name: "理学部",
        subjectIds: ["math1a", "english", "chem"],
      },
      {
        id: "f-letters",
        name: "文学部",
        subjectIds: ["english", "math1a"],
        // 文系型では図形と計量の出題が薄い想定
        emphasis: { "m-sine-law": 1, "m-cosine-law": 1, "m-trig-ratio": 1 },
      },
    ],
  },
  {
    id: "u-private-sci",
    name: "私立大A（サンプル）",
    faculties: [
      {
        id: "f-eng",
        name: "理工学部",
        subjectIds: ["math1a", "chem", "english"],
        emphasis: {
          "m-quad-ineq": 3,
          "m-cosine-law": 3,
          "c-titration": 3,
          // 私立理工では英文法単独の出題が少ない想定
          "e-comparison": 1,
          "e-relative-what": 1,
        },
      },
    ],
  },
  {
    id: "u-private-lit",
    name: "私立大B（サンプル）",
    faculties: [
      {
        id: "f-econ",
        name: "経済学部",
        subjectIds: ["english", "math1a"],
        emphasis: {
          // 経済学部は英語配点が高く、化学は不要、三角比は範囲外
          "e-subjunctive": 3,
          "e-relative": 3,
          "e-infinitive": 3,
          "m-trig-ratio": 0,
          "m-sine-law": 0,
          "m-cosine-law": 0,
        },
      },
      {
        id: "f-law",
        name: "法学部",
        subjectIds: ["english"],
      },
    ],
  },
];

export const SUBJECT_BY_ID = new Map(SUBJECTS.map((s) => [s.id, s]));

export function findFaculty(universityId: string, facultyId: string) {
  const uni = UNIVERSITIES.find((u) => u.id === universityId);
  const faculty = uni?.faculties.find((f) => f.id === facultyId) ?? null;
  return { uni: uni ?? null, faculty };
}
