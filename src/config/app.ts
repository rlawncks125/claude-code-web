// Application configuration
export const appConfig = {
  port: parseInt(process.env.PORT || "3000"),
  host: process.env.HOST || "0.0.0.0",
  env: process.env.NODE_ENV || "development",

  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
  },

  // API settings
  api: {
    prefix: "/api",
    version: "v1",
  },
} as const;
