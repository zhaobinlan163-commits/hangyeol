# HanGyeol（한결）本地运行 / 上线指南

这个 zip 是 **AI Studio 导出的完整项目**：React 19 + Vite 8 前端 + Express 后端（`server.ts`），
后端负责代理 DeepSeek 请求、提供 TOPIK 词库接口和 `/api/live-tutor` 语音 WebSocket。

**结论：它本身就是一个网页应用**，但不是「纯静态页」——必须有 Node 后端跟着跑，
所以不能直接丢到 GitHub Pages / OSS 静态托管上。

---

## 一、本地跑起来（已在本机验证通过）

### 1. 装 Node.js

去 https://nodejs.org 下载 **Node.js 24 LTS**（≥ 23.6 才有原生 TS 支持，本项目直接 `node server.ts` 运行）。
装完在终端确认：

```bash
node -v
npm -v
```

### 2. 装依赖

```bash
cd hangyeol
npm install
```

> 如果 `npm install` 报 esbuild / rolldown / @tailwindcss/oxide 找不到二进制，
> 说明用了 `--no-optional` 或 pnpm 的默认（非 hoisted）布局，改用 `npm install` 即可。

### 3. 填 DeepSeek Key

打开项目根目录的 `.env`，把 key 填进 `DEEPSEEK_API_KEY`：

```ini
DEEPSEEK_API_KEY="sk-你的key"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-flash"
APP_URL="http://localhost:3000"
```

Key 在 https://platform.deepseek.com/api_keys 申请。

两种填法，**二选一或都用**：

- **网页上填（推荐，多用户）**：打开站点 → 右上角齿轮 → 填自己的 key → 保存。
  只存在本人浏览器，服务器不保存。详见第五节。
- **`.env` 里填（兜底）**：服务器默认 key，谁没在网页里填就用它。
  公开给别人玩时建议留空，避免别人白嫖你的额度。

> 不管哪种方式，key 都不该写进 `src/` 前端源码。

### 4. 启动

```bash
node server.ts
# 或 npm run dev
```

打开 http://localhost:3000

### 已完成的验证记录

| 检查项 | 结果 |
|---|---|
| `/api/health` | 200，`provider: deepseek`, `model: deepseek-flash` |
| TOPIK 词库 | 4056 词（官方 2143 条），`/api/topik/stats` 正常 |
| Vite 前端编译 | `/src/main.tsx` 正常转译 |
| `vite build` | 成功，`dist/` 551 KB JS + 43 KB CSS |
| 生产模式（`NODE_ENV=production`） | `node server.ts` 正确托管 `dist/`，首页 + API 均 200 |
| 自带 Key 透传 | `/api/health` 带 `x-deepseek-key` → `hasKey: true`，模型可被请求头覆盖 |
| Key 真实性校验 | `/api/ai/verify` 带假 key → 401（说明请求真的发到了 DeepSeek） |
| 云存档往返 | `POST` 再 `GET /api/progress/smoketest` 数据一致；非法存档码 400 |

> 注意：`/api/chat`、`/api/pronunciation/analyze` 等 AI 接口需要有效 key（网页设置里填或 `.env`），
> 否则会返回「还没有可用的 DeepSeek API 密钥」。前端界面本身不填 key 也能打开。

---

## 二、变成公网可访问的网页

后端必须常驻，推荐下面三种：

### 方案 A：Docker（推荐，最省事）

项目已附 `Dockerfile`：

```bash
docker build -t hangyeol .
docker run -d -p 3000:3000 \
  -e DEEPSEEK_API_KEY=sk-xxx \
  -e DEEPSEEK_BASE_URL=https://api.deepseek.com \
  -e DEEPSEEK_MODEL=deepseek-flash \
  hangyeol
```

### 方案 B：Render / Railway / Fly.io

- Build Command：`npm install && npm run build`
- Start Command：`node server.ts`
- 环境变量：`DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`、`NODE_ENV=production`
- 平台会自动给 `PORT`，`server.ts` 已读取 `process.env.PORT`

### 方案 C：自己的 VPS

```bash
npm install && npm run build
NODE_ENV=production PORT=3000 node server.ts
```

前面挂 Nginx，**注意 WebSocket 要转发 Upgrade 头**（`/api/live-tutor` 否则连不上）：

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

再用 certbot 配 HTTPS —— **录音 / 麦克风功能只在 HTTPS 下可用**（localhost 例外）。

---

## 三、做成浏览器插件？

技术上可行，但基本是「壳」：

