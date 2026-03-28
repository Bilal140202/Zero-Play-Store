const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Disable multipart/lazy bundle streaming — Replit's proxy does not forward
// chunked multipart HTTP responses to Expo Go on physical devices, which causes
// "Error while reading multipart response" crashes. Forcing single-response
// bundling fixes the issue without affecting hot reload or any other feature.
config.server = {
  ...config.server,
  experimentalImportBundleSupport: false,
  enhanceMiddleware: (middleware, server) => {
    return (req, res, next) => {
      // Strip the multipart Accept header Expo Go sends when lazy=true is set.
      // This forces Metro to return a single JS response instead of streaming
      // multipart chunks, which works reliably through any HTTPS proxy.
      if (req.headers && req.headers["accept"]?.includes("multipart/mixed")) {
        req.headers["accept"] = "application/javascript";
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
