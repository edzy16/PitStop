# Android Release via GitHub Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up GitHub Actions CI to build a signed Android APK for sideload distribution — every push to `release/production` produces a downloadable workflow artifact, and every `v*` tag push additionally publishes a GitHub Release with the APK attached. `main` is the dev branch and does not trigger builds.

**Architecture:** A single workflow job on `ubuntu-latest` checks out the repo, regenerates the gitignored `android/` folder via `npx expo prebuild`, decodes a base64 keystore from secrets, then runs `./gradlew assembleRelease`. A small Expo config plugin (`plugins/with-android-signing.js`) injects a release `signingConfig` into the generated `app/build.gradle` at prebuild time, reading credentials from environment variables. Versions come from `app.json` (`expo.version` and a new `expo.android.versionCode` field).

**Tech Stack:** GitHub Actions (`ubuntu-latest`), Java 17 (Temurin), Node 20, Bun, Expo 55, `@expo/config-plugins` (already a transitive dep of `expo`), Gradle, `actions/upload-artifact@v4`, `softprops/action-gh-release@v2`.

**Spec:** [docs/superpowers/specs/2026-04-29-android-release-github-actions-design.md](../specs/2026-04-29-android-release-github-actions-design.md)

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `app.json` | Modify | Add `expo.android.versionCode: 1`; reference the new plugin in `plugins` array |
| `plugins/with-android-signing.js` | Create | Expo config plugin that injects release signingConfig into generated `android/app/build.gradle` |
| `.github/workflows/android-release.yml` | Create | CI workflow that builds and releases the APK |

No tests are added for the workflow itself — verification is by running `expo prebuild` locally to confirm the plugin emits correct Gradle, and by triggering the workflow on a real push.

---

## Task 1: Add `versionCode` to `app.json`

Android requires a monotonic integer `versionCode`. Currently absent from `app.json`, so prebuild defaults it to `1`. Making the field explicit prevents accidental resets and gives the user a clear knob to bump per release.

**Files:**
- Modify: `app.json` (the `expo.android` object)

- [ ] **Step 1: Add `versionCode` field**

Open `app.json` and add `"versionCode": 1` to the `expo.android` object. The result should look like:

```json
"android": {
  "adaptiveIcon": {
    "backgroundColor": "#E6F4FE",
    "foregroundImage": "./assets/images/android-icon-foreground.png",
    "backgroundImage": "./assets/images/android-icon-background.png",
    "monochromeImage": "./assets/images/android-icon-monochrome.png"
  },
  "predictiveBackGestureEnabled": false,
  "package": "com.edzy.pitstop",
  "versionCode": 1
},
```

- [ ] **Step 2: Verify the JSON parses and the field is readable**

Run: `node -p "require('./app.json').expo.android.versionCode"`
Expected output: `1`

- [ ] **Step 3: Commit**

```bash
git add app.json
git commit -m "build(android): add versionCode field to app.json"
```

---

## Task 2: Create the Expo config plugin

Plugin that injects a `release` `signingConfig` into `android/app/build.gradle` after Expo's prebuild step generates it. Reads credentials from `System.getenv(...)` at Gradle-build time, with empty-string fallbacks so configure-time evaluation never throws when the env vars are absent (e.g., during local debug builds).

**Files:**
- Create: `plugins/with-android-signing.js`

- [ ] **Step 1: Create the plugin file**

Create `plugins/with-android-signing.js` with these exact contents:

```js
const { withAppBuildGradle } = require('@expo/config-plugins');

const RELEASE_SIGNING_BLOCK = `        release {
            storeFile file('release.keystore')
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD') ?: ''
            keyAlias System.getenv('ANDROID_KEY_ALIAS') ?: ''
            keyPassword System.getenv('ANDROID_KEY_PASSWORD') ?: ''
        }
`;

function injectReleaseSigning(contents) {
  if (contents.includes("storeFile file('release.keystore')")) {
    return contents;
  }

  const debugBlockEnd = /(signingConfigs\s*\{\s*debug\s*\{[^}]*\}\s*\n)/;
  if (!debugBlockEnd.test(contents)) {
    throw new Error(
      "with-android-signing: could not locate signingConfigs.debug block in app/build.gradle"
    );
  }
  contents = contents.replace(debugBlockEnd, `$1${RELEASE_SIGNING_BLOCK}`);

  const releaseBuildType = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!releaseBuildType.test(contents)) {
    throw new Error(
      "with-android-signing: could not locate release buildType signingConfig assignment"
    );
  }
  contents = contents.replace(releaseBuildType, '$1signingConfig signingConfigs.release');

  return contents;
}

const withAndroidSigning = (config) => {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = injectReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};

module.exports = withAndroidSigning;
```

