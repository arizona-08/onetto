FROM node:24-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm install

RUN chown -R node:node /app
USER node
EXPOSE 8000

CMD ["npm", "run", "start:dev"]