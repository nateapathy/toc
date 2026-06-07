import { PrismaClient } from "@prisma/client"
import { JOURNALS } from "../src/lib/journals/registry"

const prisma = new PrismaClient()

async function main() {
  for (const j of JOURNALS) {
    await prisma.journal.upsert({
      where: { slug: j.slug },
      update: { rssUrl: j.rssUrl, homeUrl: j.homeUrl, name: j.name },
      create: j,
    })
    console.log(`seeded journal: ${j.name}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
