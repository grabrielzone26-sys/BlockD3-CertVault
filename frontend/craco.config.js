module.exports = {
  devServer: (devServerConfig) => {
    const originalBefore = devServerConfig.onBeforeSetupMiddleware;
    const originalAfter = devServerConfig.onAfterSetupMiddleware;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      if (typeof originalBefore === 'function') {
        originalBefore(devServer);
      }

      if (typeof originalAfter === 'function') {
        originalAfter(devServer);
      }

      return middlewares;
    };

    delete devServerConfig.onBeforeSetupMiddleware;
    delete devServerConfig.onAfterSetupMiddleware;

    return devServerConfig;
  },
};
