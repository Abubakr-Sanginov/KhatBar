import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_URv3u4HytsGl@ep-winter-shape-ayowqsrc.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require",
  },
})
