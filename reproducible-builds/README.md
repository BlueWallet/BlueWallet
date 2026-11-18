# Reproducible Builds

Reproducible builds for BlueWallet. Build the same APK twice and verify they're byte-for-byte identical.

## Requirements

- Docker
- Python `3.12` or higher
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (An extremely fast Python package and project manager, written in Rust - _as per the website_)

## Building the APK

```sh
cd reproducible-builds && ./build-apk.sh
```

The APK will be saved to `reproducible-builds/build/`.

> [!NOTE]
>  `build-apk.sh` clears the `build/` directory before each build. To compare two builds, copy the first APK elsewhere before running the script again.

## Comparing APKs

Use the `apkdiff.py` tool to verify two APKs are identical:

```sh
cd apkdiff
uv run apkdiff.py <first-apk> <second-apk>
```

**Example:**

```sh
uv run apkdiff.py ../build/app-1.apk ../build/app-2.apk
```

**Exit codes:**

- `0` = APKs match (build is _reproducible_)
- `1` = APKs differ
- `2` = File not found or invalid APK

If differences are found, mismatched files are extracted to `apkdiff/mismatches/` for further inspection.

### What `apkdiff` Checks

`apkdiff.py` compares APK files and ignores expected differences:

- App signing metadata (certificates, signatures)
- Bugsnag `BUILD_UUID` values
- Play Store bundle artifacts

It performs byte-by-byte comparison of all other files, with special handling for Android binary formats (manifests, resources). See [`apkdiff/apkdiff.py`](apkdiff/apkdiff.py) for implementation.

<!-- 
TODO:: write tests for apkdiff
## Running Tests

Test the apkdiff tool:

```sh
cd apkdiff
uv run pytest
```

Verbose output:

```sh
uv run pytest -v
```

See [`apkdiff/tests/test_utils.py`](apkdiff/tests/test_utils.py) for test cases. -->
