export const auditConfig = {
  baseUrl: process.env.BASE_URL || "https://staging.leads.epic.dm",
  auth: {
    loginUrl: process.env.LOGIN_URL || "/sign-in",
    email: process.env.AUTH_EMAIL || "eric@epic.dm",
    password: process.env.AUTH_PASSWORD || "Loung3@dmin!!!!"
  },
  crawl: {
    maxPages: Number(process.env.MAX_PAGES || 200),
    maxDepth: Number(process.env.MAX_DEPTH || 6),
    concurrency: Number(process.env.CONCURRENCY || 4),
    excludePatterns: [
      /\/logout/i,
      /\/api\//i,
      /\.pdf$/i,
      /\.zip$/i
    ]
  },
  outputDir: "output"
};
