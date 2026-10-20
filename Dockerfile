FROM node:22.23.3-bookworm-slim AS test

WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=0

# System dependencies for the offline Chromium checks. Everything is installed
# inside this image; no host/global npm packages or services are needed.
RUN apt-get update && apt-get install -y --no-install-recommends \
    make ca-certificates fonts-liberation libglib2.0-0 libnspr4 libnss3 \
    libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcb1 \
    libxkbcommon0 libatspi2.0-0 libx11-6 libxcomposite1 libxdamage1 \
    libxext6 libxfixes3 libxrandr2 libgbm1 libcairo2 libpango-1.0-0 \
    libasound2 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci && npm run test:setup

COPY . .
RUN make test

FROM nginx:1.28.0-alpine AS production

COPY --from=test /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
