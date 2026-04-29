# Android Release via GitHub Actions

## Goal

Build a signed Android APK in CI for sideload distribution. Every push to `release/production` produces a downloadable workflow artifact; every tag push (`v*`) additionally publishes a GitHub Release with the APK attached. `main` is the dev branch and does not trigger builds — promoting to `release/production` is the explicit gate for cutting an APK.

Out of scope: AAB builds, Play Store submission, iOS, web.

## Constraints

- The `android/` folder is gitignored. CI must regenerate it on every run via `npx expo prebuild`.
- The current local `android/app/build.gradle` has a stale namespace (`com.edzy.LogLeaf`) from before the project rename — confirms we cannot rely on a committed `android/` folder.
- The default Expo-generated `build.gradle` hardcodes `signingConfig signingConfigs.debug` for the release build type. Since prebuild regenerates this file on every run, any release-signing override must be re-applied each run — by an Expo config plugin, not a hand-edit.
- The user has no signing keystore yet. One must be generated locally as a one-time step.
- `app.json` is the single source of truth for version values. There is currently no `expo.android.versionCode` field — it must be added.

## Architecture

Three additions to the repo plus four GitHub secrets:

1. `.github/workflows/android-release.yml` — the workflow.
2. `plugins/with-android-signing.js` — Expo config plugin that injects a release `signingConfig` into the generated `android/app/build.gradle` at prebuild time. Reads passwords/alias from environment variables. Falls back to debug signing if env vars are absent (so local `expo run:android` still works without secrets).
3. `app.json` — add `expo.android.versionCode: 1` and reference the new plugin in the `plugins` array.

## Config Plugin: `plugins/with-android-signing.js`

Uses `@expo/config-plugins`' `withAppBuildGradle` mod to rewrite the generated `android/app/build.gradle` after prebuild emits it.

Behavior:
- Adds a `release` entry to the `signingConfigs` block. Store path: `release.keystore` (resolved relative to `android/app/`). Store password, key alias, and key password come from env vars: `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. The Gradle block uses `System.getenv(...)` so values are read at build time, not at prebuild time.
- Replaces `signingConfig signingConfigs.debug` inside the `release` build type with `signingConfig signingConfigs.release`.
- Idempotent: if the `release` signingConfig is already present, no-op.

Because the plugin uses env-var lookups inside Gradle (not at the JS prebuild step), running `expo prebuild` locally without secrets still produces a valid `build.gradle`. If you then run `gradlew assembleRelease` locally without those env vars set, the release build fails (no keystore) — desirable, since unsigned-or-debug-signed release builds are exactly what we're avoiding.

## Workflow: `.github/workflows/android-release.yml`

Single job, single workflow file. Triggers:

```yaml
on:
  push:
    branches: [release/production]
    tags: ['v*']
  workflow_dispatch:  # escape hatch for re-running without re-tagging
