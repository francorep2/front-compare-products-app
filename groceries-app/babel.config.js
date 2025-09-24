module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Importante: El plugin de reanimated debe ser el último en la lista.
      'react-native-reanimated/plugin',
    ],
  };
};