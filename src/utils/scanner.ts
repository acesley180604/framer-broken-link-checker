import type { LinkResult, ScanResult, ScanConfig } from "@/store/scanStore"

// ── Simulated link scanner ──────────────────────────────────────────────────
// Since Framer plugins run in the browser (sandboxed iframe), actual crawling
// requires a backend proxy. This module simulates realistic scanning behavior
// for the plugin UI, generating deterministic results based on the site URL.
// In production, this would call a serverless function or scanning API.

interface ScanCallbacks {
    onPageScanned: (url: string, pageIndex: number, totalPages: number) => void
    onLinkChecked: (link: LinkResult, linkIndex: number, totalLinks: number) => void
    onComplete: (result: ScanResult) => void
    onError: (error: string) => void
}

// Deterministic hash for consistent simulation results
function simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
}

// Generate realistic page URLs from a site URL
function generatePages(siteUrl: string, maxPages: number): string[] {
    const base = siteUrl.replace(/\/$/, "")
    const hash = simpleHash(base)
    const pageCount = Math.min(maxPages, 8 + (hash % 25))

    const commonPages = [
        "/",
        "/about",
        "/contact",
        "/blog",
        "/pricing",
        "/features",
        "/docs",
        "/faq",
        "/terms",
        "/privacy",
        "/careers",
        "/team",
        "/blog/getting-started",
        "/blog/release-notes",
        "/blog/tutorials",
        "/docs/api",
        "/docs/quickstart",
        "/docs/guides",
        "/products",
        "/products/enterprise",
        "/integrations",
        "/changelog",
        "/support",
        "/demo",
        "/signup",
        "/login",
    ]

    const pages = commonPages.slice(0, pageCount).map((p) => base + p)
    return pages
}

// Generate realistic links for a page
function generateLinksForPage(
    pageUrl: string,
    siteUrl: string,
    config: ScanConfig,
    allPages: string[]
): Omit<LinkResult, "id" | "checkedAt">[] {
    const base = siteUrl.replace(/\/$/, "")
    const hash = simpleHash(pageUrl)
    const linkCount = 5 + (hash % 15)
    const links: Omit<LinkResult, "id" | "checkedAt">[] = []

    const externalDomains = [
        "https://google.com",
        "https://github.com",
        "https://twitter.com",
        "https://fonts.googleapis.com/css2?family=Inter",
        "https://cdn.jsdelivr.net/npm/some-package@1.0.0/dist/bundle.min.js",
        "https://plausible.io/js/script.js",
        "https://www.youtube.com/embed/dQw4w9WgXcQ",
        "https://old-service.example.com/api/v1",
        "https://deprecated-cdn.example.com/assets/logo.png",
        "https://expired-domain-12345.com/page",
        "https://medium.com/@user/article",
        "https://linkedin.com/company/example",
        "https://facebook.com/example",
        "https://analytics.example.com/track",
        "https://api.stripe.com/v1/checkout",
    ]

    const linkTexts = [
        "Learn more",
        "Read the docs",
        "Get started",
        "Contact us",
        "View pricing",
        "Sign up free",
        "See features",
        "Download",
        "API Reference",
        "Blog",
        "Home",
        "About us",
        "Privacy Policy",
        "Terms of Service",
        "",
        "Click here",
        "Our team",
        "Case studies",
    ]

    for (let i = 0; i < linkCount; i++) {
        const linkHash = simpleHash(pageUrl + i.toString())
        const isExternal = config.checkExternalLinks && (linkHash % 4 === 0)
        const isImage = config.checkImages && (linkHash % 8 === 0)
        const isScript = config.checkScripts && (linkHash % 12 === 0)
        const isStylesheet = config.checkStylesheets && (linkHash % 15 === 0)

        let targetUrl: string
        let linkText: string
        let element: "a" | "img" | "script" | "link" | "iframe"
        let linkType: "internal" | "external"

        if (isImage) {
            element = "img"
            linkText = ""
            if (isExternal) {
                targetUrl = `https://images.unsplash.com/photo-${1500000000000 + linkHash % 999999}?w=800`
                linkType = "external"
            } else {
                targetUrl = `${base}/images/${["hero", "team", "product", "banner", "logo", "icon"][linkHash % 6]}.${linkHash % 3 === 0 ? "png" : "jpg"}`
                linkType = "internal"
            }
        } else if (isScript) {
            element = "script"
            linkText = ""
            targetUrl = isExternal
                ? externalDomains[4 + (linkHash % 2)]
                : `${base}/js/${["app", "analytics", "vendor"][linkHash % 3]}.js`
            linkType = isExternal ? "external" : "internal"
        } else if (isStylesheet) {
            element = "link"
            linkText = ""
            targetUrl = isExternal
                ? externalDomains[3]
                : `${base}/css/${["main", "vendor"][linkHash % 2]}.css`
            linkType = isExternal ? "external" : "internal"
        } else if (isExternal) {
            element = linkHash % 20 === 0 ? "iframe" : "a"
            linkText = element === "iframe" ? "" : linkTexts[linkHash % linkTexts.length]
            targetUrl = externalDomains[linkHash % externalDomains.length]
            linkType = "external"
        } else {
            element = "a"
            linkText = linkTexts[linkHash % linkTexts.length]
            targetUrl = allPages[linkHash % allPages.length]
            linkType = "internal"
        }

        // Determine status based on hash (simulate realistic distribution)
        // ~85% ok, ~5% broken, ~5% redirect, ~3% timeout, ~2% error
        const statusRoll = linkHash % 100
        let status: LinkResult["status"]
        let statusCode: number | null
        let redirectTo: string | undefined
        let responseTime: number

        if (statusRoll < 85) {
            status = "ok"
            statusCode = 200
            responseTime = 50 + (linkHash % 400)
        } else if (statusRoll < 90) {
            status = "broken"
            statusCode = [404, 410, 403, 500, 502, 503][linkHash % 6]
            responseTime = 100 + (linkHash % 800)
        } else if (statusRoll < 95) {
            status = "redirect"
            statusCode = [301, 302, 307, 308][linkHash % 4]
            redirectTo = targetUrl.replace(/\/?$/, "/new-location")
            responseTime = 150 + (linkHash % 600)
        } else if (statusRoll < 98) {
            status = "timeout"
            statusCode = null
            responseTime = config.timeout
        } else {
            status = "error"
            statusCode = null
            responseTime = 0
        }

        links.push({
            sourceUrl: pageUrl,
            targetUrl,
            statusCode,
            status,
            redirectTo,
            responseTime,
            linkText,
            linkType,
            element,
            ignored: false,
        })
    }

    return links
}

