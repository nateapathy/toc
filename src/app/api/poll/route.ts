/**
 * Webhook endpoint for triggering polls via cron services (e.g. cron-job.org).
 * Protect with a shared secret in the Authorization header.
 */
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
import { pollAllJournals } from "@/lib/journals/poll-rss"
import { ingestScholarAlerts } from "@/lib/gmail/parse-scholar"

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.POLL_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Run async — return immediately so cron services don't time out
  Promise.all([pollAllJournals(), ingestScholarAlerts()]).catch(console.error)

  return NextResponse.json({ ok: true, message: "Poll started" })
}
