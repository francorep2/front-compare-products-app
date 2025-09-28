// babel.config.cjs  (usa .cjs si tu package.json tiene "type":"module")
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',          // si usás expo-router
      'react-native-reanimated/plugin', // SIEMPRE último
    ],
  };
};
