/* eslint-env node */

const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const { version } = require('./package.json')

const dist = path.join(__dirname, 'dist')

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: dist,
    filename: 'bundle.js',
  },
  plugins: [
    new CopyWebpackPlugin([
      { context: '.', from: '*.html' },
      { context: '.', from: '*.css' },
      { context: './assets', from: '*.png' },
      { context: './assets', from: '*.jpg' },
      { context: './assets', from: '*.jpeg' }
    ]),
    new HtmlWebpackPlugin({
      template: 'index.html',
      version
    })
  ],
  devtool: 'source-map',
  devServer: {
    contentBase: dist
  }
}