- [ ] **Step 2: Verify the file loads as a CommonJS module**

Run: `node -e "const p = require('./plugins/with-android-signing.js'); if (typeof p !== 'function') process.exit(1); console.log('ok');"`
Expected output: `ok`

- [ ] **Step 3: Unit-check the regex on the existing build.gradle**

Run:

```bash
node -e "
const fs = require('fs');
const inject = require('./plugins/with-android-signing.js');
const src = fs.readFileSync('android/app/build.gradle', 'utf8');
// Reach into the plugin's internal function via re-require trick — simpler: just re-implement check
const out = src.replace(/(signingConfigs\s*\{\s*debug\s*\{[^}]*\}\s*\n)/, '\$1RELEASE_PLACEHOLDER');
if (!out.includes('RELEASE_PLACEHOLDER')) { console.error('FAIL: anchor regex did not match'); process.exit(1); }
console.log('anchor OK');
"
```

Expected output: `anchor OK`

(This pre-flights the regex against the local stale `android/` folder. It will be regenerated fresh in Task 3.)

- [ ] **Step 4: Commit**

```bash
git add plugins/with-android-signing.js
git commit -m "build(android): add config plugin for release signing"
```

---

## Task 3: Register plugin in `app.json` and verify locally

Wire the plugin into the Expo config so prebuild runs it, then regenerate `android/` locally and confirm the output Gradle has the injected release block.

**Files:**
- Modify: `app.json` (add to `expo.plugins` array)

- [ ] **Step 1: Add plugin reference to `app.json`**

In `app.json`, append `"./plugins/with-android-signing"` to the `expo.plugins` array. Result:

```json
"plugins": [
  "expo-router",
  [
    "expo-splash-screen",
    {
      "backgroundColor": "#208AEF",
      "android": {
        "image": "./assets/images/splash-icon.png",
        "imageWidth": 76
      }
    }
  ],
  "expo-sqlite",
  "./plugins/with-android-signing"
],
```

- [ ] **Step 2: Regenerate `android/` via prebuild**

Run: `npx expo prebuild --platform android --clean`

Expected: command exits with code 0; the message includes a line like "✔ Finished prebuild" or similar.

- [ ] **Step 3: Verify the release signingConfig was injected**

Run:

```bash
grep -n "release.keystore" android/app/build.gradle
grep -n "signingConfig signingConfigs.release" android/app/build.gradle
```

Expected: each command prints exactly one matching line. The first should be inside a `release { ... }` block under `signingConfigs`, the second inside the `release { ... }` build type.

- [ ] **Step 4: Verify the package and version were synced from `app.json`**

Run:

```bash
grep -n "applicationId" android/app/build.gradle
grep -n "versionCode" android/app/build.gradle
grep -n "versionName" android/app/build.gradle
```

Expected output (line numbers may vary):
- `applicationId 'com.edzy.pitstop'`
- `versionCode 1`
- `versionName "1.0.0"`

- [ ] **Step 5: Confirm `android/` is still gitignored**

Run: `git status --porcelain android/ | head -5`
Expected: empty output (no entries — `.gitignore` rule `/android` is excluding it).

- [ ] **Step 6: Commit the `app.json` change**

```bash
git add app.json
git commit -m "build(android): register signing plugin in expo config"
```

---

## Task 4: Create the GitHub Actions workflow

Single workflow file with one job. Triggers on push to `main`, push of `v*` tags, and `workflow_dispatch`. Always uploads an APK artifact; only creates a GitHub Release when triggered by a tag.

**Files:**
- Create: `.github/workflows/android-release.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/android-release.yml` with these exact contents:

