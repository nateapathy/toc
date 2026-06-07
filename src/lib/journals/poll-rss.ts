import Parser from "rss-parser"
import { prisma } from "@/lib/db"
import { JOURNALS } from "./registry"

const parser = new Parser({
  customFields: {
    item: ["dc:description", "content:encoded"],
  },
})

export async function pollAllJournals() {
  for (const config of JOURNALS) {
    try {
      await pollJournal(config.slug)
    } catch (err) {
      console.error(`[rss] failed to poll ${config.slug}:`, err)
    }
  }
}

async function pollJournal(slug: string) {
  const journal = await prisma.journal.findUniqueOrThrow({ where: { slug } })
  const feed = await parser.parseURL(journal.rssUrl)

  let created = 0
  for (const item of feed.items) {
    if (!item.link || !item.title) continue

    const pubDate = item.pubDate ? new Date(item.pubDate) : new Date()

    await prisma.article.upsert({
      where: { url: item.link },
      update: {},
      create: {
        journalId: journal.id,
        title: item.title,
        authors: item.creator ?? null,
        abstract: item["content:encoded"] ?? item.contentSnippet ?? null,
        url: item.link,
        pubDate,
      },
    })
    created++
  }

  console.log(`[rss] ${slug}: upserted ${created} articles`)
}
