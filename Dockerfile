# 1. Base image with Digest pinning
FROM node:24-bullseye@sha256:38edad6b2e5962120f5144ff9dd3dbd223c7f140ba6fa03920d62d28b021402b

# 2. Environment Setup
ENV TZ=UTC \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
    ANDROID_SDK_ROOT=/opt/android-sdk

# 3. Update Path to include all pinned tool locations
ENV PATH=$ANDROID_SDK_ROOT/cmdline-tools/11.0/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/build-tools/35.0.0:$JAVA_HOME/bin:$PATH

# 4. Install  system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    unzip \
    zip \
    libglu1-mesa \
    wget \
    build-essential \
    openjdk-17-jdk \
    && rm -rf /var/lib/apt/lists/*

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
    "platforms;android-35" \
    "build-tools;35.0.0" \
    "ndk;27.1.12297006" \
    "platform-tools" \
    && rm -rf $ANDROID_SDK_ROOT/cmdline-tools/tmp

WORKDIR /app

COPY . /app