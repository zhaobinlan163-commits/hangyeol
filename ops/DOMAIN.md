# 自定义域名：hangyeollilith.com

> 结论：**域名可以自定义，但不能凭空出现**——得先注册（需要你本人付款 + 实名），
> 注册完把域名接到这台电脑上，用 Cloudflare Named Tunnel，永久地址就是它。

---

## 一、先注册域名（只有你能做）

`hangyeollilith.com` 目前**未注册**（已用 Verisign RDAP 查过），可以买。

| 注册商 | 价格（.com 首年） | 说明 |
|---|---|---|
| **Cloudflare Registrar** | ≈ $10.4/年（成本价，无溢价） | 最省事：注册后 DNS 自动在 Cloudflare，跳过改 NS |
| 腾讯云 / 阿里云 | ≈ ¥60–85/年 | 国内实名方便，但要把 NS 改到 Cloudflare |
| Namecheap / Porkbun | ≈ $11/年 | 需要外币卡 |

买完记下两样东西：**域名**、**DNS 服务器指向哪里**。

> 国内注册商买的域名，在「域名管理 → DNS 服务器」里改成 Cloudflare 给的两个 NS
> （形如 `xxx.ns.cloudflare.com`），生效通常 10 分钟–24 小时。

---

## 二、接到这台电脑（Cloudflare Tunnel，免费）

前提：域名已添加到 Cloudflare 账号（免费计划即可），状态是 **Active**。

```powershell
# 项目根目录下执行
cd C:\Users\LENOVO\Documents\deepseek-harness\default-workspace\hangyeol

# 1) 登录（会弹浏览器，选你的 Cloudflare 账号，授权 hangyeollilith.com）
.\cloudflared.exe tunnel login

# 2) 创建隧道，记下输出的 Tunnel ID
.\cloudflared.exe tunnel create hangyeol

# 3) 绑定域名（自动写 CNAME）
.\cloudflared.exe tunnel route dns hangyeol hangyeollilith.com
.\cloudflared.exe tunnel route dns hangyeol www.hangyeollilith.com

# 4) 把 ops\cloudflared-config.yml 复制成 C:\Users\LENOVO\.cloudflared\config.yml，
#    把里面的 <TUNNEL_ID> 换成第 2 步的 ID

# 5) 启动
.\cloudflared.exe tunnel run hangyeol
```

然后 `https://hangyeollilith.com` 就是你的站点了，HTTPS 证书 Cloudflare 自动签发。

### 想开机自启（可选，需要管理员权限）

```powershell
.\cloudflared.exe service install
```

安装成 Windows 服务后，开机自动连隧道；配合 `node server.ts` 的自启
（任务计划程序 → 登录时运行）就是常驻服务。

---

## 三、注意事项

1. **电脑必须开着**：Named Tunnel 只是把请求转发到 `127.0.0.1:3200`，
   关机 / 休眠 / 断网时域名会返回 502。
2. **不需要 ICP 备案**：域名解析到 Cloudflare（境外节点）不强制备案；
   但如果以后搬到国内服务器，就必须备案。
3. **国内访问速度**：Cloudflare 免费节点在香港/日本，大陆访问一般可用，晚高峰可能慢；
   介意的话要买国内服务器 + 备案。
4. **换域名后要更新的地方**：
   - 桌面快捷方式 `한결 HanGyeol.url`
   - 已安装的 Edge 应用（重新安装一次）
   - `RUN.md` 里的公网地址
   - PWA 的 `start_url` 用的是相对路径 `/`，不用改

---

## 四、不想让电脑一直开着？

那就把项目部署到云主机，再把域名 CNAME 过去：

| 平台 | 免费档 | 说明 |
|---|---|---|
| Render | 有（会休眠） | 连 GitHub 仓库，自动构建 |
| Railway | 有试用额度 | 部署简单 |
| Fly.io | 有免费额度 | 需要 CLI |
| 国内轻量云 | ¥60–100/年 | 需要 ICP 备案 |

项目已带 `Dockerfile`，任意支持容器的平台都能直接跑：

```bash
docker build -t hangyeol .
docker run -d -p 3000:3000 -e DEEPSEEK_API_KEY=sk-xxx hangyeol
```

部署好后在 DNS 加一条 CNAME 指向平台给的域名即可。
