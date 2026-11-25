/**
 * 给 TOPIK 官方词书的「常用搭配」批量补中文释义。
 *
 * 用法（需要你的 DeepSeek Key）：
 *   PowerShell:
 *     $env:DEEPSEEK_API_KEY="sk-xxxx"
 *     node scripts/translate-collocations.mjs
 *
 * 可选参数：
 *   --limit 40      只处理前 40 条（试跑）
 *   --batch 15      每批条数（默认 20）
 *   --force         已有 collocationZh 的也重新翻译
 *
 * 特点：可中断续跑（已翻译的会跳过），每批落盘，失败自动重试。
 */
import fs from 'node:fs';
import path from 'node:path';

const DATA_PATH = path.resolve('data/topik-official-book.json');
const API_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '') + '/chat/completions';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash';
const KEY = (process.env.DEEPSEEK_API_KEY || '').trim();

const argv = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const LIMIT = Number(argValue('--limit', '0')) || 0;
const BATCH = Math.max(5, Math.min(30, Number(argValue('--batch', '20')) || 20));
const FORCE = argv.includes('--force');

if (!KEY) {
  console.error('缺少 DEEPSEEK_API_KEY 环境变量。\nPowerShell: $env:DEEPSEEK_API_KEY="sk-xxxx"');
  process.exit(1);
}
if (!fs.existsSync(DATA_PATH)) {
  console.error('找不到数据文件:', DATA_PATH);
  process.exit(1);
}

const words = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const pending = words.filter(
  (w) => w.collocation && w.collocation.trim() && (FORCE || !w.collocationZh)
);
const targets = LIMIT > 0 ? pending.slice(0, LIMIT) : pending;

console.log(`词书共 ${words.length} 条，有搭配 ${words.filter((w) => w.collocation).length} 条，待翻译 ${targets.length} 条`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildPrompt(batch) {
  const rows = batch
    .map(
      (w) =>
        `{"id":"${w.id}","korean":"${w.korean}","pos":"${w.pos}","collocation":"${w.collocation}"}`
    )
    .join('\n');
  return `你是韩汉词典编辑。为每条韩语「搭配」写出简体中文释义。
规则：
1. 每条释义不超过 12 个汉字，直给意思，不要解释。
2. 搭配里的 "~" 代表中心词本身，请把它当作该词理解。
3. 搭配常是「名词+助词」的片段（如 하다 的搭配 운동을），要译成完整短语（做运动）。
4. 只输出 JSON，不要 Markdown。

待处理（每行一个 JSON）：
${rows}

输出格式（results 顺序与输入一致，id 必须原样返回）：
{"results":[{"id":"...","zh":"做运动"}]}`;
}

async function translateBatch(batch, attempt = 1) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: '你是专业的韩汉词典编辑，只输出严格合法的 JSON。' },
          { role: 'user', content: buildPrompt(batch) },
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 160)}`);
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(content);
    const results = Array.isArray(parsed?.results) ? parsed.results : [];
    return results;
  } catch (err) {
    if (attempt >= 4) throw err;
    const wait = 800 * attempt;
    console.warn(`  批次失败（${err.message}），${wait}ms 后重试 ${attempt}/3`);
    await sleep(wait);
    return translateBatch(batch, attempt + 1);
  }
}

function save() {
  const tmp = `${DATA_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(words, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_PATH);
}

let done = 0;
for (let i = 0; i < targets.length; i += BATCH) {
  const batch = targets.slice(i, i + BATCH);
  const results = await translateBatch(batch);
  const byId = new Map(results.map((r) => [String(r.id), String(r.zh || '').trim()]));

  for (const item of batch) {
    const zh = byId.get(String(item.id));
    if (zh) {
      item.collocationZh = zh;
      done += 1;
    }
  }

  save();
  const percent = Math.round(((i + batch.length) / targets.length) * 100);
  console.log(`  ${i + batch.length}/${targets.length}（${percent}%）已写入，例：${batch[0].collocation} → ${batch[0].collocationZh || '—'}`);
  await sleep(150);
}

console.log(`\n完成：新增 ${done} 条中文搭配释义，已写回 ${DATA_PATH}`);
console.log('下一步：git add data/topik-official-book.json && git commit -m "data: 补充常用搭配中文释义" && git push');
