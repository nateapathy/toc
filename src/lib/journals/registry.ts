export interface JournalConfig {
  name: string
  slug: string
  // PubMed NLM ID RSS — reliable and consistent across journals
  rssUrl: string
  homeUrl: string
}

export const JOURNALS: JournalConfig[] = [
  {
    name: "Health Affairs",
    slug: "health-affairs",
    rssUrl: "https://pubmed.ncbi.nlm.nih.gov/rss/journals/8701225/?limit=20&name=health-affairs",
    homeUrl: "https://www.healthaffairs.org",
  },
  {
    name: "Health Services Research",
    slug: "health-services-research",
    rssUrl: "https://pubmed.ncbi.nlm.nih.gov/rss/journals/0053002/?limit=20&name=hsr",
    homeUrl: "https://onlinelibrary.wiley.com/journal/14756773",
  },
  {
    name: "Journal of the American Medical Informatics Association",
    slug: "jamia",
    rssUrl: "https://pubmed.ncbi.nlm.nih.gov/rss/journals/101149833/?limit=20&name=jamia",
    homeUrl: "https://academic.oup.com/jamia",
  },
]