```yaml
name: Android Release Build

on:
  push:
    branches: [release/production]
    tags: ['v*']
  workflow_dispatch:

jobs:
  build:
    name: Build Android APK
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Java 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: gradle-${{ runner.os }}-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
          restore-keys: |
            gradle-${{ runner.os }}-

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Expo prebuild (Android)
        run: npx expo prebuild --platform android --clean

      - name: Decode keystore
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: |
          if [ -z "$ANDROID_KEYSTORE_BASE64" ]; then
            echo "::error::ANDROID_KEYSTORE_BASE64 secret is not set"
            exit 1
          fi
          echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > android/app/release.keystore
          echo "Keystore size: $(wc -c < android/app/release.keystore) bytes"

      - name: Build release APK
        env:
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        working-directory: android
        run: ./gradlew assembleRelease --no-daemon

      - name: Read app version
        id: version
        run: |
          VERSION=$(node -p "require('./app.json').expo.version")
          echo "name=$VERSION" >> "$GITHUB_OUTPUT"

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: pit-stop-${{ steps.version.outputs.name }}-${{ github.sha }}
          path: android/app/build/outputs/apk/release/app-release.apk
          if-no-files-found: error

      - name: Create GitHub Release
        if: startsWith(github.ref, 'refs/tags/')
        uses: softprops/action-gh-release@v2
        with:
          files: android/app/build/outputs/apk/release/app-release.apk
          generate_release_notes: true
```

- [ ] **Step 2: Validate the YAML parses**

Run: `bunx --bun js-yaml@4 .github/workflows/android-release.yml > /dev/null && echo ok`

Expected output: `ok` (after a one-time `js-yaml` package fetch). If YAML is malformed, you'll see a parse error pointing to the offending line — fix indentation and rerun. (If `bunx` can't fetch the package due to network constraints, skip this step; the actual workflow run in Task 6 will surface any syntax error.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/android-release.yml
git commit -m "ci(android): add release workflow for APK builds and releases"
```

---

## Task 5: Generate keystore and configure GitHub secrets (one-time, manual)

This task is performed by the user outside the codebase. No commits result from it. Document the steps so they're reproducible later (e.g., for a fresh clone or rotating secrets).

**Files:** None (manual steps only).

- [ ] **Step 1: Generate the keystore**

Run from any directory **outside** the repo (e.g., `~/keystores/`):

```
keytool -genkeypair -v -keystore pit-stop-release.keystore -alias pit-stop -keyalg RSA -keysize 2048 -validity 10000
```

The tool will prompt for:
- A keystore password (store password) — pick one and remember it.
- Your name, organization, city, state, country code (only the country code must be 2 letters; others can be any text).
- A key password — when prompted "press RETURN if same as keystore password", just press RETURN to use the same password (simplifies the secrets later).

Expected: a file `pit-stop-release.keystore` is created in the current directory. Output ends with "Storing pit-stop-release.keystore".

- [ ] **Step 2: Back up the keystore**

Copy `pit-stop-release.keystore` to a permanent safe location:
- Password manager (1Password, Bitwarden) as an attachment, OR
- Encrypted backup volume / USB drive.

**Critical:** if this file is ever lost, future builds cannot upgrade-install over installed APKs. Users would need to uninstall+reinstall, losing local SQLite data.

- [ ] **Step 3: Base64-encode the keystore**

From the directory containing the keystore, run in PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("pit-stop-release.keystore")) | Set-Content keystore.b64.txt
```

Expected: a file `keystore.b64.txt` containing one long base64 string (no newlines).

- [ ] **Step 4: Add GitHub repo secrets**

In GitHub: navigate to the repo → Settings → Secrets and variables → Actions → New repository secret.

Add four secrets (names exactly as below, no leading/trailing whitespace in values):

| Name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Contents of `keystore.b64.txt` (the entire base64 string) |
| `ANDROID_KEYSTORE_PASSWORD` | The keystore password from Step 1 |
| `ANDROID_KEY_ALIAS` | `pit-stop` |
| `ANDROID_KEY_PASSWORD` | The key password from Step 1 (same as keystore password if you pressed RETURN) |

Verify: the Secrets page should now list all four under "Repository secrets".

- [ ] **Step 5: Delete the local base64 file**

Run (from where you generated it):

```
Remove-Item keystore.b64.txt
```

Expected: file is gone. The original `.keystore` file remains in your safe backup location only.

