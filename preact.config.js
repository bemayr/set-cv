export default {
  webpack(config, env, helpers) {
    if (env.production) {
      config.output.publicPath = "https://bemayr.github.io/set-cv/";
    }

    // use the public path in your app as 'process.env.PUBLIC_PATH'
    config.plugins.push(
      new helpers.webpack.DefinePlugin({
        "process.env.PUBLIC_PATH": JSON.stringify(
          config.output.publicPath || "/"
        ),
      })
    );
  },
};
