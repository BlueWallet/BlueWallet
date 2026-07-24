# Base image with Digest pinning
FROM node:24-bullseye-slim@sha256:e27057f6adaf0b3f172345fb5cdca821e07203ca81bc35f7b0a9e9631b255340

# Environment Setup
ENV TZ=UTC \
    LANG=C \
    LC_ALL=C \
    SOURCE_DATE_EPOCH=315532800 \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk

# Freeze Debian repositories to snapshot on May 24 2026
RUN printf '%s\n' \
    'deb http://snapshot.debian.org/archive/debian/20260524T000000Z bullseye main contrib non-free' \
    'deb http://snapshot.debian.org/archive/debian-security/20260524T000000Z bullseye-security main contrib non-free' \
    > /etc/apt/sources.list \
    && echo 'Acquire::Check-Valid-Until "false";' > /etc/apt/apt.conf.d/99snapshot \
    && echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries

# Install system packages and create a stable JAVA_HOME symlink
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl=7.74.0-1.3+deb11u16 \
    git=1:2.30.2-1+deb11u5 \
    unzip=6.0-26+deb11u1 \
    zip=3.0-12 \
    libglu1-mesa=9.0.1-1 \
    wget=1.21-1+deb11u2 \
    xxd=2:8.2.2434-3+deb11u3 \
    build-essential=12.9 \
    openjdk-17-jdk-headless=17.0.19+10-1~deb11u1 \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sfn "$(dirname $(dirname $(readlink -f $(which java))))" /usr/lib/jvm/java-17-openjdk

# Update Path to include all tool locations
ENV PATH=$ANDROID_SDK_ROOT/cmdline-tools/11.0/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/build-tools/36.0.0:$JAVA_HOME/bin:$PATH

# Create SDK directory with correct ownership
RUN mkdir -p $ANDROID_SDK_ROOT/cmdline-tools \
    && chown -R node:node $ANDROID_SDK_ROOT

# Download, Verify, and Install Android Command Line Tools
RUN wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/tools.zip \
    && echo "2d2d50857e4eb553af5a6dc3ad507a17adf43d115264b1afc116f95c92e5e258 /tmp/tools.zip" | sha256sum -c - \
    && unzip -X -q /tmp/tools.zip -d $ANDROID_SDK_ROOT/cmdline-tools \
    && mv $ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools $ANDROID_SDK_ROOT/cmdline-tools/11.0 \
    && rm /tmp/tools.zip

USER node

# Install SDK Components (Aligned with build.gradle)
RUN yes | sdkmanager --sdk_root=$ANDROID_SDK_ROOT --licenses \
    && sdkmanager --sdk_root=$ANDROID_SDK_ROOT \
    "platforms;android-36" \
    "build-tools;36.0.0" \
    "ndk;28.2.13676358" \
    "cmake;3.22.1" \
    "platform-tools" \
    && rm -rf $ANDROID_SDK_ROOT/cmdline-tools/tmp

COPY --chown=node:node reproducible-builds/inside-docker.sh /app/inside-docker.sh
RUN chmod +x /app/inside-docker.sh

WORKDIR /app
COPY --chown=node:node . /app