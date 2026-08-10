import type {
  CheckQuestion,
  KnowledgePoint,
  Subject,
  University,
} from "../types";

export const SUBJECTS: Subject[] = [{ id: "math", name: "数学", color: "#5b8def" }];

/**
 * 知識観点マスタ — 中学数学（開発確認用）。
 *
 * 領域構成と単元の並びは中学校学習指導要領（数学）の
 * 「A 数と式 / B 図形 / C 関数 / D データの活用」に沿わせている。
 * ただし個々の観点への割り方と weight は開発用の作り物で、
 * 特定の高校の出題範囲・頻出度を表すものではない。
 *
 * この科目を選んだ理由は範囲が狭いからではなく、依存関係がいちばん深く取れるから。
 * 数と式は 正負の数 → … → 二次方程式の文章題 で深さ8、
 * 図形は 平面図形 → … → 三平方の定理の空間への利用 で深さ9になる。
 *
 * とくに見たいのは領域をまたぐ辺で、次の3本を意図的に張ってある。
 *   平方根（数と式） → 三平方の定理（図形）
 *   連立方程式（数と式） → 一次関数の式を求める（関数）
 *   空間図形の計量（中1 図形） → 相似比と体積比（中3 図形）
 * 参考書の目次では章が違うので見えない依存で、マップが目次の焼き直しか
 * 本当の依存関係かは、ここが引けているかで決まる。
 */
