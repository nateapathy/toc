"use client"

import { useSession, signIn } from "next-auth/react"
import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"

// ── Types ────────────────────────────────────────────────────────────────────

interface JournalArticle {
  id: string
  title: string
  authors: string | null
  abstract: string | null
  url: string
  pubDate: string
  journal: { name: string; slug: string }
}

interface ScholarArticle {
  id: string
  title: string
  authors: string | null
  snippet: string | null
  url: string
  alert: { query: string | null; receivedAt: string }
}

type Tab = "journals" | "scholar"

const JOURNALS = [
  { slug: "health-affairs", label: "Health Affairs" },
  { slug: "health-services-research", label: "Health Services Research" },
  { slug: "jamia", label: "JAMIA" },
]

// ── Shared UI ────────────────────────────────────────────────────────────────

function ReadButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 text-xs text-gray-400 hover:text-gray-700"
      title="Mark as read"
    >
      ✓
    </button>
  )
}

function UnreadToggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="ml-auto flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      Unread only
    </label>
  )
}

// ── Journal article card ──────────────────────────────────────────────────────

function JournalCard({
  article,
  isRead,
  onRead,
}: {
  article: JournalArticle
  isRead: boolean
  onRead: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasAbstract = Boolean(article.abstract?.trim())

  return (
    <li className={`border rounded p-4 space-y-1 transition-opacity ${isRead ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onRead}
          className="font-medium hover:underline leading-snug"
        >
          {article.title}
        </a>
        <ReadButton onClick={onRead} />
      </div>

      {article.authors && <p className="text-sm text-gray-500">{article.authors}</p>}

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span>{article.journal.name}</span>
        <span>{formatDistanceToNow(new Date(article.pubDate), { addSuffix: true })}</span>
        {hasAbstract && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="hover:text-gray-600 underline underline-offset-2"
          >
            {expanded ? "hide abstract" : "abstract"}
          </button>
        )}
      </div>

      {expanded && hasAbstract && (
        <p className="text-sm text-gray-600 leading-relaxed pt-1 border-t mt-2">
          {article.abstract}
        </p>
      )}
    </li>
  )
}

// ── Scholar article card ──────────────────────────────────────────────────────

function ScholarCard({
  article,
  isRead,
  onRead,
}: {
  article: ScholarArticle
  isRead: boolean
  onRead: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasSnippet = Boolean(article.snippet?.trim())

  return (
    <li className={`border rounded p-4 space-y-1 transition-opacity ${isRead ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onRead}
          className="font-medium hover:underline leading-snug"
        >
          {article.title}
        </a>
        <ReadButton onClick={onRead} />
      </div>

      {article.authors && <p className="text-sm text-gray-500">{article.authors}</p>}

      <div className="flex items-center gap-3 text-xs text-gray-400">
        {article.alert.query && (
          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
            {article.alert.query}
          </span>
        )}
        <span>{formatDistanceToNow(new Date(article.alert.receivedAt), { addSuffix: true })}</span>
        {hasSnippet && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="hover:text-gray-600 underline underline-offset-2"
          >
            {expanded ? "hide snippet" : "snippet"}
          </button>
        )}
      </div>

      {expanded && hasSnippet && (
        <p className="text-sm text-gray-600 leading-relaxed pt-1 border-t mt-2">
          {article.snippet}
        </p>
      )}
    </li>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { data: session, status } = useSession()

  const [tab, setTab] = useState<Tab>("journals")
  const [journalFilter, setJournalFilter] = useState<string | null>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [read, setRead] = useState<Set<string>>(new Set())

  const [journalArticles, setJournalArticles] = useState<JournalArticle[]>([])
  const [scholarArticles, setScholarArticles] = useState<ScholarArticle[]>([])

  // Fetch journal articles
  useEffect(() => {
    if (!session || tab !== "journals") return
    const params = new URLSearchParams()
    if (journalFilter) params.set("journal", journalFilter)
    if (unreadOnly) params.set("unread", "true")
    fetch(`/api/articles?${params}`)
      .then((r) => r.json())
      .then(setJournalArticles)
  }, [session, tab, journalFilter, unreadOnly])

  // Fetch scholar articles
  useEffect(() => {
    if (!session || tab !== "scholar") return
    const params = new URLSearchParams()
    if (unreadOnly) params.set("unread", "true")
    fetch(`/api/scholar?${params}`)
      .then((r) => r.json())
      .then(setScholarArticles)
  }, [session, tab, unreadOnly])

  function markJournalRead(id: string) {
    if (read.has(id)) return
    setRead((prev) => new Set([...prev, id]))
    fetch(`/api/articles/${id}/read`, { method: "POST" })
  }

  function markScholarRead(id: string) {
    if (read.has(id)) return
    setRead((prev) => new Set([...prev, id]))
    fetch(`/api/scholar/${id}/read`, { method: "POST" })
  }

  // ── Auth screens ─────────────────────────────────────────────────────────

  if (status === "loading") return <div className="p-8 text-gray-500">Loading…</div>

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Journal ToC Tracker</h1>
          <p className="text-gray-500">Stay on top of health policy and informatics research.</p>
          <button
            onClick={() => signIn("google")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    )
  }

  // ── Main UI ───────────────────────────────────────────────────────────────

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Journal ToC Tracker</h1>
        <span className="text-sm text-gray-500">{session.user?.email}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["journals", "scholar"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "journals" ? "Journals" : "Scholar Alerts"}
          </button>
        ))}
      </div>

      {/* Journal tab controls */}
      {tab === "journals" && (
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setJournalFilter(null)}
            className={`px-3 py-1 rounded text-sm border ${!journalFilter ? "bg-gray-900 text-white" : "border-gray-300"}`}
          >
            All
          </button>
          {JOURNALS.map((j) => (
            <button
              key={j.slug}
              onClick={() => setJournalFilter(j.slug)}
              className={`px-3 py-1 rounded text-sm border ${journalFilter === j.slug ? "bg-gray-900 text-white" : "border-gray-300"}`}
            >
              {j.label}
            </button>
          ))}
          <UnreadToggle checked={unreadOnly} onChange={setUnreadOnly} />
        </div>
      )}

      {/* Scholar tab controls */}
      {tab === "scholar" && (
        <div className="flex items-center">
          <p className="text-sm text-gray-500">
            Articles from your forwarded Google Scholar alert emails.
          </p>
          <UnreadToggle checked={unreadOnly} onChange={setUnreadOnly} />
        </div>
      )}

      {/* Journal article list */}
      {tab === "journals" && (
        <ul className="space-y-3">
          {journalArticles.map((a) => (
            <JournalCard
              key={a.id}
              article={a}
              isRead={read.has(a.id)}
              onRead={() => markJournalRead(a.id)}
            />
          ))}
          {journalArticles.length === 0 && (
            <li className="text-gray-400 text-sm py-8 text-center">No articles found.</li>
          )}
        </ul>
      )}

      {/* Scholar article list */}
      {tab === "scholar" && (
        <ul className="space-y-3">
          {scholarArticles.map((a) => (
            <ScholarCard
              key={a.id}
              article={a}
              isRead={read.has(a.id)}
              onRead={() => markScholarRead(a.id)}
            />
          ))}
          {scholarArticles.length === 0 && (
            <li className="text-gray-400 text-sm py-8 text-center">
              No Scholar alerts found. Make sure you&apos;ve forwarded your alerts to the inbox and
              run a poll.
            </li>
          )}
        </ul>
      )}
    </main>
  )
}