- 用 MV3 + `side_panel`（或点击图标新开标签）加载同一个站点；
- 插件的 UI 仍然要打你的 `/api/*` 和 WebSocket，所以**服务器还是少不了**；
- 收益：常驻侧边栏、划词翻译韩语。工作量约半天，但体验提升有限。

建议：先把网页部署好，再考虑加一层 `manifest.json` 包成「侧边栏打开」。

---

## 四、做成微信小程序？

**不能直接转**：小程序没有 DOM、没有 `process.env`/`fs`、WebSocket 域名受限，
React + Vite 这套代码搬不过去。三条路：

| 路线 | 做法 | 工作量 | 限制 |
|---|---|---|---|
| ① web-view 套壳 | 小程序里 `<web-view>` 指向你部署好的 HTTPS 域名 | 约 1 天 | 域名要 **ICP 备案**，麦克风/录音在 web-view 里受限，实时语音通话体验打折 |
| ② uni-app / Taro 重写 | UI 重写一遍，后端复用这套 Express API（改成小程序可访问的域名） | 接近重做，2–3 周 | 需小程序类目审核、服务器域名白名单 |
| ③ 就做 H5 | 现在这个网页就是，微信里直接打开/收藏/下拉 | 0 | 没有小程序入口 |

想「有微信入口但不是小程序」的话，最便宜的是 ①；想认真运营选 ②。

---

## 五、每人用自己的 API Key（多用户）

右上角齿轮 = **设置**，里面有两块：

### 1. 我的 DeepSeek API

- 每个人填自己的 `sk-...`，存在**自己浏览器的 localStorage**（键 `hangyeol_ai_config_v1`）。
- 每次请求通过请求头 `x-deepseek-key` / `x-deepseek-base` / `x-deepseek-model` 带给服务器，
  服务器用 `AsyncLocalStorage` 做**单次请求覆盖**，不落盘、不写日志、不进数据库。
- 「测试连接」会真发一次最小请求到 `/api/ai/verify`，返回 200 才算密钥可用。
- 没填 key 时，首页顶部有一条黄色提示，AI 功能会返回「请点右上角设置」。
- 服务器 `.env` 里的 `DEEPSEEK_API_KEY` 变成**兜底默认 key**：谁没填就用它。
  公开给别人玩时建议留空，否则别人不填也能烧你的额度。

### 2. 学习进度

进度本来就在浏览器里（4 个 localStorage 键：词卡 / 统计 / 聊天 / 今日计划），
刷新、关标签、重启浏览器都不会丢。换设备有三条路：

| 方式 | 做法 | 适用 |
|---|---|---|
| 导出/导入文件 | 设置里「导出进度文件」→ 新设备「导入进度文件」 | 换电脑、备份 |
| 云存档码 | 自定一个 4–32 位码（如 `mimi-2026`）→ 上传；新设备输同一个码 → 恢复 | 手机+电脑来回切 |
| 不迁移 | 各自从头开始 | 朋友各自独立玩 |

云存档落在服务器 `data/progress/<存档码>.json`，**没有鉴权**——知道码就能读写，
所以别用能猜到的码，也别当密码用。Docker 部署时记得把这个目录挂成 volume，否则重建容器会丢。

> 这套设计的取舍：不做账号系统（免得朋友要注册），用「浏览器本地 + 可选存档码」
> 换取零门槛。真要做多端实时同步，就需要账号 + 数据库了。

## 六、已经部署到公网

**正式地址（Render 免费档，电脑可以关机）：https://hangyeol.onrender.com**

- 仓库：https://github.com/zhaobinlan163-commits/hangyeol（`main` 分支自动部署）
- 部署配置：仓库根目录 `render.yaml`（Node 22、singapore、免费档、健康检查 `/api/health`）
- 构建：`npm install --include=dev && npm run build`（vite 打包前端 + esbuild 打包 `server.mjs`）
- 启动：`NODE_ENV=production node server.mjs`
- 免费实例闲置 15 分钟休眠，首次访问约 50 秒冷启动；`data/progress` 云存档在重新部署后会清空

### 备用：本机临时隧道（电脑开着时更快）

**https://generated-wine-bin-democracy.trycloudflare.com**

它走的是 Cloudflare 的免账号 Quick Tunnel：本机 `cloudflared` 把
`http://127.0.0.1:3200`（生产模式，托管 `dist/`）映射成一个 HTTPS 公网地址。
已验证：首页 200、JS bundle 200、`/api/health` 200、`wss://.../api/live-tutor` 握手成功。

重启隧道（电脑重启或进程被杀后）：

