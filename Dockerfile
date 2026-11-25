FROM node:24-slim

WORKDIR /app

# 依赖层（利用缓存）
COPY package.json ./
RUN npm install --no-audit --no-fund

# 源码 + 构建
COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Node 22+ 即可：server.ts 在构建阶段已被 esbuild 打成 server.mjs
CMD ["node", "server.mjs"]
