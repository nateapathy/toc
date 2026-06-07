import { google } from "googleapis"
import { prisma } from "@/lib/db"

function getGmailClient() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2.setCredentials({ refresh_token: process.env.SCHOLAR_GMAIL_REFRESH_TOKEN })
  return google.gmail({ version: "v1", auth: oauth2 })
}

export async function ingestScholarAlerts() {
  const gmail = getGmailClient()

  // Fetch unread Scholar alert emails
  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: "from:scholaralerts-noreply@google.com is:unread",
    maxResults: 50,
  })

  const messages = listRes.data.messages ?? []
  console.log(`[scholar] found ${messages.length} unread alert emails`)

  for (const msg of messages) {
    try {
      await processMessage(gmail, msg.id!)
      // Mark as read after successful processing
      await gmail.users.messages.modify({
        userId: "me",
        id: msg.id!,
        requestBody: { removeLabelIds: ["UNREAD"] },
      })
    } catch (err) {
      console.error(`[scholar] failed to process message ${msg.id}:`, err)
    }
  }
}

async function processMessage(gmail: ReturnType<typeof google.gmail>, messageId: string) {
  // Skip if already processed
  const existing = await prisma.scholarAlert.findUnique({ where: { gmailId: messageId } })
  if (existing) return

  const res = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" })
  const msg = res.data

  const headers = msg.payload?.headers ?? []
  const subject = headers.find((h) => h.name === "Subject")?.value ?? "(no subject)"
  const dateHeader = headers.find((h) => h.name === "Date")?.value
  const receivedAt = dateHeader ? new Date(dateHeader) : new Date()

  // Decode body
  const body = extractBody(msg.payload)
  const articles = parseArticlesFromBody(body)

  // Extract query from subject line: "Scholar Alert - [query]"
  const query = subject.replace(/^Google Scholar Alert\s*[-–]\s*/i, "").trim() || null

  await prisma.scholarAlert.create({
    data: {
      gmailId: messageId,
      subject,
      query,
      receivedAt,
      articles: {
        create: articles,
      },
    },
  })

  console.log(`[scholar] processed alert "${subject}" with ${articles.length} articles`)
}

function extractBody(payload: any): string {
  if (!payload) return ""

  // Prefer text/html for richer link extraction
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8")
  }
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8")
  }
  for (const part of payload.parts ?? []) {
    const result = extractBody(part)
    if (result) return result
  }
  return ""
}

interface ParsedArticle {
  title: string
  authors: string | null
  snippet: string | null
  url: string
}

function parseArticlesFromBody(body: string): ParsedArticle[] {
  const articles: ParsedArticle[] = []

  // Scholar alert HTML structure: each article is an <h3> with a link, followed by author/snippet divs
  // This regex targets the consistent pattern Google has used for years
  const articlePattern = /<h3[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>([\s\S]*?)(?=<h3|$)/gi

  let match
  while ((match = articlePattern.exec(body)) !== null) {
    const rawUrl = match[1]
    const rawTitle = match[2].replace(/<[^>]+>/g, "").trim()
    const afterTitle = match[3]

    // Google wraps Scholar alert links; extract the actual URL from the `q` param if present
    const url = extractScholarUrl(rawUrl)
    if (!url) continue

    // Authors typically appear in a <div class="gse_alrt_sni"> or similar
    const authorMatch = afterTitle.match(/<span[^>]*class="[^"]*author[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
    const authors = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, "").trim() : null

    // Snippet
    const snippetMatch = afterTitle.match(/<div[^>]*class="[^"]*sni[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : null

    if (rawTitle) {
      articles.push({ title: rawTitle, authors, snippet, url })
    }
  }

  return articles
}

function extractScholarUrl(href: string): string | null {
  try {
    // Scholar wraps links as https://scholar.google.com/scholar_url?url=<actual>&...
    const parsed = new URL(href)
    const inner = parsed.searchParams.get("url") ?? parsed.searchParams.get("q")
    return inner ?? href
  } catch {
    return href
  }
}
