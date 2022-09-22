const path = require("path");

const resourceFolder = "./build/resources/main/assets/";

module.exports = {
  entry: {
    widget: "./src/main/resources/assets/js/widget.es6",
  },
  module: {
    rules: [
      {
        test: /\.(js|es6)?$/,
        use: "babel-loader",
        exclude: /node_modules/,
        include: [
          path.resolve(__dirname, "./src/main/resources/assets/js")
        ]
      }
    ]
  },
  // target: ["web", "es5"], // If targeting IE11
  resolve: {
    extensions: [".es6", ".js"]
  },
  output: {
    filename: "js/[name].js",
    path: path.resolve(__dirname, resourceFolder),
    publicPath: "auto"
  }
};