```bash
# 先起生产服务
$env:NODE_ENV="production"; $env:PORT="3200"; node server.ts

# 另开一个窗口
.\cloudflared.exe tunnel --url http://127.0.0.1:3200 --no-autoupdate
```

注意：

- **URL 每次重启都会变**，且无可用性保证，关机/休眠即断；适合"试试"，不适合长期给用户。
- **没有登录鉴权**，拿到链接的人都能用。一旦填了 DeepSeek key，别人也能烧你的额度。
- 国内网络访问 trycloudflare 一般能通但速度一般，微信内打开可能被拦。
- 想固定域名/长期在线：把域名托管到 Cloudflare → 建 Named Tunnel（`cloudflared tunnel create`），
  或直接按第二节部署到 Render / 自己的 VPS。

## 七、还差什么

1. **DeepSeek key**：现在可以由每个用户在网页里自填（推荐）；服务器 `.env` 的 key 只是兜底
2. **公网域名 + HTTPS**（麦克风、剪贴板等 API 都需要安全上下文）
3. 服务端 `/api/transcribe` 目前是「未支持」占位，语音识别走的是
   `live-tutor` WebSocket + 浏览器录音；要做真 STT 得接 DeepSeek ASR 或第三方。

---

## 八、常见报错对照

| 报错 | 原因 | 处理 |
|---|---|---|
| 接口连通性检查失败：DeepSeek 返回内容为空 | 之前 `deepseek-flash` 默认开启**思考模式**，`max_tokens` 被推理过程吃光，`content` 是空的。已修复：所有调用默认 `thinking: disabled` | 刷新页面重点「测试连接」 |
| 401 密钥无效或已过期 | key 复制错、被删除、带空格/引号 | 重新粘贴，只留 `sk-...` 本身 |
| 402 余额不足 | 账户没充值 | platform.deepseek.com 充值 |
| 429 请求频率过高 | 短时间调用太多 | 等几秒重试 |
| 400 模型不存在 | 模型名写错 | 填 `deepseek-flash` 或 `deepseek-v4-pro` |
| 连接超时 | 网络/代理问题 | 换网络，或把 Base URL 换成可用的中转地址 |

> 说明：`thinking` 参数只在模型名以 `deepseek` 开头、或域名是 `deepseek.com` 时才发送，
> 这样把 Base URL 指向第三方 OpenAI 兼容网关时不会因为多传字段而报 400。

## 九、内容覆盖说明

| 内容 | 现有 | 说明 |
|---|---|---|
| 词汇 | 4,056 词（官方大纲 2,143 条） | TOPIK 1–6 级全覆盖，够用 |
| 语法 | **248 条**（原有 30 + 新增 218） | 基本覆盖 TOPIK 1–6 级常用语法大纲（约 250 条） |

语法分布（等级标签为近似值）：1级 18 · 2级 19 · 3-4级 109 · 5-6级 97（另有 seed 5 条计入合计）。

新增部分共 6 个数据包：

| 文件 | 条数 | 主要内容 |
|---|---|---|
| `topikGrammarPack1.ts` | 24 | 敬语 -습니다/-(으)세요/께、判断句与否定、基础助词、进行体、-겠-、意愿、推测 |
| `topikGrammarPack2.ts` | 25 | -다가/-자마자/-더니/-는데도/-도록/-므로/-느라고/-길래、间接引语、比较与时间 |
| `topikGrammarPack3.ts` | 21 | 被动/使动、名词化、书面语、-기는커녕/-을지언정/-기 일쑤 |
| `topikGrammarPack4.ts` | 57 | -고서/-고 보니/-다 보니/-다가는/-았더라면/-는 김에/-는 길에、-(으)러/-(으)려고/-게、推测家族 |
| `topikGrammarPack5.ts` | 49 | 传话缩略(-대요/-냬요/-재요)、疑问感叹(-지요/-군요/-나요)、计划意图、派生形容词(-스럽다/-답다)、-는 둥/-거나 말거나 |
| `topikGrammarPack6.ts` | 42 | -(으)ㄹ수록、程度(-기 짝이 없다/-기가 무섭게)、助词进阶(밖에/만/도/까지/로서/로써)、-은 지、惯用收尾 |

**仍未覆盖**：俗语与四字成语、拟声拟态词、专业领域固定搭配、部分方言/网络语。
这些更接近「词汇」而非语法点，需要单独建成语库。

> 新增条目沿用同一套字段（接续表、辨析、例句+读音、造句题、提示词、参考答案），
> 但篇幅比原 30 条更精简，属于「够学、够查、够练」的密度。

## 十、本轮界面与逻辑调整

