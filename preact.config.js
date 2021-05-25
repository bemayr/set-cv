export default {
  webpack(config, env, helpers) {
    if (env.production) {
      config.output.publicPath = "/set-cv/";
    }
  },
};
