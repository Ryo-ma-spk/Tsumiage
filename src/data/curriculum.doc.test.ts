import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { CHECKS, POINTS } from "./curriculum";
import { analyzeGraph } from "../logic/graph";
import type { KnowledgePoint } from "../types";

/**
 * 観点マスタから学習要項のページ（docs/curriculum.html）を作る。
 *
 * 手で書くと必ずデータとずれるので、テストと一緒に走らせて毎回作り直す。
 * ここが落ちる／出力が変わったときは、curriculum.ts を直したということ。
 */

/** 学習指導要領の領域。単元名（学年を除いた部分）から引く */
const AREA_BY_UNIT: Record<string, string> = {
  正負の数: "A 数と式",
  文字と式: "A 数と式",
  方程式: "A 数と式",
  式の計算: "A 数と式",
  連立方程式: "A 数と式",
  多項式: "A 数と式",
  平方根: "A 数と式",
  二次方程式: "A 数と式",
  平面図形: "B 図形",
  空間図形: "B 図形",
  平行と合同: "B 図形",
  三角形と四角形: "B 図形",
  相似: "B 図形",
  円: "B 図形",
  三平方の定理: "B 図形",
  比例と反比例: "C 関数",
  一次関数: "C 関数",
  "関数 y=ax²": "C 関数",
  データの活用: "D データの活用",
  標本調査: "D データの活用",
};

const AREAS = ["A 数と式", "B 図形", "C 関数", "D データの活用"];
const GRADES = ["中1", "中2", "中3"];

const gradeOf = (p: KnowledgePoint) => p.unit.slice(0, 2);
const unitBodyOf = (p: KnowledgePoint) => p.unit.slice(3);
const areaOf = (p: KnowledgePoint) => AREA_BY_UNIT[unitBodyOf(p)];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

