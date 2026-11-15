FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node src src
COPY --chown=node:node scripts/admin.js scripts/admin.js
COPY --chown=node:node public public
COPY --chown=node:node migrations migrations
RUN mkdir data && chown node:node data
USER node
ENV HOST=0.0.0.0 PORT=3000 DB_PATH=/app/data/tnmyat.sqlite
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node","src/server.js"]
