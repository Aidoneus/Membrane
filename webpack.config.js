const path = require("path");
const ESLintPlugin = require("eslint-webpack-plugin");

module.exports = {
  devtool: "source-map",
  target: "node",
  mode: "production",
  entry: {
    membrane: "./src/membrane.js",
  },
  output: {
    filename: "[name].min.js",
    path: path.resolve(__dirname),
  },
  plugins: [
    new ESLintPlugin({
      fix: true,
      extensions: ["ts", "js"],
      useEslintrc: false,
      overrideConfigFile: ".eslintrc.json",
    }),
  ],
  optimization: {
    minimize: true,
  },
};