describe("学習要項", () => {
  it("すべての単元に領域が割り当たっている", () => {
    const missing = POINTS.filter((p) => areaOf(p) === undefined);
    expect(missing.map((p) => p.unit)).toEqual([]);
  });

  it("確認カードが実在する観点を指していて、選択肢がそろっている", () => {
    const ids = new Set(POINTS.map((p) => p.id));
    for (const [id, q] of Object.entries(CHECKS)) {
      expect(ids.has(id), `確認カードが未知の観点 ${id} を指している`).toBe(true);
      expect(q.choices.length, `${id} の選択肢が4つない`).toBe(4);
      expect(q.answerIndex, `${id} の正解の番号が範囲外`).toBeLessThan(4);
      // 逆で覚えている人を拾うのが目的なので、誤答の受け皿が要る
      expect(new Set(q.choices).size, `${id} の選択肢が重複している`).toBe(4);
    }
  });

  it("docs/curriculum.html を書き出す", () => {
    const { depthById, descendantsById } = analyzeGraph(POINTS);
    const byId = new Map(POINTS.map((p) => [p.id, p]));
    const maxDepth = Math.max(...depthById.values());

    /** 学年をまたぐ依存 */
    const crossGrade = POINTS.flatMap((p) =>
      p.prereqIds
        .filter((q) => gradeOf(byId.get(q)!) !== gradeOf(p))
        .map((q) => ({ from: byId.get(q)!, to: p }))
    );
    /** 領域をまたぐ依存 */
    const crossArea = POINTS.flatMap((p) =>
      p.prereqIds
        .filter((q) => areaOf(byId.get(q)!) !== areaOf(p))
        .map((q) => ({ from: byId.get(q)!, to: p }))
    );

    const matrix = GRADES.map((g) => ({
      grade: g,
      cells: AREAS.map(
        (a) =>
          POINTS.filter((p) => gradeOf(p) === g && areaOf(p) === a).length
      ),
    }));

    const areaSection = (area: string) => {
      const list = POINTS.filter((p) => areaOf(p) === area);
      const units = [...new Set(list.map((p) => p.unit))];
      return `
<section class="area">
  <h2>${esc(area)} <span class="cnt">${list.length}観点</span></h2>
  ${units
    .map((u) => {
      const rows = list.filter((p) => p.unit === u);
      return `
  <h3>${esc(u)}</h3>
  <div class="table-wrap"><table>
    <thead><tr><th>観点</th><th>カードに出る問いかけ</th><th class="c">頻出</th><th>土台</th><th class="c">深さ</th><th class="c">この先</th><th class="c">確認</th></tr></thead>
    <tbody>
    ${rows
      .map((p) => {
        const keys = p.prereqIds.map((q) => {
          const k = byId.get(q)!;
          const far = gradeOf(k) !== gradeOf(p) || areaOf(k) !== areaOf(p);
          return `<span class="key${far ? " far" : ""}">${esc(k.name)}${
            far ? `<em>${esc(gradeOf(k))}</em>` : ""
          }</span>`;
        });
        return `<tr>
      <td class="nm">${esc(p.name)}</td>
      <td class="ask">${esc(p.ask)}</td>
      <td class="c w">${"★".repeat(p.weight)}</td>
      <td class="keys">${keys.length ? keys.join("") : '<span class="none">なし（出発点）</span>'}</td>
      <td class="c">${depthById.get(p.id)}</td>
      <td class="c">${descendantsById.get(p.id)}</td>
      <td class="c chk">${CHECKS[p.id] ? "◎" : ""}</td>
    </tr>`;
      })
      .join("\n")}
    </tbody>
  </table></div>`;
    })
    .join("\n")}
</section>`;
    };

    const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tsumiage — 学習要項（中学数学）</title>
<style>
:root {
  --paper:#FBF8F3; --card:#fff; --ink:#22303C; --ink-2:#66757F;
  --line:#E7E3DC; --line-2:#D6D1C7; --amber:#FF8A1F; --amber-d:#D46800;
  --amber-pale:#FFE7D1; --green-d:#1E9159;
  --body:"Hiragino Sans","Noto Sans JP",system-ui,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,monospace;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  --paper:#14181E; --card:#1B2027; --ink:#E8ECF2; --ink-2:#98A4B0;
  --line:#2A313A; --line-2:#39414C; --amber:#FF9E45; --amber-d:#FFB870;
  --amber-pale:#3A2A18; --green-d:#4CC196;
}}
:root[data-theme="dark"]{
  --paper:#14181E; --card:#1B2027; --ink:#E8ECF2; --ink-2:#98A4B0;
  --line:#2A313A; --line-2:#39414C; --amber:#FF9E45; --amber-d:#FFB870;
  --amber-pale:#3A2A18; --green-d:#4CC196;
}
*{box-sizing:border-box}
body{margin:0;padding:48px 24px 90px;background:var(--paper);color:var(--ink);
  font-family:var(--body);line-height:1.75;font-size:15px}
.wrap{max-width:1080px;margin:0 auto}
h1{font-size:30px;margin:0 0 6px;letter-spacing:.02em}
.lede{color:var(--ink-2);margin:0 0 8px;max-width:62ch}
.note{font-size:12.5px;color:var(--ink-2);background:var(--card);
  border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:18px 0 30px}
h2{font-size:22px;margin:52px 0 6px;padding-top:22px;border-top:2px solid var(--line)}
h2 .cnt{font-size:13px;color:var(--ink-2);font-weight:400;margin-left:8px}
h3{font-size:14px;margin:26px 0 6px;color:var(--amber-d);letter-spacing:.02em}
.stats{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0}
.stat{background:var(--card);border:1px solid var(--line);border-radius:14px;
  padding:12px 18px;min-width:120px}
.stat b{display:block;font-size:24px;line-height:1.2}
.stat small{font-size:11.5px;color:var(--ink-2)}
.table-wrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13.5px;margin-bottom:6px}
th,td{text-align:left;vertical-align:top;padding:9px 12px 9px 0;border-bottom:1px solid var(--line)}
th{font-size:11px;color:var(--ink-2);font-weight:600;letter-spacing:.06em;white-space:nowrap}
td.c,th.c{text-align:center;width:1%;white-space:nowrap;padding-right:8px}
td.nm{font-weight:700;white-space:nowrap}
td.ask{color:var(--ink-2);font-size:12.5px;min-width:24ch}
td.w{color:var(--amber-d);letter-spacing:-1px}
.key{display:inline-block;background:var(--card);border:1px solid var(--line-2);
  border-radius:999px;padding:1px 10px;margin:1px 4px 1px 0;font-size:11.5px;white-space:nowrap}
.key.far{border-color:var(--amber);color:var(--amber-d);font-weight:700}
.key em{font-style:normal;font-size:9.5px;opacity:.8;margin-left:4px}
.none{color:var(--ink-2);font-size:11.5px}
.mx td.c{font-variant-numeric:tabular-nums}
.mx td:first-child{font-weight:700}
.cross li{margin-bottom:5px;font-size:13.5px}
.cross b{color:var(--amber-d)}
td.chk{color:var(--green-d);font-weight:700}
</style>
</head>
<body>
<div class="wrap">

<h1>学習要項 — 中学数学</h1>
<p class="lede">Tsumiage が持っている観点マスタの全体。<code>src/data/curriculum.ts</code> から自動生成しているので、実装と必ず一致する。</p>

<div class="note">
領域の分け方と単元の並びは中学校学習指導要領（数学）の A／B／C／D に沿わせている。
ただし<b>個々の観点への割り方・問いかけの文言・頻出度は開発用の作り物</b>で、
実在の入試情報ではない。頻出度は本来、過去問への観点タグ付けから作る。
</div>

<div class="stats">
  <div class="stat"><b>${POINTS.length}</b><small>観点</small></div>
  <div class="stat"><b>${AREAS.length}</b><small>領域</small></div>
  <div class="stat"><b>${maxDepth}</b><small>依存の最大の深さ</small></div>
  <div class="stat"><b>${crossGrade.length}</b><small>学年をまたぐ依存</small></div>
  <div class="stat"><b>${crossArea.length}</b><small>領域をまたぐ依存</small></div>
  <div class="stat"><b>${Object.keys(CHECKS).length}</b><small>確認カード</small></div>
</div>

<h2>構成</h2>
<div class="table-wrap"><table class="mx">
  <thead><tr><th></th>${AREAS.map((a) => `<th class="c">${esc(a)}</th>`).join("")}<th class="c">計</th></tr></thead>
  <tbody>
  ${matrix
    .map(
      (r) =>
        `<tr><td>${r.grade}</td>${r.cells
          .map((c) => `<td class="c">${c || "—"}</td>`)
          .join("")}<td class="c">${r.cells.reduce((a, b) => a + b, 0)}</td></tr>`
    )
    .join("\n  ")}
  <tr><td>計</td>${AREAS.map(
    (a) => `<td class="c">${POINTS.filter((p) => areaOf(p) === a).length}</td>`
  ).join("")}<td class="c">${POINTS.length}</td></tr>
  </tbody>
</table></div>

<h2>領域をまたぐつながり <span class="cnt">${crossArea.length}本</span></h2>
<p class="lede">参考書の目次では章が違うので見えない依存。マップが目次の焼き直しか本当の依存関係かは、ここが引けているかで決まる。</p>
<ul class="cross">
${crossArea
  .map(
    (e) =>
      `  <li>${esc(areaOf(e.from))}／<b>${esc(e.from.name)}</b>（${esc(
        gradeOf(e.from)
      )}） → ${esc(areaOf(e.to))}／<b>${esc(e.to.name)}</b>（${esc(
        gradeOf(e.to)
      )}）</li>`
  )
  .join("\n")}
</ul>

<h2>学年をまたぐつながり <span class="cnt">${crossGrade.length}本</span></h2>
<p class="lede">学年で切ると分断されるが、工程としてはひと続きになっているところ。</p>
<ul class="cross">
${crossGrade
  .map(
    (e) =>
      `  <li><b>${esc(e.from.name)}</b>（${esc(gradeOf(e.from))}） → <b>${esc(
        e.to.name
      )}</b>（${esc(gradeOf(e.to))}）</li>`
  )
  .join("\n")}
</ul>

<h2>確認カード <span class="cnt">${Object.keys(CHECKS).length}問</span></h2>
<p class="lede">自己申告では「逆で覚えていた」を拾えない。逆に覚えている人は流暢に、確信をもって思い出すので、即答して「完璧」に振り、いちばん出てこなくなる。そこで<b>逆で覚えやすいところにだけ</b>確認カードを置き、誤答の選択肢に必ず「逆」を入れてある。教材ではないので1観点1問、解説は持たない。</p>
<div class="table-wrap"><table>
<thead><tr><th>観点</th><th>問い</th><th>正解</th><th>「逆」の受け皿</th></tr></thead>
<tbody>
${Object.entries(CHECKS)
  .map(([id, q]) => {
    const p = byId.get(id)!;
    return `<tr><td class="nm">${esc(p.name)}</td><td class="ask">${esc(
      q.prompt
    )}</td><td><b>${esc(q.choices[q.answerIndex])}</b></td><td class="ask">${esc(
      q.choices.filter((_, i) => i !== q.answerIndex).join(" / ")
    )}</td></tr>`;
  })
  .join("\n")}
</tbody></table></div>

${AREAS.map(areaSection).join("\n")}

</div>
</body>
</html>
`;

    mkdirSync("docs", { recursive: true });
    writeFileSync("docs/curriculum.html", html);

    expect(html).toContain("学習要項");
  });
});
