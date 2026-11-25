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

# Node 24 原生支持直接运行 TypeScript（server.ts）
CMD ["node", "server.ts"]
