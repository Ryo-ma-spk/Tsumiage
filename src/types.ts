// 学習ダッシュボードの型定義

/** 到達度。自己申告ではなく解答履歴から計算される */
export type MasteryLevel =
  | "untouched" // 未着手
  | "touched" // 触れた（挑戦したが正答していない）
  | "solved" // 解けた（正答したが定着判定に届いていない）
  | "mastered"; // 定着（間隔をあけて複数回正答）

/** 1回の解答記録。これが到達度計算の唯一の入力 */
export interface Attempt {
  pointId: string;
  /** ISO 8601 */
  at: string;
  correct: boolean;
}

/** 観点に紐づく確認問題 */
export interface Question {
  id: string;
  /** 問題文 */
  prompt: string;
  /** 答え・解説（タップで表示） */
  answer: string;
}

/**
 * 知識観点。単元より細かい「定着すべき1つの観点」。
 * 1観点 = 1問で判定できる粒度に保つ。
 */
export interface KnowledgePoint {
  id: string;
  subjectId: string;
  /** 単元名（マップの区切り表示に使う） */
  unit: string;
  name: string;
  /** 先に solved 以上になっている必要がある観点 */
  prereqIds: string[];
  /** 頻出度 1〜3。ペース計算の重みになる */
  weight: number;
  questions: Question[];
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
  /** 先行観点が未達でまだ開放されていない */
  locked: boolean;
  /** 志望校の重み補正を適用したあとの重み */
  weight: number;
  /** 依存グラフ上の深さ。0 は先行観点を持たない出発点 */
  depth: number;
  /** その観点を踏むことで先に進める観点の数 */
  descendants: number;
  correctCount: number;
  lastAttemptAt: string | null;
}
