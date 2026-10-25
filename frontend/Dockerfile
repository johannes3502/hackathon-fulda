FROM node:22.23.4-bookworm-slim

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app
RUN chown node:node /app
USER node

# npm workspaces use the repository's shared lockfile.
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node frontend/package.json ./frontend/package.json
RUN npm ci --workspace frontend --include-workspace-root && mkdir -p frontend/.next

COPY --chown=node:node frontend/ ./frontend/
COPY --chown=node:node api/ ./api/

EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace", "frontend", "--", "--hostname", "0.0.0.0"]
