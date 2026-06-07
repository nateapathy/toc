/**
 * Entry point for the daily poll cron job.
 * Run with: npm run poll
 * Or schedule via cron: 0 7 * * * cd /path/to/app && npm run poll
 */
import { pollAllJournals } from "./journals/poll-rss"
import { ingestScholarAlerts } from "./gmail/parse-scholar"
import { prisma } from "./db"

async function main() {
  console.log("[poll] starting daily poll", new Date().toISOString())

  await pollAllJournals()

  if (process.env.SCHOLAR_GMAIL_REFRESH_TOKEN) {
    await ingestScholarAlerts()
  } else {
    console.log("[poll] skipping Scholar alerts — SCHOLAR_GMAIL_REFRESH_TOKEN not set")
  }

  console.log("[poll] done", new Date().toISOString())
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("[poll] fatal error:", err)
  process.exit(1)
})
