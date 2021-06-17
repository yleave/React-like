const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/main.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  mode: 'development',
  devServer: {
    hot: true,  // 开启热更新，当 entry 的文件变化之后会自动运行 webpack 并刷新页面，若想要 html 和 css 也被监听的话需要自己再配置
    open: true, // 自动打开页面
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
        title: 'react app',
        template: './src/index.html'
    }),
    new webpack.HotModuleReplacementPlugin(),
  ],
};








