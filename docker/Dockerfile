FROM debian:bullseye-slim AS builder

## Java 17 (minimum required by Jetty 12)
ENV JAVA_HOME=/opt/java/openjdk
COPY --from=eclipse-temurin:17-jdk-focal $JAVA_HOME $JAVA_HOME

## Ringo main
ENV RINGO_HOME=/usr/local/ringojs
COPY . ${RINGO_HOME}

WORKDIR ${RINGO_HOME}
# normalize line endings/permissions in case the build context came from a
# checkout with CRLF line endings (e.g. Windows with core.autocrlf=true)
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew && ./gradlew --exclude-task test

FROM debian:bullseye-slim

ENV JAVA_HOME=/opt/java/openjdk
ENV RINGO_HOME=/usr/local/ringojs

COPY --from=eclipse-temurin:17-jre-focal $JAVA_HOME $JAVA_HOME
COPY --from=builder ${RINGO_HOME} ${RINGO_HOME}
COPY ./docker/docker-entrypoint.sh /usr/local/bin/

# Create ringojs user and group
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    groupadd --gid 1001 ringojs && \
    useradd --uid 1001 --gid ringojs --shell /bin/bash --create-home ringojs

## Setup environment variables
ENV PATH=${PATH}:${JAVA_HOME}/bin:${RINGO_HOME}/bin

ENTRYPOINT [ "docker-entrypoint.sh" ]

CMD [ "ringo" ]