export const POINTS: KnowledgePoint[] = [
  // ============ 中1 ============
  {
    id: "m1-signed",
    subjectId: "math",
    unit: "中1 正負の数",
    name: "正負の数の四則",
    ask: "負の数をふくむかけ算・わり算の符号を、迷わず決められる？",
    prereqIds: [],
    weight: 3,
  },
  {
    id: "m1-power",
    subjectId: "math",
    unit: "中1 正負の数",
    name: "累乗と指数",
    ask: "2³ と (−2)³ と −2³ を、それぞれ計算し分けられる？",
    prereqIds: ["m1-signed"],
    weight: 2,
  },
  {
    id: "m1-letter",
    subjectId: "math",
    unit: "中1 文字と式",
    name: "文字式の表し方",
    ask: "文字式で × と ÷ を省く書き方のルールを説明できる？",
    prereqIds: ["m1-signed"],
    weight: 2,
  },
  {
    id: "m1-letter-calc",
    subjectId: "math",
    unit: "中1 文字と式",
    name: "文字式の計算（同類項）",
    ask: "同類項をまとめて、1次式の加減ができる？",
    prereqIds: ["m1-letter"],
    weight: 3,
  },
  {
    id: "m1-eq",
    subjectId: "math",
    unit: "中1 方程式",
    name: "一元一次方程式",
    ask: "移項して一次方程式を解ける？ 移項で符号が変わる理由を言える？",
    prereqIds: ["m1-letter-calc"],
    weight: 3,
  },
  {
    id: "m1-eq-word",
    subjectId: "math",
    unit: "中1 方程式",
    name: "一次方程式の文章題",
    ask: "文章題で「何を x とおくか」を決めて、式を立てられる？",
    prereqIds: ["m1-eq"],
    weight: 3,
  },
  {
    id: "m1-ratio",
    subjectId: "math",
    unit: "中1 方程式",
    name: "比例式",
    ask: "a : b = c : d から ad = bc を導いて解ける？",
    prereqIds: ["m1-eq"],
    weight: 2,
  },
  {
    id: "m1-prop",
    subjectId: "math",
    unit: "中1 比例と反比例",
    name: "比例と反比例",
    ask: "比例 y = ax と反比例 y = a/x を、式・表・グラフで行き来できる？",
    prereqIds: ["m1-letter-calc"],
    weight: 3,
  },
  {
    id: "m1-coord",
    subjectId: "math",
    unit: "中1 比例と反比例",
    name: "座標とグラフ",
    ask: "座標平面に点をとって、比例・反比例のグラフをかける？",
    prereqIds: ["m1-prop"],
    weight: 2,
  },
  {
    id: "m1-plane",
    subjectId: "math",
    unit: "中1 平面図形",
    name: "平面図形の基本と作図",
    ask: "垂直二等分線・角の二等分線・垂線を作図できる？ それぞれ何の性質を使うか言える？",
    prereqIds: [],
    weight: 2,
  },
  {
    id: "m1-circle-basic",
    subjectId: "math",
    unit: "中1 平面図形",
    name: "おうぎ形の弧の長さと面積",
    ask: "おうぎ形の弧の長さと面積を、中心角の割合から出せる？",
    prereqIds: ["m1-plane"],
    weight: 2,
  },
  {
    id: "m1-solid",
    subjectId: "math",
    unit: "中1 空間図形",
    name: "空間内の直線と平面",
    ask: "ねじれの位置を説明できる？ 投影図から立体を読み取れる？",
    prereqIds: ["m1-plane"],
    weight: 2,
  },
  {
    id: "m1-solid-volume",
    subjectId: "math",
    unit: "中1 空間図形",
    name: "立体の体積と表面積",
    ask: "角錐・円錐の体積が 1/3 になることを言える？ 球の体積と表面積の公式は？",
    prereqIds: ["m1-solid", "m1-circle-basic"],
    weight: 3,
  },
  {
    id: "m1-data",
    subjectId: "math",
    unit: "中1 データの活用",
    name: "度数分布と代表値",
    ask: "度数分布表からヒストグラムをかける？ 平均値・中央値・最頻値を使い分けられる？",
    prereqIds: [],
    weight: 2,
  },
  {
    id: "m1-prob-basic",
    subjectId: "math",
    unit: "中1 データの活用",
    name: "相対度数と確率の見方",
    ask: "回数を増やすと相対度数が一定の値に近づく、という見方を説明できる？",
    prereqIds: ["m1-data"],
    weight: 1,
  },

  // ============ 中2 ============
  {
    id: "m2-poly",
    subjectId: "math",
    unit: "中2 式の計算",
    name: "単項式と多項式の計算",
    ask: "多項式の加減と、単項式どうしの乗除ができる？",
    prereqIds: ["m1-letter-calc"],
    weight: 3,
  },
  {
    id: "m2-formula",
    subjectId: "math",
    unit: "中2 式の計算",
    name: "等式の変形",
    ask: "等式を、指定された文字について解ける？",
    prereqIds: ["m2-poly", "m1-eq"],
    weight: 2,
  },
  {
    id: "m2-proof-num",
    subjectId: "math",
    unit: "中2 式の計算",
    name: "文字式による説明",
    ask: "「連続する3つの整数の和は3の倍数」を、文字を使って説明できる？",
    prereqIds: ["m2-poly"],
    weight: 2,
  },
  {
    id: "m2-simul",
    subjectId: "math",
    unit: "中2 連立方程式",
    name: "連立方程式（加減法・代入法）",
    ask: "加減法と代入法を使い分けて、連立方程式を解ける？",
    prereqIds: ["m1-eq", "m2-poly"],
    weight: 3,
  },
  {
    id: "m2-simul-word",
    subjectId: "math",
    unit: "中2 連立方程式",
    name: "連立方程式の文章題",
    ask: "速さや割合の文章題で、2つの式を立てられる？",
    prereqIds: ["m2-simul", "m1-eq-word"],
    weight: 3,
  },
  {
    id: "m2-linear",
    subjectId: "math",
    unit: "中2 一次関数",
    name: "一次関数の式とグラフ",
    ask: "一次関数の傾きと切片が、グラフのどこに出るか言える？",
    prereqIds: ["m1-prop"],
    weight: 3,
  },
  {
    id: "m2-linear-find",
    subjectId: "math",
    unit: "中2 一次関数",
    name: "一次関数の式を求める",
    ask: "2点の座標から一次関数の式を求められる？",
    prereqIds: ["m2-linear", "m2-simul"],
    weight: 3,
  },
  {
    id: "m2-linear-intersect",
    subjectId: "math",
    unit: "中2 一次関数",
    name: "2直線の交点",
    ask: "2直線の交点の座標が連立方程式の解と同じになる理由を説明できる？",
    prereqIds: ["m2-linear-find"],
    weight: 3,
  },
  {
    id: "m2-linear-word",
    subjectId: "math",
    unit: "中2 一次関数",
    name: "一次関数の利用",
    ask: "動く点や水そうの問題で、変域ごとに式を立てられる？",
    prereqIds: ["m2-linear-intersect"],
    weight: 2,
  },
  {
    id: "m2-angle",
    subjectId: "math",
    unit: "中2 平行と合同",
    name: "平行線と角",
    ask: "同位角・錯角・対頂角を使って、角の大きさを求められる？",
    prereqIds: ["m1-plane"],
    weight: 3,
  },
  {
    id: "m2-angle-poly",
    subjectId: "math",
    unit: "中2 平行と合同",
    name: "多角形の内角と外角",
    ask: "n角形の内角の和が 180(n−2) になる理由を説明できる？ 外角の和は？",
    prereqIds: ["m2-angle"],
    weight: 3,
  },
  {
    id: "m2-congruent",
    subjectId: "math",
    unit: "中2 平行と合同",
    name: "三角形の合同条件",
    ask: "三角形の合同条件を3つとも言える？",
    prereqIds: ["m2-angle"],
    weight: 3,
  },
  {
    id: "m2-proof",
    subjectId: "math",
    unit: "中2 平行と合同",
    name: "図形の証明の書き方",
    ask: "仮定と結論を分けて、合同を使った証明を筋道立てて書ける？",
    prereqIds: ["m2-congruent"],
    weight: 3,
  },
  {
    id: "m2-isosceles",
    subjectId: "math",
    unit: "中2 三角形と四角形",
    name: "二等辺三角形と正三角形",
    ask: "二等辺三角形の性質と、その逆を証明できる？",
    prereqIds: ["m2-proof"],
    weight: 3,
  },
  {
    id: "m2-rightangle-cong",
    subjectId: "math",
    unit: "中2 三角形と四角形",
    name: "直角三角形の合同条件",
    ask: "直角三角形の合同条件を2つ言える？ ふつうの合同条件との違いは？",
    prereqIds: ["m2-proof"],
    weight: 2,
  },
  {
    id: "m2-parallelogram",
    subjectId: "math",
    unit: "中2 三角形と四角形",
    name: "平行四辺形の性質と条件",
    ask: "平行四辺形になるための条件を5つ挙げられる？",
    prereqIds: ["m2-proof"],
    weight: 3,
  },
  {
    id: "m2-box",
    subjectId: "math",
    unit: "中2 データの活用",
    name: "四分位数と箱ひげ図",
    ask: "四分位数を求めて箱ひげ図をかける？ ヒストグラムと何が違うか言える？",
    prereqIds: ["m1-data"],
    weight: 2,
  },
  {
    id: "m2-prob",
    subjectId: "math",
    unit: "中2 データの活用",
    name: "場合の数と確率",
    ask: "樹形図で場合の数を数え上げて、確率を求められる？",
    prereqIds: ["m1-prob-basic"],
    weight: 3,
  },
  {
    id: "m2-prob-not",
    subjectId: "math",
    unit: "中2 データの活用",
    name: "「少なくとも1つ」の確率",
    ask: "「少なくとも1つ」を、余事象を使って求められる？",
    prereqIds: ["m2-prob"],
    weight: 2,
  },

  // ============ 中3 ============
  {
    id: "m3-expand",
    subjectId: "math",
    unit: "中3 多項式",
    name: "式の展開",
    ask: "(x + a)(x + b) と (a ± b)² と (a + b)(a − b) を、公式のまま展開できる？",
    prereqIds: ["m2-poly"],
    weight: 3,
  },
  {
    id: "m3-factor",
    subjectId: "math",
    unit: "中3 多項式",
    name: "因数分解",
    ask: "共通因数でくくってから、公式を使って因数分解できる？",
    prereqIds: ["m3-expand"],
    weight: 3,
  },
  {
    id: "m3-factor-use",
    subjectId: "math",
    unit: "中3 多項式",
    name: "式の計算の利用",
    ask: "展開や因数分解を使って、数の計算を簡単にしたり整数の性質を説明できる？",
    prereqIds: ["m3-factor"],
    weight: 2,
  },
  {
    id: "m3-sqrt",
    subjectId: "math",
    unit: "中3 平方根",
    name: "平方根の意味と大小",
    ask: "√a の意味を説明できる？ 平方根の大小を比べられる？",
    prereqIds: ["m1-power"],
    weight: 3,
  },
  {
    id: "m3-sqrt-calc",
    subjectId: "math",
    unit: "中3 平方根",
    name: "根号をふくむ式の計算",
    ask: "根号の乗除と、分母の有理化ができる？",
    prereqIds: ["m3-sqrt", "m3-expand"],
    weight: 3,
  },
  {
    id: "m3-quad-factor",
    subjectId: "math",
    unit: "中3 二次方程式",
    name: "二次方程式（因数分解）",
    ask: "因数分解を使って二次方程式を解ける？ AB = 0 なら A = 0 または B = 0 が言える？",
    prereqIds: ["m3-factor"],
    weight: 3,
  },
  {
    id: "m3-quad-formula",
    subjectId: "math",
    unit: "中3 二次方程式",
    name: "平方完成と解の公式",
    ask: "解の公式を書ける？ 平方完成からその公式が出ることを説明できる？",
    prereqIds: ["m3-quad-factor", "m3-sqrt-calc"],
    weight: 3,
  },
  {
    id: "m3-quad-word",
    subjectId: "math",
    unit: "中3 二次方程式",
    name: "二次方程式の文章題",
    ask: "面積や整数の文章題で二次方程式を立てて、出た解が問題に合うか吟味できる？",
    prereqIds: ["m3-quad-formula", "m2-simul-word"],
    weight: 3,
  },
  {
    id: "m3-quadfn",
    subjectId: "math",
    unit: "中3 関数 y=ax²",
    name: "y = ax² のグラフ",
    ask: "y = ax² のグラフの形と、a の符号や大きさでどう変わるか言える？",
    prereqIds: ["m2-linear", "m3-quad-factor"],
    weight: 3,
  },
  {
    id: "m3-quadfn-range",
    subjectId: "math",
    unit: "中3 関数 y=ax²",
    name: "y = ax² の変域",
    ask: "x の変域から y の変域を出せる？ 0 をまたぐときに注意がいる理由を言える？",
    prereqIds: ["m3-quadfn"],
    weight: 3,
  },
  {
    id: "m3-quadfn-rate",
    subjectId: "math",
    unit: "中3 関数 y=ax²",
    name: "変化の割合",
    ask: "y = ax² の変化の割合を求められる？ 一次関数と違って一定でない理由を言える？",
    prereqIds: ["m3-quadfn-range", "m2-linear-find"],
    weight: 3,
  },
  {
    id: "m3-fn-mixed",
    subjectId: "math",
    unit: "中3 関数 y=ax²",
    name: "放物線と直線の交点",
    ask: "放物線と直線の交点を、連立して求められる？",
    prereqIds: ["m3-quadfn-rate", "m2-linear-intersect"],
    weight: 3,
  },
  {
    id: "m3-similar",
    subjectId: "math",
    unit: "中3 相似",
    name: "相似な図形と相似条件",
    ask: "三角形の相似条件を3つ言える？ 合同条件との対応を説明できる？",
    prereqIds: ["m2-parallelogram", "m2-rightangle-cong"],
    weight: 3,
  },
  {
    id: "m3-similar-proof",
    subjectId: "math",
    unit: "中3 相似",
    name: "相似の証明と辺の長さ",
    ask: "相似を使った証明を書ける？ 対応する辺の比から長さを出せる？",
    prereqIds: ["m3-similar"],
    weight: 3,
  },
  {
    id: "m3-parallel-line",
    subjectId: "math",
    unit: "中3 相似",
    name: "平行線と線分の比",
    ask: "中点連結定理を説明できる？ 平行線にはさまれた線分の比を出せる？",
    prereqIds: ["m3-similar-proof"],
    weight: 3,
  },
  {
    id: "m3-similar-ratio",
    subjectId: "math",
    unit: "中3 相似",
    name: "相似比と面積比・体積比",
    ask: "相似比が m : n のとき、面積比と体積比がどうなるか言える？",
    prereqIds: ["m3-parallel-line", "m1-solid-volume"],
    weight: 3,
  },
  {
    id: "m3-circle-angle",
    subjectId: "math",
    unit: "中3 円",
    name: "円周角の定理",
    ask: "円周角と中心角の関係を言える？ 定理の逆を使って4点が同一円周上にあると示せる？",
    prereqIds: ["m3-similar", "m1-circle-basic"],
    weight: 3,
  },
  {
    id: "m3-pythagoras",
    subjectId: "math",
    unit: "中3 三平方の定理",
    name: "三平方の定理",
    ask: "三平方の定理を書ける？ 逆を使って直角三角形だと示せる？",
    prereqIds: ["m3-similar-proof", "m3-sqrt-calc"],
    weight: 3,
  },
  {
    id: "m3-pythagoras-plane",
    subjectId: "math",
    unit: "中3 三平方の定理",
    name: "平面図形への利用",
    ask: "特別な直角三角形の辺の比を言える？ 座標上の2点間の距離を出せる？",
    prereqIds: ["m3-pythagoras"],
    weight: 3,
  },
  {
    id: "m3-pythagoras-solid",
    subjectId: "math",
    unit: "中3 三平方の定理",
    name: "空間図形への利用",
    ask: "直方体の対角線や円錐の高さを、三平方の定理で出せる？",
    prereqIds: ["m3-pythagoras-plane", "m1-solid-volume"],
    weight: 3,
  },
  {
    id: "m3-sampling",
    subjectId: "math",
    unit: "中3 標本調査",
    name: "標本調査",
    ask: "全数調査と標本調査を使い分けられる？ 標本から母集団の数を推定できる？",
    prereqIds: ["m2-box"],
    weight: 1,
  },
];

