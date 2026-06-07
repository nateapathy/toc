import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const unreadOnly = searchParams.get("unread") === "true"
  const page = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = 25
  const userId = (session.user as any).id

  const readIds = unreadOnly
    ? (
        await prisma.readArticle.findMany({
          where: { userId, scholarArticleId: { not: null } },
          select: { scholarArticleId: true },
        })
      )
        .map((r) => r.scholarArticleId)
        .filter(Boolean)
    : []

  const articles = await prisma.scholarArticle.findMany({
    where: unreadOnly ? { id: { notIn: readIds as string[] } } : {},
    include: { alert: { select: { query: true, receivedAt: true } } },
    orderBy: { alert: { receivedAt: "desc" } },
    skip: (page - 1) * limit,
    take: limit,
  })

  return NextResponse.json(articles)
}
