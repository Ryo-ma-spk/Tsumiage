import type { KnowledgePoint, Subject, University } from "../types";

export const SUBJECTS: Subject[] = [
  { id: "math1a", name: "数学I・A", color: "#5b8def" },
  { id: "english", name: "英語（文法）", color: "#e0685f" },
  { id: "chem", name: "化学基礎", color: "#4bb98f" },
];

/**
 * 知識観点マスタ。
 *
 * weight は頻出度（1: たまに 〜 3: 頻出）。ペース計算の重みになる。
 * prereqIds が観点の依存関係で、マップの1本道の順序をそのまま決める。
 *
 * ask はカードに出す問いかけ。問題文ではなく「その場で答えを作れるか」を
 * 聞く文にする。このアプリは参考書ではないので、答えは持たない。
 */
export const POINTS: KnowledgePoint[] = [
  // ---------- 数学I・A ----------
  {
    id: "m-expand",
    subjectId: "math1a",
    unit: "数と式",
    name: "展開の公式",
    ask: "(x + a)(x + b) や (a + b)² を、公式のまま展開できる？",
    prereqIds: [],
    weight: 2,
  },
  {
    id: "m-factor",
    subjectId: "math1a",
    unit: "数と式",
    name: "因数分解（たすきがけ）",
    ask: "x² の係数が1でない二次式を、たすきがけで因数分解できる？",
    prereqIds: ["m-expand"],
    weight: 3,
  },
  {
    id: "m-sqrt",
    subjectId: "math1a",
    unit: "数と式",
    name: "平方根の有理化",
    ask: "分母に √ がある分数を、有理化して整理できる？",
    prereqIds: ["m-expand"],
    weight: 2,
  },
  {
    id: "m-ineq",
    subjectId: "math1a",
    unit: "数と式",
    name: "1次不等式と絶対値",
    ask: "絶対値つきの1次不等式を解ける？ 負の数で割るとき不等号がどうなるか言える？",
    prereqIds: ["m-expand"],
    weight: 2,
  },
  {
    id: "m-quad-graph",
    subjectId: "math1a",
    unit: "二次関数",
    name: "平方完成と頂点",
    ask: "二次関数を平方完成して、頂点の座標を出せる？",
    prereqIds: ["m-factor"],
    weight: 3,
  },
  {
    id: "m-quad-solve",
    subjectId: "math1a",
    unit: "二次関数",
    name: "解の公式と判別式",
    ask: "解の公式を書ける？ 判別式の符号で解の個数がどう変わるか言える？",
    prereqIds: ["m-quad-graph", "m-sqrt"],
    weight: 3,
  },
  {
    id: "m-quad-ineq",
    subjectId: "math1a",
    unit: "二次関数",
    name: "二次不等式",
    ask: "二次不等式を、グラフのどこが正でどこが負かを使って解ける？",
    prereqIds: ["m-quad-solve", "m-ineq"],
    weight: 3,
  },
  {
    id: "m-trig-ratio",
    subjectId: "math1a",
    unit: "図形と計量",
    name: "三角比の定義と相互関係",
    ask: "sin・cos・tan を直角三角形で説明できる？ 相互関係の式を書ける？",
    prereqIds: ["m-sqrt"],
    weight: 2,
  },
  {
    id: "m-sine-law",
    subjectId: "math1a",
    unit: "図形と計量",
    name: "正弦定理",
    ask: "正弦定理の式を書ける？ どんな条件のときに使うか言える？",
    prereqIds: ["m-trig-ratio"],
    weight: 3,
  },
  {
    id: "m-cosine-law",
    subjectId: "math1a",
    unit: "図形と計量",
    name: "余弦定理",
    ask: "余弦定理の式を書ける？ 正弦定理とどう使い分けるか言える？",
    prereqIds: ["m-trig-ratio"],
    weight: 3,
  },
  {
    id: "m-count",
    subjectId: "math1a",
    unit: "場合の数と確率",
    name: "順列と組合せの使い分け",
    ask: "順列と組合せを、順序を区別するかどうかで使い分けられる？",
    prereqIds: [],
    weight: 3,
  },
  {
    id: "m-prob-cond",
    subjectId: "math1a",
    unit: "場合の数と確率",
    name: "条件付き確率",
    ask: "条件付き確率の定義式を書ける？ 2つの事象が独立である条件を言える？",
    prereqIds: ["m-count"],
    weight: 2,
  },

  // ---------- 英語（文法） ----------
  {
    id: "e-tense",
    subjectId: "english",
    unit: "動詞",
    name: "時制の一致",
    ask: "主節が過去のとき従属節をどうするか言える？ 一致させない場合を挙げられる？",
    prereqIds: [],
    weight: 3,
  },
  {
    id: "e-perfect",
    subjectId: "english",
    unit: "動詞",
    name: "現在完了と過去形の区別",
    ask: "現在完了と過去形の使い分けを説明できる？ 現在完了と一緒に使えない語を言える？",
    prereqIds: ["e-tense"],
    weight: 3,
  },
  {
    id: "e-passive",
    subjectId: "english",
    unit: "動詞",
    name: "受動態",
    ask: "受動態の基本形を書ける？ by 以外の前置詞をとる表現を挙げられる？",
    prereqIds: ["e-tense"],
    weight: 2,
  },
  {
    id: "e-modal",
    subjectId: "english",
    unit: "助動詞",
    name: "助動詞 + have + 過去分詞",
    ask: "must have / should have / can't have done の意味を言い分けられる？",
    prereqIds: ["e-perfect"],
    weight: 3,
  },
  {
    id: "e-subjunctive",
    subjectId: "english",
    unit: "仮定法",
    name: "仮定法過去・過去完了",
    ask: "仮定法過去と仮定法過去完了の形を、それぞれ書ける？",
    prereqIds: ["e-modal"],
    weight: 3,
  },
  {
    id: "e-relative",
    subjectId: "english",
    unit: "関係詞",
    name: "関係代名詞と関係副詞の区別",
    ask: "関係代名詞と関係副詞を、後ろが完全な文かどうかで見分けられる？",
    prereqIds: [],
    weight: 3,
  },
  {
    id: "e-relative-what",
    subjectId: "english",
    unit: "関係詞",
    name: "関係代名詞 what",
    ask: "what が導く節の働きを説明できる？ 他の関係代名詞との違いを言える？",
    prereqIds: ["e-relative"],
    weight: 2,
  },
  {
    id: "e-participle",
    subjectId: "english",
    unit: "準動詞",
    name: "分詞構文",
    ask: "分詞構文を作れる？ 受動の意味になるときの形を言える？",
    prereqIds: ["e-passive"],
    weight: 2,
  },
  {
    id: "e-infinitive",
    subjectId: "english",
    unit: "準動詞",
    name: "不定詞と動名詞の使い分け",
    ask: "to do と doing で意味が変わる動詞を挙げられる？ 動名詞だけをとる動詞を言える？",
    prereqIds: ["e-passive"],
    weight: 3,
  },
  {
    id: "e-comparison",
    subjectId: "english",
    unit: "比較",
    name: "比較の重要構文",
    ask: "no more than と not more than の違いを説明できる？",
    prereqIds: [],
    weight: 2,
  },

  // ---------- 化学基礎 ----------
  {
    id: "c-atom",
    subjectId: "chem",
    unit: "物質の構成",
    name: "原子の構造と同位体",
    ask: "質量数が何の和か言える？ 同位体どうしで何が違うか説明できる？",
    prereqIds: [],
    weight: 2,
  },
  {
    id: "c-bond",
    subjectId: "chem",
    unit: "物質の構成",
    name: "化学結合の種類",
    ask: "イオン結合・共有結合・金属結合を、何と何の組み合わせでできるか言い分けられる？",
    prereqIds: ["c-atom"],
    weight: 3,
  },
  {
    id: "c-mol",
    subjectId: "chem",
    unit: "物質量と化学反応式",
    name: "molの定義と換算",
    ask: "アボガドロ定数を言える？ 質量・体積・粒子数を mol に換算できる？",
    prereqIds: ["c-atom"],
    weight: 3,
  },
  {
    id: "c-equation",
    subjectId: "chem",
    unit: "物質量と化学反応式",
    name: "化学反応式の係数と量的関係",
    ask: "反応式の係数が何の比を表すか言える？ 係数から生成物の物質量を出せる？",
    prereqIds: ["c-mol", "c-bond"],
    weight: 3,
  },
  {
    id: "c-concentration",
    subjectId: "chem",
    unit: "物質量と化学反応式",
    name: "濃度の計算",
    ask: "モル濃度と質量パーセント濃度の定義式を、それぞれ書ける？",
    prereqIds: ["c-mol"],
    weight: 2,
  },
  {
    id: "c-acid-base",
    subjectId: "chem",
    unit: "酸と塩基",
    name: "酸・塩基の定義とpH",
    ask: "ブレンステッド・ローリーの定義を言える？ pH から水素イオン濃度を出せる？",
    prereqIds: ["c-concentration"],
    weight: 3,
  },
  {
    id: "c-titration",
    subjectId: "chem",
    unit: "酸と塩基",
    name: "中和滴定の計算",
    ask: "中和の量的関係の式を書ける？ 指示薬の選び方を説明できる？",
    prereqIds: ["c-acid-base", "c-equation"],
    weight: 3,
  },
  {
    id: "c-redox",
    subjectId: "chem",
    unit: "酸化還元",
    name: "酸化数の決め方",
    ask: "酸化数のルールを言える？ 酸化されたとき酸化数がどう動くか説明できる？",
    prereqIds: ["c-bond"],
    weight: 3,
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
