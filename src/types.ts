// 学習ダッシュボードの型定義

/**
 * 到達度。1回の判定では動かず、判定の履歴から計算される。
 * 「やった」チェックのように一度で確定するものは入力に入れない。
 */
export type MasteryLevel =
  | "untouched" // 未着手
  | "touched" // 触れた（挑戦したが思い出せていない）
  | "solved" // できた（思い出せたが定着判定に届いていない）
  | "mastered"; // 定着（間隔をあけて複数回できた）

/** 1回の判定記録。これが到達度計算の唯一の入力 */
export interface Attempt {
  pointId: string;
  /** ISO 8601 */
  at: string;
  correct: boolean;
  /**
   * 観点が表示されてから判定を確定するまでの時間（ミリ秒）。
   * 想起にかけた時間の目安として保持日数の補正に使う。
   * 古い履歴には無いので optional。欠けていれば補正しない。
   */
  latencyMs?: number;
  /**
   * 「完璧」として振ったか。correct が true のときだけ意味を持つ。
   *
   * これは保持日数を伸ばすだけで、忘却の対象から外すものではない。
   * 外してしまうと「大丈夫だと思っていたほうを本番で忘れる」という、
   * このアプリが検知しようとしている失敗そのものを利用者の手で
   * 確定させるスイッチになる。判定を間違えても、遅れて戻ってくる。
   */
  perfect?: boolean;
  /**
   * 確認カード（監査）の結果か。
   *
   * 自己申告では勘違いを検知できない。確信して間違えている人は即答し、
   * 「完璧」に振り、保持日数が最大 ×1.8 まで伸びて、いちばん出てこなくなる。
   * 忘却は時間が自己修正するが、勘違いは安定していて自己修正しない。
   * そこで時々、答えと突き合わせられるカードを混ぜて実際に確かめる。
   */
  audit?: boolean;
}

/**
 * 確認カード。自己申告と実際がずれていないかを見るためだけに持つ。
 *
 * **教材ではない。** 1観点につき最大1問、解説は持たない。
 * ここを増やすと問題集になり、「参考書ではない」という前提が崩れる。
 */
export interface CheckQuestion {
  prompt: string;
  /** 4択。順番は固定（毎回同じでよい。覚えても答えが分かるだけ） */
  choices: string[];
  answerIndex: number;
}

/**
 * 知識観点。単元より細かい「定着すべき1つの観点」。
 * 1観点 = その場で答えられるか1回で判定できる粒度に保つ。
 *
 * このアプリは参考書でも問題集でもないので、問題文と答えは持たない。
 * 学習そのものは教科書・問題集の側でやる。
 */
export interface KnowledgePoint {
  id: string;
  subjectId: string;
  /** 単元名（マップの区切り表示に使う） */
  unit: string;
  /** 短い名前。マップや一覧で使う */
  name: string;
  /**
   * カードに出す問いかけ。「〜できる？」の形にして、
   * 見た瞬間に頭の中で答えを作らせる。答えはアプリ側で持たない。
   */
  ask: string;
  /** 先に solved 以上になっている必要がある観点 */
  prereqIds: string[];
  /** 頻出度 1〜3。ペース計算の重みになる */
  weight: number;
}

export interface Subject {
  id: string;
  name: string;
  /** マップ・グラフの識別色 */
  color: string;
}

/** 志望学部。必要科目と、大学ごとの観点の重み補正を持つ */
export interface Faculty {
  id: string;
  name: string;
  /** 入試で必要な科目 */
  subjectIds: string[];
  /** 観点IDごとの重み上書き（0にすると出題範囲外として除外される） */
  emphasis?: Record<string, number>;
}

export interface University {
  id: string;
  name: string;
  faculties: Faculty[];
}

/** 志望校の選択 */
export interface Target {
  universityId: string;
  facultyId: string;
  /** 受験日 YYYY-MM-DD */
  examDate: string;
}

/** localStorage に保存される全状態 */
export interface StudyState {
  target: Target | null;
  attempts: Attempt[];
}

/** 到達度の計算結果 */
export interface PointStatus {
  point: KnowledgePoint;
  level: MasteryLevel;
  /**
   * 一度でも定着に到達したか。すごろくの「通過したマス」にあたる。
   * 忘れても取り消されない（踏破率が後退しないのはこの値を使うから）。
   */
  everMastered: boolean;
  /** 初めて定着に到達した日。実績ペースの計測に使う */
  firstMasteredAt: string | null;
  /**
   * 鮮度が切れると予測される日（ISO 8601）。
   * いま定着していない観点は null。
   */
  staleAt: string | null;
  /** いまの鮮度 0〜1。1 = 直後、0 = 切れている */
  freshness: number;
  /** 鮮度が切れていて復習が要る状態 */
  needsReview: boolean;
  /**
   * 土台になる観点がまだ手の内に入っていない。
   *
   * これは「触れない」という意味ではない。学習の順序を決めているのは
   * 学校や本人であって、このアプリではない。授業で二次関数をやっている人を
   * 一次関数で止めるのは筋が違う。あくまで
   * 「ここが苦しいなら、たぶん土台のほうが原因」という説明に使う。
   */
  needsFoundation: boolean;
  /** 志望校の重み補正を適用したあとの重み */
  weight: number;
  /** 依存グラフ上の深さ。0 は先行観点を持たない出発点 */
  depth: number;
  /** その観点を踏むことで先に進める観点の数 */
  descendants: number;
  correctCount: number;
  lastAttemptAt: string | null;
}
