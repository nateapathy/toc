import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id

  await prisma.readArticle.upsert({
    where: { userId_scholarArticleId: { userId, scholarArticleId: params.id } },
    update: {},
    create: { userId, scholarArticleId: params.id },
  })

  return NextResponse.json({ ok: true })
}
