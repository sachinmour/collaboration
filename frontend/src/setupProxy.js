const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/get-document/:id",
    createProxyMiddleware({
      target: "http://localhost:5000",
    })
  );
  app.use(
    "/sockjs-node",
    createProxyMiddleware({
      target: "http://localhost:5000",
      ws: true,
      changeOrigin: true,
    })
  );
  app.use(
    "/socket.io/",
    createProxyMiddleware({
      target: "http://localhost:5000",
      ws: true,
      changeOrigin: true,
    })
  );
};
