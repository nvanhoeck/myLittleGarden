module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@domain': './src/domain',
            '@stores': './src/stores',
            '@schemas': './src/schemas',
            '@services': './src/services',
            '@i18n': './src/i18n',
            '@styles': './src/styles',
            '@types': './src/types',
            '@utils': './src/utils',
            '@data': './src/data',
          },
        },
      ],
    ],
  };
};
