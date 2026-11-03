FROM debian:trixie-slim AS builder

RUN apt-get update && apt-get install -y git

## Java 21 (Gradle 9 requires at least Java 17 to build)
ENV JAVA_HOME=/opt/java/openjdk
COPY --from=eclipse-temurin:21-jdk-noble $JAVA_HOME $JAVA_HOME

## Ringo main
ENV RINGO_HOME=/usr/local/ringojs
RUN git -C /usr/local clone --depth 1 https://github.com/ringo/ringojs ${RINGO_HOME} && \
    rm -rf ${RINGO_HOME}/.git

WORKDIR ${RINGO_HOME}
RUN ./gradlew --exclude-task test

FROM debian:trixie-slim

ENV JAVA_HOME=/opt/java/openjdk
ENV RINGO_HOME=/usr/local/ringojs
ENV LANG=C.UTF-8

COPY --from=eclipse-temurin:21-jre-noble $JAVA_HOME $JAVA_HOME
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
