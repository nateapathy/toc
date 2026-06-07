import Parser from "rss-parser"
import { prisma } from "@/lib/db"
import { JOURNALS } from "./registry"

const parser = new Parser({
  customFields: {
    item: ["dc:description", "content:encoded", "dc:date", "dc:creator"],
  },
})

export async function pollAllJournals() {
  for (const config of JOURNALS) {
    try {
      if (config.rssUrl) {
        await pollJournalRss(config.slug, config.rssUrl)
      } else if (config.crossrefIssn) {
        await pollJournalCrossref(config.slug, config.crossrefIssn)
      }
    } catch (err) {
      console.error(`[rss] failed to poll ${config.slug}:`, err)
    }
  }
}

async function pollJournalRss(slug: string, rssUrl: string) {
  const journal = await prisma.journal.findUniqueOrThrow({ where: { slug } })
  const feed = await parser.parseURL(rssUrl)

  let created = 0
  for (const item of feed.items) {
    if (!item.link || !item.title) continue

    // Health Affairs uses dc:date; others use pubDate
    const rawDate = item.pubDate ?? (item as any)["dc:date"]
    const pubDate = rawDate ? new Date(rawDate) : new Date()

    const authors = (item as any)["dc:creator"] ?? item.creator ?? null
    const abstract = item["content:encoded"] ?? item.contentSnippet ?? null

    await prisma.article.upsert({
      where: { url: item.link },
      update: {},
      create: {
        journalId: journal.id,
        title: item.title,
        authors,
        abstract,
        url: item.link,
        pubDate,
      },
    })
    created++
  }

  console.log(`[rss] ${slug}: upserted ${created} articles`)
}

async function pollJournalCrossref(slug: string, issn: string) {
  const journal = await prisma.journal.findUniqueOrThrow({ where: { slug } })

  const res = await fetch(
    `https://api.crossref.org/journals/${issn}/works?rows=20&sort=published&order=desc&select=DOI,title,author,abstract,published,URL`,
    { headers: { "User-Agent": "toc-tracker/1.0" } }
  )
  if (!res.ok) throw new Error(`CrossRef returned ${res.status} for ${issn}`)

  const data = await res.json()
  const items = data.message.items as any[]

  let created = 0
  for (const item of items) {
    const title = item.title?.[0]
    const url = item.URL
    if (!title || !url) continue

    const authors = item.author
      ? item.author.map((a: any) => [a.given, a.family].filter(Boolean).join(" ")).join(", ")
      : null

    const dateParts = item.published?.["date-parts"]?.[0] ?? []
    const pubDate = dateParts.length
      ? new Date(dateParts[0], (dateParts[1] ?? 1) - 1, dateParts[2] ?? 1)
      : new Date()

    // CrossRef abstracts come with JATS XML tags — strip them
    const abstract = item.abstract
      ? item.abstract.replace(/<[^>]+>/g, "").trim()
      : null

    await prisma.article.upsert({
      where: { url },
      update: {},
      create: {
        journalId: journal.id,
        title,
        authors,
        abstract,
        url,
        pubDate,
      },
    })
    created++
  }

  console.log(`[crossref] ${slug}: upserted ${created} articles`)
}
