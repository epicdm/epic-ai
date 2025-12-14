FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY handler.js .
EXPOSE 3333
CMD ["node", "handler.js"]