- 每日背词工作台标题改成「每日任务」，三个环节直接叫 **初学 / 复习 / 检查**，描述精简
- 抽词改为**顺序模式**（`sequential: true`）：按官方词表排序（官方优先 → 等级 → 词频）取下一批，
  已进过词库的词全部排除 → 不重复、不遗漏，抽完提示「这个级别没有更多新词」
- 初始数据归零：XP、今日背词、练习时长、连续天数全部从 0 开始（统计键升级到 `hangyeol_stats_v2`）
- 新增**打卡日历**：每天练满 15 分钟自动打卡（`hangyeol_checkin_v1` 记录每日秒数），
  连续天数由打卡记录推导，可翻看历史月份
- 进度导出/云存档现在包含打卡记录
- **语法从 30 条扩到 248 条**：新增 `topikGrammarPack1`–`topikGrammarPack6` 共 218 条，
  按等级 tab 筛选即可；`GrammarWorkshopView` 已合并七个数据源
- **语法页新增「问 AI」**：每个语法点下方可自由提问（没记住 / 有什么区别 / 要例句），
  调 `POST /api/grammar/ask`，返回中文讲解 + 2-3 例句 + 记忆提示；旁边有「记到笔记本」一键存
- **AI 回答可一键存笔记**：每条答疑右下角「存到笔记本」，自动带上问题、回答、例句、提示，
  标签默认 `语法`，存入后按钮变「已存入」，不打断当前答疑
- **新增笔记本**：`notes` 标签页，新建/编辑/删除/搜索 + **标签筛选**，
  存 `hangyeol_notes_v1`，已加入进度导出与云存档
- **UI 文案精简**：AI 陪练 / 实时纠错 / 视频辅助伴学 / 快捷指令 等标题与副标题去掉长描述，
  知识内容成为页面主视觉
- **新增 Logo 与 PWA**：`public/` 下 5 个图标 + manifest + service worker；
  `TopBar` 加了 logo，`index.html` 加了图标与 manifest 链接；桌面放了一个 `.url` 快捷方式
- **背词模块加自动发音**：`闪卡自动朗读` 开关（存在 `hangyeol_auto_speak_v1`），
  只在韩语已露出时播放（初学正面、看韩想中、听音盲抽、翻到背面），不会在看中想韩时泄题
- **背词模块加上/下切词**：会话里 `上一个 / 下一个`（初学阶段由算法控序，禁用），
  词库列表右侧详情也能上/下切换并显示 `3 / 120` 位置

## 十一、Logo 与「安装成应用」

- 图标生成脚本：`scripts/make-icons.py`（PIL 绘制，蓝渐变 + 白色「한」+ 薄荷进度条）
- 产物在 `public/`：`icon-512.png`、`icon-192.png`、`icon-512-maskable.png`、
  `apple-touch-icon.png`、`favicon-32.png`、`favicon.ico`
- `public/manifest.webmanifest` + `public/sw.js`，`index.html` 加了图标/manifest/theme-color 链接，
  `src/main.tsx` 注册 Service Worker → 满足 Edge/Chrome 的「安装为应用」条件
- 桌面快捷方式：`한결 HanGyeol.url`（指向公网地址，图标用 `public/favicon.ico`）

改图标只需改脚本里的颜色/字符，重跑：

```bash
python scripts/make-icons.py
npm run build   # 会把 public/ 拷进 dist/
```

## 附：本机改动记录

- 新增 `.env`（key 留空，其余已填好 `deepseek-flash`）
- `src/services/deepseekService.ts`：默认模型 `deepseek-chat` → `deepseek-flash`
  （旧模型名已下线，官方现役是 `deepseek-flash` / `deepseek-v4-pro`）
- **多用户自带 Key**：`src/utils/api.ts` 增加本地配置存储 + 请求头注入；
  `server.ts` 增加 `x-deepseek-*` 请求头中间件 + `runWithAiConfig()`（AsyncLocalStorage 单请求覆盖）
- **新增 `POST /api/ai/verify`**：真发一次最小请求，验证用户 key 是否可用
- **新增 `GET/POST /api/progress/:code`**：云存档（`data/progress/<code>.json`）
- **新增设置弹窗** `src/components/AiSettingsDialog.tsx`（API 配置 + 测试 + 进度导出/导入/云存档）
- `src/components/TopBar.tsx` 加齿轮入口；`src/App.tsx` 加「未配置 key」提示条
- **修复「返回内容为空」**：`callDeepSeekOnce` 默认带 `thinking: {type:'disabled'}`；
  `/api/ai/verify` 的 `max_tokens` 从 8 提到 32；空回复时区分「只有思考没有回答」
