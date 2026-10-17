FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node server.mjs model.mjs ./
COPY --chown=node:node public ./public
COPY --chown=node:node seed/templates.json seed/sources.json ./seed/
RUN chmod -R a+rX /app/public /app/seed && mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node","server.mjs"]
