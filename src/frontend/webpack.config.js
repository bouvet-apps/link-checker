const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require("path");

const resourceFolder = "../../build/resources/main/assets/";

const fs = require("fs");

let appName = "defaultAppName";
const lines = fs.readFileSync("../../gradle.properties", "utf-8").split("\n");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith("appName")) {
    appName = line.substring(line.indexOf("=") + 1).trim();
    break;
  }
}

module.exports = {
  entry: {
    main: "./scripts/main.jsx"
  },
  devtool: "eval-source-map",
  plugins: [
    // new MiniCssExtractPlugin({
    //   filename: "css/[name].css",
    //   allChunks: true
    // })
  ],
  module: {
    rules: [
      {
        test: /\.(es6|jsx)?$/,
        use: "babel-loader",
        exclude: /node_modules/
      },
      {
        test: /\.(eot|ttf|woff|woff2)$/,
        use: [
          {
            loader: "file-loader?name=fonts/[name].[ext]&publicPath=../"
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [".js", ".json", ".jsx", "ts", "tsx"]
  },
  output: {
    filename: "js/[name].js",
    path: path.resolve(__dirname, resourceFolder),
    chunkFilename: "js/[name].chunk.js",
    publicPath: `/_/asset/${appName}:[hash]/`
  }
};
