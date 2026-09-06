// 使い方: node generate-pages.js
// questions.json / questions-pm.json を読み込み、question/<id>.html・pm/<id>.html を生成する。
// このページはAIに「参照URL」として渡すためのもの。人間が読んでも問題ない体裁にしてある。

const fs = require("fs");
const path = require("path");

const questions = JSON.parse(fs.readFileSync(path.join(__dirname, "questions.json"), "utf-8"));
const outDir = path.join(__dirname, "question");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// questions-pm.json に加え、questions-pm-*.json という名前のファイルも
// すべて自動的に読み込んでマージする（例: questions-pm-2025r07a.json）。
// 新しい年度・回のデータを追加するときは、同じ命名規則のファイルを
// ルートに置くだけでよく、このスクリプトを毎回書き換える必要はない。
const pmFiles = fs
  .readdirSync(__dirname)
  .filter((f) => /^questions-pm.*\.json$/.test(f))
  .sort();

let pmQuestions = [];
const seenIds = new Map(); // id -> 由来ファイル名（重複検知用）

pmFiles.forEach((file) => {
  const filePath = path.join(__dirname, file);
  let list;
  try {
    list = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.warn(`警告: ${file} の読み込みに失敗しました（${e.message}）。スキップします。`);
    return;
  }

  list.forEach((q) => {
    if (seenIds.has(q.id)) {
      // idが重複している場合は上書きで消えないよう、出力ファイル名だけ
      // ファイル名由来のサフィックスを付けて分離する。
      const suffix = path.basename(file, ".json").replace(/^questions-pm-?/, "") || "dup";
      const newOutId = `${q.id}-${suffix}`;
      console.warn(
        `警告: id "${q.id}" が ${seenIds.get(q.id)} と ${file} で重複しています。` +
        ` ${file} 側は出力ファイル名を "${newOutId}" に変更して生成します。`
      );
      pmQuestions.push({ ...q, outId: newOutId });
    } else {
      seenIds.set(q.id, file);
      pmQuestions.push({ ...q, outId: q.id });
    }
  });

  console.log(`読み込み: ${file}（${list.length}件）`);
});

const pmOutDir = path.join(__dirname, "pm");
if (!fs.existsSync(pmOutDir)) fs.mkdirSync(pmOutDir, { recursive: true });

const marks = ["ア", "イ", "ウ", "エ"];

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderPage(q) {
  const choicesHtml = q.choices
    .map((c, i) => `<li${i === q.answer ? ' class="correct"' : ""}>${marks[i]}: ${escapeHtml(c)}</li>`)
    .join("\n      ");

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(q.category)} - ${q.id}</title>
<meta name="robots" content="noindex">
<style>
  body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 20px;line-height:1.8;color:#152238;}
  h1{font-size:16px;color:#4C5A70;font-weight:600;}
  .question{font-size:17px;margin:16px 0;}
  ul{list-style:none;padding:0;}
  li{padding:8px 12px;border:1px solid #D2DAE3;border-radius:4px;margin-bottom:8px;}
  li.correct{border-color:#2F6F6D;background:#EAF3F2;font-weight:600;}
  .explain{margin-top:20px;padding-top:16px;border-top:1px dashed #D2DAE3;}
  .label{font-size:12px;color:#4C5A70;font-weight:600;margin-bottom:6px;}
</style>
</head>
<body>
  <h1>応用情報技術者試験 - ${escapeHtml(q.category)}（${q.id}）</h1>
  <div class="question">${escapeHtml(q.text)}</div>
  <ul>
      ${choicesHtml}
  </ul>
  <div class="explain">
    <div class="label">正解</div>
    <div>${marks[q.answer]}: ${escapeHtml(q.choices[q.answer])}</div>
    <div class="label" style="margin-top:14px;">解説</div>
    <div>${escapeHtml(q.explain)}</div>
  </div>
</body>
</html>
`;
}

questions.forEach((q) => {
  const filePath = path.join(outDir, `${q.id}.html`);
  fs.writeFileSync(filePath, renderPage(q), "utf-8");
  console.log(`生成: question/${q.id}.html`);
});

function renderPmPage(q){
  const subqHtml = q.subQuestions.map(sq => `
    <div class="subq">
      <div class="subq-id">${escapeHtml(sq.id)}</div>
      <div class="subq-prompt">${escapeHtml(sq.prompt)}</div>
      <div class="subq-answer"><span class="label">解答例</span> ${escapeHtml(sq.modelAnswer)}</div>
    </div>
  `).join("\n");

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(q.category)} - ${q.id}</title>
<meta name="robots" content="noindex">
<style>
  body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 20px;line-height:1.8;color:#152238;}
  h1{font-size:16px;color:#4C5A70;font-weight:600;}
  .passage{white-space:pre-wrap;background:#F7F9FB;border:1px solid #D2DAE3;border-radius:6px;padding:16px;font-size:14px;margin:16px 0;}
  .subq{border-top:1px dashed #D2DAE3;padding-top:14px;margin-top:14px;}
  .subq-id{font-weight:600;font-size:13px;color:#4C5A70;}
  .subq-prompt{font-size:14px;margin:6px 0;}
  .subq-answer{background:#EAF3F2;border:1px solid #2F6F6D;border-radius:6px;padding:10px 12px;font-size:13px;margin-top:6px;}
  .subq-answer .label{font-weight:600;color:#2F6F6D;font-size:12px;margin-right:6px;}
</style>
</head>
<body>
  <h1>応用情報技術者試験・午後 - ${escapeHtml(q.category)}（${q.id}）</h1>
  <div style="font-size:17px;font-weight:600;">${escapeHtml(q.title)}</div>
  <div class="passage">${escapeHtml(q.passage)}</div>
  ${subqHtml}
</body>
</html>
`;
}

pmQuestions.forEach((q) => {
  const filePath = path.join(pmOutDir, `${q.outId}.html`);
  fs.writeFileSync(filePath, renderPmPage(q), "utf-8");
  console.log(`生成: pm/${q.outId}.html`);
});

console.log(`完了: 午前${questions.length}件・午後${pmQuestions.length}件のページを生成しました。`);
