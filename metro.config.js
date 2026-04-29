const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web imports a .wasm file as a module — tell Metro to bundle
// it as an asset instead of trying to parse it as JS.
config.resolver.assetExts.push('wasm');

module.exports = config;