```

Steps (in order):

1. **Checkout** (`actions/checkout@v4`).
2. **Setup Java 17** (`actions/setup-java@v4`, distribution: `temurin`).
3. **Setup Node 20** (`actions/setup-node@v4`).
4. **Setup Bun** (`oven-sh/setup-bun@v2`).
5. **Cache Gradle** (`actions/cache@v4` keyed on `**/*.gradle*` and `**/gradle-wrapper.properties`).
6. **Install deps:** `bun install --frozen-lockfile`.
7. **Prebuild:** `npx expo prebuild --platform android --clean`. Generates `android/` with the signing-config plugin applied and version values from `app.json`.
8. **Decode keystore:**
   ```bash
   echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > android/app/release.keystore
   ```
9. **Build APK:** `cd android && ./gradlew assembleRelease --no-daemon`. Env vars `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` are passed to the step. Output: `android/app/build/outputs/apk/release/app-release.apk` — a single universal APK containing all ABIs (arm64-v8a, armeabi-v7a, x86, x86_64). Expected size ~50–80 MB; acceptable for sideload.
10. **Read version** from `app.json` into a step output (used to name artifact and Release).
11. **Upload artifact** (`actions/upload-artifact@v4`): always runs. Name: `pit-stop-${{ steps.version.outputs.name }}-${{ github.sha }}`. Path: the APK. Retention: default (90 days).
12. **Create GitHub Release** (`softprops/action-gh-release@v2`): runs only `if: startsWith(github.ref, 'refs/tags/')`. Tag name from the ref. Title = tag name. Body = auto-generated release notes (`generate_release_notes: true`). Attaches the APK.

## Secrets

Repo settings → Secrets and variables → Actions:

| Secret | Purpose |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded contents of the `.keystore` file |
| `ANDROID_KEYSTORE_PASSWORD` | Store password (entered during keytool gen) |
| `ANDROID_KEY_ALIAS` | Key alias (e.g., `pit-stop`) |
| `ANDROID_KEY_PASSWORD` | Key password (often same as store password) |

## One-time User Setup

Before the first CI run, the user must:

1. **Generate the keystore locally** (any directory outside the repo):
   ```
   keytool -genkeypair -v -keystore pit-stop-release.keystore \
     -alias pit-stop -keyalg RSA -keysize 2048 -validity 10000
   ```
   Prompts for store password, name/org info, and confirms the key password.
2. **Back up the keystore file** to a password manager or encrypted backup location. Losing it means future builds cannot upgrade-install over installed APKs — every signature change forces uninstall+reinstall and data loss.
3. **Base64-encode the keystore** (Windows PowerShell):
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("pit-stop-release.keystore")) `
     | Set-Content keystore.b64.txt
   ```
4. **Add the four secrets** in GitHub repo settings using the values from steps 1 and 3.
5. **Delete the local `keystore.b64.txt`** once the secret is uploaded.

## Versioning

- `app.json` carries both version fields:
  - `expo.version` — semver string, e.g., `1.0.0`. Becomes Android `versionName`.
  - `expo.android.versionCode` — monotonic integer, starting at `1`. Becomes Android `versionCode`.
- To cut a tagged release: bump one or both fields, commit, `git tag v<version> && git push --tags`.
- Builds triggered by `release/production` pushes reuse whatever values are currently in `app.json`. Fine for sideload (signature-matching APKs upgrade-install in place).

## Trigger Behavior

| Event | Build runs? | Artifact uploaded? | GitHub Release created? |
|---|---|---|---|
| Push to `main` | No | — | — |
| Push to `release/production` | Yes | Yes | No |
| Push tag matching `v*` | Yes | Yes | Yes |
| Manual `workflow_dispatch` from `release/production` | Yes | Yes | No |
| Manual `workflow_dispatch` from a tag ref | Yes | Yes | Yes (re-run case) |

The typical flow: develop on `main`, then when ready to cut an APK, promote to `release/production` (`git checkout release/production && git merge main && git push`). To turn a build into a public Release, push a `v*` tag.

## Failure Modes & Notes

- **Missing keystore secret:** decode step fails fast with non-zero exit. Workflow fails before Gradle runs.
- **Mismatched keystore password:** Gradle signing task fails with a clear error. Fix the secret and re-run.
- **Local `expo run:android`** still works: the config plugin's signing block uses `System.getenv(...)`; without env vars set, that signing config is unusable but the debug build doesn't reference it.
- **First CI run is slow** (~8–12 min cold) — Android SDK download + Gradle dependencies. Subsequent runs hit the Gradle cache and finish in ~5–7 min.
- **Tag conventions:** the workflow matches `v*` (e.g., `v1.0.1`, `v1.0.0-beta`). Non-`v` tags do not trigger.
- **Forgetting to bump `versionCode`:** Android refuses to upgrade-install an APK whose `versionCode` is ≤ the installed version's. If you tag a new release without bumping `versionCode`, existing users must uninstall and reinstall (losing local SQLite data). No CI guardrail enforces this — discipline only.

## Testing the Setup

After the workflow file lands on `main`, validation steps:

1. Create the `release/production` branch from `main` and push it (`git checkout -b release/production && git push -u origin release/production`). Workflow runs and produces a downloadable artifact in the Actions tab.
2. Download the artifact, install on a device (`adb install app-release.apk`), confirm app launches.
3. Bump `app.json` version to `1.0.1` and `versionCode` to `2` on `main`, commit, push. Promote to `release/production` (`git checkout release/production && git merge main && git push`). Then `git tag v1.0.1 && git push origin v1.0.1`. The tag push triggers a workflow run that creates a GitHub Release with the APK attached.
4. On the device, install the v1.0.1 APK over v1.0.0. Should upgrade in place without uninstall (proves signing is consistent).
