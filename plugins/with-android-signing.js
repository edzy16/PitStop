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
