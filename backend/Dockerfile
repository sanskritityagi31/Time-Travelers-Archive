# backend/Dockerfile - node express app
FROM node:20-alpine
WORKDIR /usr/src/app

# install deps
COPY backend/package*.json ./ 
RUN npm ci

# copy code
COPY backend/ .

# build or transpile step if needed (uncomment if present)
# RUN npm run build

ENV PORT=4000 
EXPOSE 4000
CMD ["node", "server.js"]