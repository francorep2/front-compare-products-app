// metro.config.js (en la raíz del repo)
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  return config;
})();
