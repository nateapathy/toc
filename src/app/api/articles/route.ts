import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const journal = searchParams.get("journal")
  const unreadOnly = searchParams.get("unread") === "true"
  const page = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = 25

  const userId = (session.user as any).id

  const readIds = unreadOnly
    ? (await prisma.readArticle.findMany({ where: { userId }, select: { articleId: true } }))
        .map((r) => r.articleId)
        .filter(Boolean)
    : []

  const articles = await prisma.article.findMany({
    where: {
      ...(journal ? { journal: { slug: journal } } : {}),
      ...(unreadOnly ? { id: { notIn: readIds as string[] } } : {}),
    },
    include: { journal: { select: { name: true, slug: true } } },
    orderBy: { pubDate: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  })

  return NextResponse.json(articles)
}
