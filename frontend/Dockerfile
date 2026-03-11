FROM node:22-alpine
# Build layer
# Run `npm run build` to build the project
WORKDIR /app
COPY . .
ARG VITE_PAULINE_API
ENV VITE_PAULINE_API=$VITE_PAULINE_API
RUN npm ci
RUN npx svelte-kit sync
RUN npm run build

FROM node:22-alpine
# Run layer
# Run `node ./build/index.js` to run the project
WORKDIR /app
COPY --from=0 /app/build .
COPY --from=0 /app/package.json .

EXPOSE 3000

ARG GITLAB_TOKEN
ENV GITLAB_TOKEN $GITLAB_TOKEN

CMD ["node", "./index.js"]
