const webpack = require('webpack');
const dotenv = require('dotenv');
const path = require('path');

module.exports = function override(config) {
  // Ensure webpack 5 compatibility with Node.js core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    path: require.resolve('path-browserify'),
    os: require.resolve('os-browserify/browser'),
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    assert: require.resolve('assert/'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    url: require.resolve('url/'),
    buffer: require.resolve('buffer/'),
    util: require.resolve('util/'),
    vm: require.resolve('vm-browserify'), // Add this line to fix the vm error
    fs: false,
    net: false,
    tls: false
  };

  // Add polyfills plugin
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  );

  // Resolve 'process/browser' issue
  config.resolve.alias = {
    ...config.resolve.alias,
    'process/browser': require.resolve('process/browser')
  };

  // Load environment variables from .env file
  const env = dotenv.config().parsed || {};

  // Method 1: Define individual environment variables (recommended)
  const envKeys = Object.keys(env).reduce((prev, next) => {
    prev[`process.env.${next}`] = JSON.stringify(env[next]);
    return prev;
  }, {});

  // Add environment variables from system
  Object.keys(process.env).forEach(key => {
    if (!envKeys[`process.env.${key}`]) {
      envKeys[`process.env.${key}`] = JSON.stringify(process.env[key]);
    }
  });

  // Add Webpack plugin to define environment variables
  config.plugins.push(
    new webpack.DefinePlugin(envKeys)
  );

  // Alternative Method 2: If you still get conflicts, use this instead:
  // config.plugins = config.plugins.map(plugin => {
  //   if (plugin.constructor.name === 'DefinePlugin') {
  //     // Merge with existing DefinePlugin
  //     return new webpack.DefinePlugin({
  //       ...plugin.definitions,
  //       ...envKeys
  //     });
  //   }
  //   return plugin;
  // });

  return config;
};