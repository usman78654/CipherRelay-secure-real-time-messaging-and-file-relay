FROM node:22-alpine AS dependencies
WORKDIR /app
COPY server/src/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Runtime starts with node directly; exclude unused package-manager tooling.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node server/src/ ./
USER node
EXPOSE 5000 9090
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:5000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
