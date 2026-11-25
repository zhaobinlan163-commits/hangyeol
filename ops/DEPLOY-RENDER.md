# 部署到 Render（免费档，电脑可以关机）

目标：`https://hangyeol.onrender.com` 之类的地址，手机随时打开。
代价：免费实例闲置 15 分钟会休眠，再次访问要等 ~50 秒冷启动。

---

## 0. 前置：一个 GitHub 账号 + Git

Render 从 GitHub 拉代码，所以代码得先传上去。这台机器**还没装 Git**，二选一：

- **省事**：装 [GitHub Desktop](https://desktop.github.com/)，图形界面点几下就能提交 + 发布
- **命令行**：装 [Git for Windows](https://git-scm.com/download/win)，然后按下面第 2 步

装完打开终端确认：`git --version`

---

## 1. 仓库已经准备好了

项目里已经放了这些部署相关文件（不用改）：

| 文件 | 作用 |
|---|---|
| `render.yaml` | Render Blueprint：免费档、singapore 区、构建/启动命令、环境变量 |
| `.node-version` | 指定 Node 24（`server.ts` 直接运行 TS 需要） |
| `Dockerfile` | 备选方案（想用容器部署时） |
| `.gitignore` | 排除 `node_modules`、`dist`、`.env`、`cloudflared.exe` |

> 关键点：构建命令带 `--include=dev`，否则 NODE_ENV=production 会导致 vite 装不上；
> 启动命令里才设置 `NODE_ENV=production`，这样 `server.ts` 才会读 Render 注入的 `PORT`
> 并托管 `dist/`。

---

## 2. 推到 GitHub

```bash
cd C:\Users\LENOVO\Documents\deepseek-harness\default-workspace\hangyeol
git init
git add .
git commit -m "feat: HanGyeol 韩语伴学站"
```

然后在 GitHub 上新建一个仓库（**不要**勾选 README/gitignore，保持空仓库），名字随意，比如 `hangyeol`，然后：

```bash
git branch -M main
git remote add origin https://github.com/<你的用户名>/hangyeol.git
git push -u origin main
```

> 推送时会要求登录：用浏览器弹出的授权，或生成 Personal Access Token 当密码。

用 GitHub Desktop 的话：`Add existing repository` → 选这个目录 → 提交 → `Publish repository`
（取消勾选 "Keep this code private" 可选，私人仓库也能部署）。

---

## 3. 在 Render 里部署

1. 打开 https://render.com ，用 **GitHub 账号**登录（免费，不用信用卡）
2. 右上角 **New +** → **Blueprint**
3. 选中刚推的 `hangyeol` 仓库 → Render 会自动读到 `render.yaml`
4. 弹窗里填环境变量 **DEEPSEEK_API_KEY**（`sk-...`），其他保持默认
5. 点 **Apply / Create**，等构建（首次约 3–6 分钟）

构建成功后，服务页面上方就是你的地址，形如：

```
https://hangyeol-xxxx.onrender.com
```

打开 `/api/health` 看到 `{"status":"ok",...}` 就说明活了。

---

## 4. 部署完要做的几件事

1. **手机收藏**这个新地址（或"添加到主屏幕"，PWA 图标会自动用我们的 Logo）
2. **每个人自己填 key**：打开站点 → 右上角齿轮 → 填自己的 DeepSeek Key。
   服务器上的 `DEEPSEEK_API_KEY` 只是兜底，谁没填就用它 —— 公开给别人玩时建议在
   Render 里把它删掉，避免别人白嫖你的额度
3. **桌面快捷方式**和**已安装的 Edge 应用**都要换成新地址（旧的指向临时隧道，会失效）

---

## 5. 两个必须知道的天花板

| 限制 | 影响 | 应对 |
|---|---|---|
| **免费实例休眠** | 闲置 15 分钟就睡，醒来首个请求 ~50 秒 | 自己每天先点开预热一次；或升级 $7/月 |
| **磁盘是临时的** | `data/progress/*.json` 云存档会在每次重新部署/重启后清空 | 学习进度主要存在浏览器 localStorage，不受影响；云端存档只当"临时中转"用 |

其余功能（含 WebSocket 语音）在 Render 上都正常，因为它是完整 Node 服务，不是静态托管。

---

## 6. 出了问题时

- **构建失败**：看 Render 日志里 `npm install` 或 `vite build` 的报错，多半是依赖没装全
  （确认 buildCommand 里有 `--include=dev`）
- **502 / 服务起不来**：看日志里有没有 `HanGyeol server running on ...`；
  没有的话通常是 `PORT` 没读到（确认 startCommand 是 `NODE_ENV=production node server.ts`）
- **AI 功能报 401**：key 填错或过期，去设置里重填
