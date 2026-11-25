# 一键把 hangyeollilith.com 接到本机的 3200 端口（Cloudflare Named Tunnel）
# 前提：域名已添加到 Cloudflare 且状态 Active；cloudflared.exe 在项目根目录
# 用法：powershell -ExecutionPolicy Bypass -File .\ops\setup-domain.ps1

param(
  [string]$Domain = "hangyeollilith.com",
  [string]$TunnelName = "hangyeol",
  [int]$Port = 3200
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$exe = Join-Path $projectRoot "cloudflared.exe"

if (-not (Test-Path $exe)) {
  Write-Host "找不到 cloudflared.exe，请先放到项目根目录：$exe" -ForegroundColor Red
  exit 1
}

Write-Host "== 1/5 登录 Cloudflare（浏览器里选账号并授权 $Domain）" -ForegroundColor Cyan
& $exe tunnel login

Write-Host "== 2/5 创建隧道 $TunnelName（已存在则复用）" -ForegroundColor Cyan
$listJson = & $exe tunnel list --output json 2>$null | Out-String
$existing = $null
try { $existing = ($listJson | ConvertFrom-Json) | Where-Object { $_.name -eq $TunnelName } } catch {}

$tunnelId = $null
if ($existing) {
  $tunnelId = $existing.id
  Write-Host "复用已有隧道: $tunnelId"
} else {
  $createOut = & $exe tunnel create $TunnelName 2>&1 | Out-String
  Write-Host $createOut
  $m = [regex]::Match($createOut, "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})")
  if ($m.Success) { $tunnelId = $m.Groups[1].Value }
}

if (-not $tunnelId) {
  Write-Host "没能拿到 Tunnel ID，请手动运行: $exe tunnel create $TunnelName" -ForegroundColor Red
  exit 1
}

Write-Host "== 3/5 写入配置 C:\Users\$env:USERNAME\.cloudflared\config.yml" -ForegroundColor Cyan
$cfDir = Join-Path $env:USERPROFILE ".cloudflared"
New-Item -ItemType Directory -Force -Path $cfDir | Out-Null
$configPath = Join-Path $cfDir "config.yml"
$credPath = Join-Path $cfDir "$tunnelId.json"

$config = @"
tunnel: $tunnelId
credentials-file: $credPath

ingress:
  - hostname: $Domain
    service: http://127.0.0.1:$Port
  - hostname: www.$Domain
    service: http://127.0.0.1:$Port
  - service: http_status:404
"@
Set-Content -Path $configPath -Value $config -Encoding utf8
Write-Host "已写入: $configPath"

Write-Host "== 4/5 绑定域名 $Domain 与 www.$Domain" -ForegroundColor Cyan
& $exe tunnel route dns $TunnelName $Domain
& $exe tunnel route dns $TunnelName "www.$Domain"

Write-Host "== 5/5 完成，启动命令：" -ForegroundColor Green
Write-Host "  1) 先起站点:  `$env:NODE_ENV='production'; `$env:PORT='$Port'; node server.ts"
Write-Host "  2) 再起隧道:  .\cloudflared.exe tunnel run $TunnelName"
Write-Host "  3) 打开        https://$Domain"
Write-Host ""
Write-Host "想开机自启隧道（管理员权限）: .\cloudflared.exe service install" -ForegroundColor DarkGray