/**
 * 志望校マスタ。
 *
 * ※ 学校名・コース・重みはすべて開発用の作り物で、実在の入試情報ではありません。
 * 実データを入れるときは出典を伴わせること。
 */
export const UNIVERSITIES: University[] = [
  {
    id: "h-public-a",
    name: "県立A高校（サンプル）",
    faculties: [
      {
        id: "f-general",
        name: "普通科",
        subjectIds: ["math"],
      },
      {
        id: "f-science",
        name: "理数科",
        subjectIds: ["math"],
        // 難問がよく出る想定。関数と図形の融合を重く見る
        emphasis: {
          "m3-fn-mixed": 3,
          "m3-similar-ratio": 3,
          "m3-circle-angle": 3,
          "m3-pythagoras-solid": 3,
          "m1-data": 1,
        },
      },
    ],
  },
  {
    id: "h-private-b",
    name: "私立B高校（サンプル）",
    faculties: [
      {
        id: "f-advanced",
        name: "特進コース",
        subjectIds: ["math"],
        emphasis: {
          "m3-fn-mixed": 3,
          "m3-parallel-line": 3,
          "m3-pythagoras-solid": 3,
          // 基礎計算は配点が薄い想定
          "m1-signed": 1,
          "m1-letter": 1,
        },
      },
      {
        id: "f-standard",
        name: "進学コース",
        subjectIds: ["math"],
        // 0 にした観点は出題範囲外として、母数からも道からも消える
        emphasis: {
          "m3-fn-mixed": 0,
          "m3-pythagoras-solid": 0,
          "m3-sampling": 0,
          "m2-prob-not": 1,
          "m3-similar-ratio": 1,
        },
      },
    ],
  },
];