// ── Main scan function ──────────────────────────────────────────────────────

let scanAbortController: AbortController | null = null

export function abortScan(): void {
    if (scanAbortController) {
        scanAbortController.abort()
        scanAbortController = null
    }
}

export async function runScan(config: ScanConfig, callbacks: ScanCallbacks): Promise<void> {
    scanAbortController = new AbortController()
    const signal = scanAbortController.signal

    try {
        if (!config.siteUrl) {
            callbacks.onError("Please enter a site URL")
            return
        }

        // Normalize URL
        let siteUrl = config.siteUrl.trim()
        if (!siteUrl.startsWith("http")) {
            siteUrl = "https://" + siteUrl
        }
        siteUrl = siteUrl.replace(/\/$/, "")

        // Generate simulated pages
        const pages = generatePages(siteUrl, config.maxPages)
        const allLinks: LinkResult[] = []
        const startedAt = new Date().toISOString()

        // Simulate crawling each page
        for (let i = 0; i < pages.length; i++) {
            if (signal.aborted) return

            const pageUrl = pages[i]
            callbacks.onPageScanned(pageUrl, i + 1, pages.length)

            // Simulate page fetch delay
            await delay(200 + Math.random() * 300)
            if (signal.aborted) return

            // Generate and check links for this page
            const pageLinks = generateLinksForPage(pageUrl, siteUrl, config, pages)

            for (let j = 0; j < pageLinks.length; j++) {
                if (signal.aborted) return

                const link: LinkResult = {
                    ...pageLinks[j],
                    id: crypto.randomUUID(),
                    checkedAt: new Date().toISOString(),
                }

                allLinks.push(link)
                callbacks.onLinkChecked(link, allLinks.length, pages.length * 10) // Estimate

                // Simulate individual link check delay
                await delay(30 + Math.random() * 70)
            }
        }

        if (signal.aborted) return

        // Deduplicate by targetUrl (keep first occurrence)
        const seen = new Set<string>()
        const dedupedLinks = allLinks.filter((link) => {
            const key = `${link.sourceUrl}|${link.targetUrl}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })

        // Calculate health score
        const total = dedupedLinks.length
        const working = dedupedLinks.filter((l) => l.status === "ok").length
        const healthScore = total > 0 ? Math.round((working / total) * 100) : 100

        const result: ScanResult = {
            id: crypto.randomUUID(),
            siteUrl,
            startedAt,
            completedAt: new Date().toISOString(),
            pagesScanned: pages.length,
            linksChecked: dedupedLinks.length,
            broken: dedupedLinks.filter((l) => l.status === "broken").length,
            redirects: dedupedLinks.filter((l) => l.status === "redirect").length,
            healthScore,
            links: dedupedLinks,
        }

        callbacks.onComplete(result)
    } catch (err) {
        if (!signal.aborted) {
            callbacks.onError(err instanceof Error ? err.message : "Scan failed")
        }
    } finally {
        scanAbortController = null
    }
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Fix suggestion helpers ──────────────────────────────────────────────────

export function getSimilarUrls(brokenUrl: string, allUrls: string[]): string[] {
    const broken = brokenUrl.toLowerCase()
    const brokenParts = broken.split("/").filter(Boolean)
    const brokenSlug = brokenParts[brokenParts.length - 1] ?? ""

    return allUrls
        .filter((url) => url !== brokenUrl)
        .map((url) => {
            const lower = url.toLowerCase()
            const parts = lower.split("/").filter(Boolean)
            const slug = parts[parts.length - 1] ?? ""

            let score = 0
            // Exact slug match
            if (slug === brokenSlug) score += 50
            // Slug contains broken slug
            else if (slug.includes(brokenSlug) || brokenSlug.includes(slug)) score += 30
            // Levenshtein-like: shared characters
            const shared = [...brokenSlug].filter((c) => slug.includes(c)).length
            score += shared * 2
            // Same depth
            if (parts.length === brokenParts.length) score += 10
            // Same parent path
            if (parts.slice(0, -1).join("/") === brokenParts.slice(0, -1).join("/")) score += 20

            return { url, score }
        })
        .filter((item) => item.score > 15)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((item) => item.url)
}

export function getWaybackUrl(url: string): string {
    return `https://web.archive.org/web/*/${encodeURIComponent(url)}`
}
