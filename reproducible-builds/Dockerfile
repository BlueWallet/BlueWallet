# 1. Base image with Digest pinning
FROM node:24-bullseye-slim@sha256:597306380830419c70897a39ec0037113f7adc118b4e8d703d7f28136cac434f

# 2. Environment Setup
ENV TZ=UTC \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
    ANDROID_SDK_ROOT=/opt/android-sdk

# 3. Update Path to include all pinned tool locations
ENV PATH=$ANDROID_SDK_ROOT/cmdline-tools/11.0/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/build-tools/36.0.0:$JAVA_HOME/bin:$PATH

# 4. Install  system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    unzip \
    zip \
    libglu1-mesa \
    wget \
    xxd \
    zipalign \
    build-essential \
    openjdk-17-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get clean

# 5. Download, Verify, and Install Android Command Line Tools
RUN mkdir -p $ANDROID_SDK_ROOT/cmdline-tools \
    && wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/tools.zip \
    && echo "2d2d50857e4eb553af5a6dc3ad507a17adf43d115264b1afc116f95c92e5e258 /tmp/tools.zip" | sha256sum -c - \
    && unzip -X -q /tmp/tools.zip -d $ANDROID_SDK_ROOT/cmdline-tools \
    && mv $ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools $ANDROID_SDK_ROOT/cmdline-tools/11.0 \
    && rm /tmp/tools.zip

# 6. Install SDK Components (Aligned with build.gradle)
RUN yes | sdkmanager --sdk_root=$ANDROID_SDK_ROOT --licenses \
    && sdkmanager --sdk_root=$ANDROID_SDK_ROOT \
    "platforms;android-36" \
    "build-tools;36.0.0" \
    "ndk;27.1.12297006" \
    "ndk;27.0.12077973"  \
    "cmake;3.22.1" \
    "platform-tools" \
    && rm -rf $ANDROID_SDK_ROOT/cmdline-tools/tmp


RUN chown -R node:node $ANDROID_SDK_ROOT

WORKDIR /app/android
COPY --chown=node:node android/gradle/wrapper ./gradle/wrapper
COPY --chown=node:node android/gradlew .
COPY --chown=node:node android/build.gradle .
COPY --chown=node:node android/settings.gradle .

RUN ./gradlew --version


WORKDIR /app
COPY --chown=node:node . /app

RUN chown node:node /app

USER node