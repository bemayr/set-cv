export default {
    webpack(config, env, helpers) {
        if (env.production) {
            config.output.publicPath = 'https://bemayr.github.io/set-cv/';
        }
    },
};
