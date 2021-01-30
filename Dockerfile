FROM node:14.15.4-slim

RUN mkdir -p clover/public
COPY ./backend clover
COPY ./frontend/build clover/public

WORKDIR clover
RUN yarn install --production --frozen-lockfile

CMD [ "yarn", "start" ]
