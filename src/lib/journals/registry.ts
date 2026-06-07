export interface JournalConfig {
  name: string
  slug: string
  rssUrl: string | null       // null = use crossrefIssn instead
  crossrefIssn: string | null // for journals where RSS is unavailable
  homeUrl: string
}

export const JOURNALS: JournalConfig[] = [
  {
    name: "Health Affairs",
    slug: "health-affairs",
    rssUrl: "https://www.healthaffairs.org/action/showFeed?type=etoc&feed=rss&jc=hlthaff",
    crossrefIssn: null,
    homeUrl: "https://www.healthaffairs.org",
  },
  {
    name: "Health Services Research",
    slug: "health-services-research",
    rssUrl: "https://onlinelibrary.wiley.com/feed/14756773/most-recent",
    crossrefIssn: null,
    homeUrl: "https://onlinelibrary.wiley.com/journal/14756773",
  },
  {
    name: "Journal of the American Medical Informatics Association",
    slug: "jamia",
    rssUrl: null,
    crossrefIssn: "1527-974X",
    homeUrl: "https://academic.oup.com/jamia",
  },
]
