FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN mvn -q package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S keystone && adduser -S keystone -G keystone
COPY --chown=keystone:keystone --from=build /workspace/target/deliveryservice-0.0.1-SNAPSHOT.jar app.jar
USER keystone
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
