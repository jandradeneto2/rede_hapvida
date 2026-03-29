FROM node:20-alpine AS builder

RUN sed -i 's/https/http/g' /etc/apk/repositories && \
    apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner

# Oracle Instant Client dependencies + download and install Basic Lite
RUN sed -i 's/https/http/g' /etc/apk/repositories && \
    apk add --no-cache libaio libnsl libc6-compat curl unzip

ARG INSTANT_CLIENT_URL=https://download.oracle.com/otn_software/linux/instantclient/2118000/instantclient-basiclite-linux.x64-21.18.0.0.0dbru.zip

RUN curl -fkSL "$INSTANT_CLIENT_URL" -o /tmp/ic.zip && \
    unzip /tmp/ic.zip -d /opt/oracle && \
    rm /tmp/ic.zip && \
    ln -sf /opt/oracle/instantclient_21_18 /opt/oracle/instantclient && \
    echo /opt/oracle/instantclient > /etc/ld.so.conf.d/oracle-instantclient.conf || true

ENV LD_LIBRARY_PATH=/opt/oracle/instantclient
ENV ORACLE_LIB_DIR=/opt/oracle/instantclient

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/index.js"]
