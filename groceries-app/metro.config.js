// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// 👉 Si NO usás SVGs con transformer, no toques nada más.
module.exports = config;
