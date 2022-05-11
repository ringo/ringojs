FROM debian:bullseye-slim AS builder

RUN apt-get update && apt-get install -y git

## Java 11
ENV JAVA_HOME=/opt/java/openjdk
COPY --from=eclipse-temurin:11-jdk-focal $JAVA_HOME $JAVA_HOME

## Ringo main
ENV RINGO_HOME=/usr/local/ringojs
RUN git -C /usr/local clone --depth 1 https://github.com/ringo/ringojs ${RINGO_HOME} && \
    rm -rf ${RINGO_HOME}/.git

WORKDIR ${RINGO_HOME}
RUN ./gradlew --exclude-task test

FROM debian:bullseye-slim

ENV JAVA_HOME=/opt/java/openjdk
ENV RINGO_HOME=/usr/local/ringojs

COPY --from=eclipse-temurin:11-jre-focal $JAVA_HOME $JAVA_HOME
COPY --from=builder ${RINGO_HOME} ${RINGO_HOME}
COPY ./docker-entrypoint.sh /usr/local/bin/

# Create ringojs user and group
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    groupadd --gid 1001 ringojs && \
    useradd --uid 1001 --gid ringojs --shell /bin/bash --create-home ringojs

## Setup environment variables
ENV PATH=${PATH}:${JAVA_HOME}/bin:${RINGO_HOME}/bin

ENTRYPOINT [ "docker-entrypoint.sh" ]

CMD [ "ringo" ]
