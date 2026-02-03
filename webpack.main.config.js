const CopyPlugin = require("copy-webpack-plugin");
module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: "./src/main.js",
  // Put your normal webpack config below here
  module: {
    rules: require("./webpack.rules"),
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "src/server/dist", to: "server/dist" }],
    }),
  ],
  externals: [
    // Keep Node built-ins external
    "fs",
    "path",
    "os",
    "electron",

    // Treat server folder as external
    function ({ request }, callback) {
      // request could be './server/dist/index.js' or similar
      if (request.includes("server/dist")) {
        return callback(null, "commonjs " + request); // don't bundle, require at runtime
      }
      callback();
    },
  ],
};
