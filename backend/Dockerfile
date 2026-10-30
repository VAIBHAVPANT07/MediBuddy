FROM node:22-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY backend/migrations ./migrations
COPY csv ./csv
RUN npm run build
EXPOSE 3001
CMD ["sh", "-c", "npm run migrate && node dist/importSynthea.js && node dist/seedDemo.js && npm start"]