/**
 * 確認カード（監査）。観点マスタとは別に持つ。
 *
 * **教材ではない。** 自己申告と実際がずれていないかを見るためだけのもの。
 * 1観点1問、解説なし。ここを増やすと問題集になり、
 * 「参考書ではない」という前提が崩れる。
 *
 * 置き場所は「逆で覚えやすいところ」に絞ってある。逆に覚えている人は
 * 流暢に、確信をもって、間違ったほうを思い出すので、自己申告では絶対に拾えない。
 * **どの問いにも、誤答の選択肢として「逆」を必ず入れてある。**
 * 全観点ぶんは要らない。ここが効く場所にだけ置く。
 */
export const CHECKS: Record<string, CheckQuestion> = {
  "m1-signed": {
    prompt: "−2² を計算すると？",
    choices: ["−4", "4", "±4", "−2"],
    answerIndex: 0, // 4 と答える人は (−2)² と取り違えている
  },
  "m1-power": {
    prompt: "(−2)³ の値は？",
    choices: ["−8", "8", "−6", "6"],
    answerIndex: 0,
  },
  "m1-prop": {
    prompt: "反比例を表す式はどれ？",
    choices: ["y = a / x", "y = ax", "y = x + a", "y = ax²"],
    answerIndex: 0, // y = ax は比例。逆に覚えやすい
  },
  "m1-data": {
    prompt: "1つだけ極端に大きい値があるとき、代表値としてより適切なのは？",
    choices: ["中央値", "平均値", "最頻値", "最大値"],
    answerIndex: 0, // 平均値と逆に覚えやすい
  },
  "m1-solid-volume": {
    prompt: "円錐の体積は、底面と高さが同じ円柱の体積の何倍？",
    choices: ["1/3 倍", "3 倍", "1/2 倍", "2 倍"],
    answerIndex: 0,
  },
  "m2-linear": {
    prompt: "一次関数 y = ax + b の a は何を表す？",
    choices: ["傾き", "切片", "x の値", "y の値"],
    answerIndex: 0, // b（切片）と逆に覚えやすい
  },
  "m2-congruent": {
    prompt: "三角形の「合同」条件に入らないものはどれ？",
    choices: [
      "3つの角がそれぞれ等しい",
      "3つの辺がそれぞれ等しい",
      "2辺とその間の角がそれぞれ等しい",
      "1辺とその両端の角がそれぞれ等しい",
    ],
    answerIndex: 0, // これは相似条件。合同と相似は取り違えやすい
  },
  "m2-box": {
    prompt: "箱ひげ図の「箱」の中には、データ全体のおよそ何%が入る？",
    choices: ["50%", "25%", "75%", "100%"],
    answerIndex: 0,
  },
  "m2-prob-not": {
    prompt: "「少なくとも1つ表が出る」確率の求め方は？",
    choices: [
      "1 −（全部裏が出る確率）",
      "1 −（全部表が出る確率）",
      "表が1枚だけ出る確率",
      "表が出る確率をたす",
    ],
    answerIndex: 0, // 余事象の取り方を逆にしやすい
  },
  "m3-expand": {
    prompt: "x² − 9 を因数分解すると？",
    choices: ["(x + 3)(x − 3)", "(x − 3)²", "(x + 3)²", "(x − 9)(x + 1)"],
    answerIndex: 0, // 和と差の積を、平方の形と取り違えやすい
  },
  "m3-sqrt": {
    prompt: "√16 の値は？",
    choices: ["4", "±4", "8", "256"],
    answerIndex: 0, // 「16 の平方根」（±4）と逆に覚えやすい
  },
  "m3-quad-factor": {
    prompt: "(x − 2)(x + 5) = 0 の解は？",
    choices: ["x = 2, −5", "x = −2, 5", "x = 2, 5", "x = −2, −5"],
    answerIndex: 0, // 符号をそのまま読んで逆にしやすい
  },
  "m3-quadfn-rate": {
    prompt: "y = ax² の変化の割合は？",
    choices: [
      "x の値によって変わる",
      "つねに一定で a になる",
      "つねに一定で 2a になる",
      "つねに 0",
    ],
    answerIndex: 0, // 一次関数（一定）と逆に覚えやすい
  },
  "m3-similar-ratio": {
    prompt: "相似比が 2 : 3 のとき、面積比は？",
    choices: ["4 : 9", "8 : 27", "2 : 3", "3 : 2"],
    answerIndex: 0, // 体積比（8:27）や、そのままの比と取り違えやすい
  },
  "m3-circle-angle": {
    prompt: "同じ弧に対する円周角と中心角の関係は？",
    choices: [
      "円周角は中心角の半分",
      "中心角は円周角の半分",
      "円周角と中心角は等しい",
      "円周角は中心角の 1/4",
    ],
    answerIndex: 0, // まさに逆で覚えやすい代表例
  },
  "m3-pythagoras": {
    prompt: "直角三角形で c が斜辺のとき、成り立つ式は？",
    choices: ["a² + b² = c²", "a² + c² = b²", "a + b = c", "a² − b² = c²"],
    answerIndex: 0, // どれを斜辺にするかを逆にしやすい
  },
  "m3-sampling": {
    prompt: "全数調査のほうが向いているのはどっち？",
    choices: [
      "学校の健康診断",
      "電球の寿命の調査",
      "テレビの視聴率調査",
      "缶詰の品質検査",
    ],
    answerIndex: 0, // 調べると壊れるものは標本調査。逆にしやすい
  },
};

export const SUBJECT_BY_ID = new Map(SUBJECTS.map((s) => [s.id, s]));

/** 確認カードを持っている観点のID */
export const CHECKABLE_IDS = new Set(Object.keys(CHECKS));

export function findFaculty(universityId: string, facultyId: string) {
  const uni = UNIVERSITIES.find((u) => u.id === universityId);
  const faculty = uni?.faculties.find((f) => f.id === facultyId) ?? null;
  return { uni: uni ?? null, faculty };
}
