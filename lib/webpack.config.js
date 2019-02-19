var path = require('path');

module.exports = {
  node: {
    fs: "empty"
  },
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'saito-lib.js',
    library: 'saito-lib',
    libraryTarget: 'commonjs2'
  }
};