- [ ] **Step 6: No git commit needed for this task** — all changes are external (in GitHub repo settings and on the user's machine).

---

## Task 6: First end-to-end CI run

Land the workflow on `main`, then create the `release/production` branch — pushing it triggers the first build.

**Files:** None (verification only).

- [ ] **Step 1: Push the implementation commits to `main`**

Make sure the Task 1–4 commits are pushed:

```bash
git push origin main
```

This does NOT trigger a build (main is not in the workflow's trigger list).

- [ ] **Step 2: Create and push the `release/production` branch**

```bash
git checkout -b release/production
git push -u origin release/production
```

This creates the branch from current `main` and pushes it. Because the workflow file is now present on `release/production`, the push triggers the first build.

(For future builds, switch to `release/production` and `git merge main`, then push — see Task 7.)

- [ ] **Step 3: Watch the workflow**

Open the repo on GitHub → Actions tab → "Android Release Build" workflow → click the latest run.

Expected: all steps succeed (green checkmarks). The "Build release APK" step is the longest (~5–10 min on cold cache, ~3–5 min cached).

If the run fails, common issues:
- `Decode keystore` fails with "ANDROID_KEYSTORE_BASE64 secret is not set" → re-check Task 5 Step 4.
- Gradle signing task fails → password mismatch; re-verify the password values in Secrets.
- Prebuild fails to find the plugin → check the path in `app.json` matches `./plugins/with-android-signing` exactly.

- [ ] **Step 4: Download and inspect the artifact**

In the run's Summary page, scroll to "Artifacts" → click `pit-stop-1.0.0-<sha>` → a `.zip` downloads. Unzip it. The `app-release.apk` inside should be ~50–80 MB.

- [ ] **Step 5: Verify the APK signature is the release key (not debug)**

Run (Windows, requires Android SDK build-tools on PATH; if not, skip this step and rely on Step 6 install behavior):

```
apksigner verify --print-certs app-release.apk
```

Expected: certificate DN matches the values you entered during keystore generation (e.g., `CN=Edwin Siby`). If you see `CN=Android Debug`, the signing didn't take — re-check the plugin output in the workflow logs.

- [ ] **Step 6: Install on a device**

Connect an Android device (USB debugging enabled) and run:

```
adb install app-release.apk
```

Expected: `Success`. App launches and behaves identically to a `bun run android` debug build.

- [ ] **Step 7: No commit** — this is verification only.

---

## Task 7: Verify a tagged release end-to-end

Cut a real `v1.0.1` tag and confirm the GitHub Release path works. This validates the conditional release-creation step and the `main` → `release/production` promotion flow.

**Files:**
- Modify: `app.json` (bump version)

- [ ] **Step 1: Bump version in `app.json` on `main`**

```bash
git checkout main
```

Then change `expo.version` from `"1.0.0"` to `"1.0.1"` and `expo.android.versionCode` from `1` to `2` in `app.json`.

- [ ] **Step 2: Commit and push to `main`**

```bash
git add app.json
git commit -m "chore(release): bump version to 1.0.1"
git push origin main
```

This does NOT trigger a build (main is not a build trigger).

- [ ] **Step 3: Promote to `release/production`**

```bash
git checkout release/production
git merge --ff-only main
git push origin release/production
```

This triggers an artifact-only build. Wait for it to finish, or proceed to tagging in parallel.

- [ ] **Step 4: Create and push the tag from `release/production`**

```bash
git tag v1.0.1
git push origin v1.0.1
```

This triggers a second workflow run keyed to the tag.

- [ ] **Step 5: Verify the GitHub Release was created**

Open the repo on GitHub → Releases (right sidebar on the main page, or `/releases` URL).

Expected: a release titled `v1.0.1` is listed. Its body contains auto-generated notes (commit list since previous tag, or "Initial release" content). The APK is attached as `app-release.apk` in the assets section.

- [ ] **Step 6: Download the released APK and install over the previous version**

On a device that has v1.0.0 installed:

```
adb install -r app-release.apk
```

Expected: `Success` (the `-r` flag means "reinstall, keep data"). App launches with existing data intact.

If install fails with `INSTALL_FAILED_VERSION_DOWNGRADE`, you forgot to bump `versionCode` — verify Step 1 set it to `2`.

If install fails with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, signatures don't match — the keystore in Secrets isn't the same one used for the previous build.

- [ ] **Step 7: No additional commit** — version bump was already committed in Step 2.

---

## Summary of Deliverables

After all tasks complete, the repo will have:
- `app.json` with `expo.android.versionCode` and the signing plugin registered.
- `plugins/with-android-signing.js` — the config plugin.
- `.github/workflows/android-release.yml` — the CI workflow.
- A GitHub repository configured with 4 Actions secrets.
- A signing keystore in the user's secure backup (outside the repo).
- A first GitHub Release at `v1.0.1` with the APK attached.

Future releases require: bump `app.json` version + versionCode on `main` → commit → push → `git checkout release/production && git merge main && git push` (artifact build) → `git tag vX.Y.Z && git push --tags` (GitHub Release).
