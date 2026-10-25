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

# The rewrite target is compiled into the production build. Compose passes the
# internal service name; direct local builds still work with the default.
ARG API_INTERNAL_URL=http://backend:8000
ENV API_INTERNAL_URL=$API_INTERNAL_URL
ARG NEXT_PUBLIC_STAGE_MODE=1
ENV NEXT_PUBLIC_STAGE_MODE=$NEXT_PUBLIC_STAGE_MODE
ARG NEXT_PUBLIC_STAGE_ANALYSIS=local
ENV NEXT_PUBLIC_STAGE_ANALYSIS=$NEXT_PUBLIC_STAGE_ANALYSIS
RUN npm run build --workspace frontend

EXPOSE 3000

# Production mode avoids Turbopack/HMR hydration failures observed in the
# dev container and is the stable path for the jury demo.
CMD ["npm", "run", "start", "--workspace", "frontend", "--", "--hostname", "0.0.0.0"]
