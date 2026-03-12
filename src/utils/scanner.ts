/**
 * Real Link Scanner — performs actual HTTP requests to check links.
 * Supports multi-page crawling, CORS proxy fallback, soft 404 detection, SSL checks.
 */

import type { LinkResult, ScanResult, ScanConfig } from "@/store/scanStore"
import { extractLinksFromHtml, extractInternalLinks, type LinkElementType } from "./htmlParser"
import { fetchRobotsTxt, isPathAllowed, type RobotsRules } from "./robotsParser"
import { detectSoftError } from "./softErrorDetector"
import { checkSslBasic } from "./sslChecker"
import { RATE_LIMIT_DELAY } from "./defaults"
import type { LinkStatus } from "./statusCodes"

// ── Callbacks ────────────────────────────────────────────────────────────────

export interface ScanCallbacks {
    onPageScanned: (url: string, pageIndex: number, totalPages: number) => void
    onLinkChecked: (link: LinkResult, linkIndex: number, totalLinks: number) => void
    onComplete: (result: ScanResult) => void
    onError: (error: string) => void
    onPaused?: () => void
    onResumed?: () => void
}

// ── Scan state ───────────────────────────────────────────────────────────────

let scanAbortController: AbortController | null = null
let scanPaused = false

export function abortScan(): void {
    if (scanAbortController) {
        scanAbortController.abort()
        scanAbortController = null
    }
    scanPaused = false
}

export function pauseScan(): void {
    scanPaused = true
}

export function resumeScan(): void {
    scanPaused = false
}

export function isScanPaused(): boolean {
    return scanPaused
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitWhilePaused(signal: AbortSignal): Promise<void> {
    while (scanPaused && !signal.aborted) {
        await delay(200)
    }
}

function isInternalUrl(url: string, baseOrigin: string): boolean {
    try {
        return new URL(url).origin === baseOrigin
    } catch {
        return false
    }
}

function normalizeUrl(url: string): string {
    try {
        const parsed = new URL(url)
        // Remove trailing slash, hash
        let normalized = parsed.origin + parsed.pathname.replace(/\/$/, "") + parsed.search
        if (normalized.endsWith("/")) normalized = normalized.slice(0, -1)
        return normalized || parsed.origin
    } catch {
        return url
    }
}

function shouldCheckElement(element: LinkElementType, config: ScanConfig): boolean {
    switch (element) {
        case "a":
        case "iframe":
            return true
        case "img":
            return config.checkImages
        case "script":
            return config.checkScripts
        case "link":
        case "css-url":
            return config.checkStylesheets
        case "video":
        case "audio":
        case "source":
            return config.checkImages // Group media with images
        default:
            return true
    }
}

// ── Fetch a page's HTML ──────────────────────────────────────────────────────

async function fetchPageHtml(
    url: string,
    config: ScanConfig,
    signal: AbortSignal,
): Promise<string | null> {
    try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), config.timeout)

        // Combine with parent signal
        const onAbort = () => controller.abort()
        signal.addEventListener("abort", onAbort, { once: true })

        const response = await fetch(url, {
            method: "GET",
            signal: controller.signal,
            redirect: "follow",
            headers: {
                "User-Agent": config.userAgent,
            },
        })

        clearTimeout(timer)
        signal.removeEventListener("abort", onAbort)

        if (!response.ok) return null

        const contentType = response.headers.get("content-type") ?? ""
        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
            return null
        }

        return await response.text()
    } catch {
        return null
    }
}

// ── Check a single link ──────────────────────────────────────────────────────

interface CheckLinkOptions {
    url: string
    sourceUrl: string
    element: LinkElementType
    text: string
    context: string
    config: ScanConfig
    signal: AbortSignal
    baseOrigin: string
}

async function checkSingleLink(opts: CheckLinkOptions): Promise<LinkResult> {
    const { url, sourceUrl, element, text, context, config, signal, baseOrigin } = opts
    const start = performance.now()
    const isInternal = isInternalUrl(url, baseOrigin)
    const linkType = isInternal ? "internal" : "external"

    // If external links are disabled, skip
    if (!isInternal && !config.checkExternalLinks) {
        return createResult({
            sourceUrl, targetUrl: url, statusCode: null, status: "ok",
            responseTime: 0, linkText: text, linkType, element, context,
        })
    }

    // SSL / mixed content check
    if (config.checkSsl) {
        const sslResult = checkSslBasic(url, sourceUrl)
        if (sslResult.mixedContent) {
            return createResult({
                sourceUrl, targetUrl: url, statusCode: null, status: "mixed-content",
                responseTime: 0, linkText: text, linkType, element, context,
                sslStatus: "mixed-content",
            })
        }
    }

    // Try fetching
    try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), config.timeout)
        const onAbort = () => controller.abort()
        signal.addEventListener("abort", onAbort, { once: true })

        let response: Response
        let usedProxy = false

        // Strategy: same-origin for internal, try HEAD with cors then no-cors for external
        if (isInternal) {
            response = await fetch(url, {
                method: "HEAD",
                signal: controller.signal,
                redirect: config.followRedirects ? "follow" : "manual",
            })
        } else if (config.proxyUrl) {
            // Use CORS proxy for external links
            const proxyTarget = config.proxyUrl.replace(/\/$/, "") + "/" + url
            try {
                response = await fetch(proxyTarget, {
                    method: "HEAD",
                    signal: controller.signal,
                    redirect: config.followRedirects ? "follow" : "manual",
                })
                usedProxy = true
            } catch {
                // Fallback to no-cors
                response = await fetch(url, {
                    method: "HEAD",
                    mode: "no-cors",
                    signal: controller.signal,
                })
            }
        } else {
            // Try HEAD first
            try {
                response = await fetch(url, {
                    method: "HEAD",
                    signal: controller.signal,
                    redirect: config.followRedirects ? "follow" : "manual",
                })
            } catch {
                // Fallback to no-cors (can only detect reachable vs unreachable)
                response = await fetch(url, {
                    method: "HEAD",
                    mode: "no-cors",
                    signal: controller.signal,
                })
            }
        }

        clearTimeout(timer)
        signal.removeEventListener("abort", onAbort)

        const responseTime = Math.round(performance.now() - start)

        // Handle opaque responses (no-cors)
        if (response.type === "opaque") {
            return createResult({
                sourceUrl, targetUrl: url, statusCode: 0, status: "ok",
                responseTime, linkText: text, linkType, element, context,
            })
        }

        const statusCode = response.status

        // Redirect (manual mode)
        if (statusCode >= 300 && statusCode < 400) {
            const redirectTo = response.headers.get("location") ?? undefined
            return createResult({
                sourceUrl, targetUrl: url, statusCode, status: "redirect",
                redirectTo, responseTime, linkText: text, linkType, element, context,
            })
        }

        // Success
        if (statusCode >= 200 && statusCode < 300) {
            // Soft error detection (only for HTML pages with proxy/cors access)
            if (config.detectSoftErrors && (isInternal || usedProxy) && element === "a") {
                try {
                    const getController = new AbortController()
                    const getTimer = setTimeout(() => getController.abort(), config.timeout)
                    const getOnAbort = () => getController.abort()
                    signal.addEventListener("abort", getOnAbort, { once: true })

                    const getUrl = usedProxy
                        ? config.proxyUrl.replace(/\/$/, "") + "/" + url
                        : url
                    const getResponse = await fetch(getUrl, {
                        method: "GET",
                        signal: getController.signal,
                        redirect: "follow",
                    })
                    clearTimeout(getTimer)
                    signal.removeEventListener("abort", getOnAbort)

                    const contentType = getResponse.headers.get("content-type") ?? ""
                    if (contentType.includes("text/html")) {
                        const bodyText = await getResponse.text()
                        const softResult = detectSoftError(bodyText, bodyText.length)
                        if (softResult.isSoftError) {
                            return createResult({
                                sourceUrl, targetUrl: url, statusCode, status: "soft404",
                                responseTime, linkText: text, linkType, element, context,
                                softErrorReason: softResult.reason ?? undefined,
                            })
                        }
                    }
                } catch {
                    // Soft error detection failed, treat as ok
                }
            }

            return createResult({
                sourceUrl, targetUrl: url, statusCode, status: "ok",
                responseTime, linkText: text, linkType, element, context,
            })
        }

        // Error status
        return createResult({
            sourceUrl, targetUrl: url, statusCode, status: "broken",
            responseTime, linkText: text, linkType, element, context,
        })
    } catch (err) {
        const responseTime = Math.round(performance.now() - start)

        if (err instanceof DOMException && err.name === "AbortError") {
            if (signal.aborted) {
                // Scan was cancelled
                return createResult({
                    sourceUrl, targetUrl: url, statusCode: null, status: "error",
                    responseTime, linkText: text, linkType, element, context,
                })
            }
            // Timeout
            return createResult({
                sourceUrl, targetUrl: url, statusCode: null, status: "timeout",
                responseTime: config.timeout, linkText: text, linkType, element, context,
            })
        }

        // Network error — could be SSL
        const message = err instanceof Error ? err.message : ""
        if (config.checkSsl && (message.includes("SSL") || message.includes("cert") || message.includes("TLS"))) {
            return createResult({
                sourceUrl, targetUrl: url, statusCode: null, status: "ssl-error",
                responseTime, linkText: text, linkType, element, context,
                sslStatus: "invalid",
            })
        }

        return createResult({
            sourceUrl, targetUrl: url, statusCode: null, status: "error",
            responseTime, linkText: text, linkType, element, context,
        })
    }
}

interface CreateResultInput {
    sourceUrl: string
    targetUrl: string
    statusCode: number | null
    status: LinkStatus
    redirectTo?: string
    responseTime: number
    linkText: string
    linkType: "internal" | "external"
    element: LinkElementType
    context: string
    softErrorReason?: string
    sslStatus?: string
}

function createResult(input: CreateResultInput): LinkResult {
    return {
        id: crypto.randomUUID(),
        sourceUrl: input.sourceUrl,
        targetUrl: input.targetUrl,
        statusCode: input.statusCode,
        status: input.status,
        redirectTo: input.redirectTo,
        responseTime: input.responseTime,
        linkText: input.linkText,
        linkType: input.linkType,
        element: input.element,
        context: input.context,
        checkedAt: new Date().toISOString(),
        ignored: false,
        softErrorReason: input.softErrorReason,
        sslStatus: input.sslStatus,
    }
}

// ── Main scan function ───────────────────────────────────────────────────────

export async function runScan(config: ScanConfig, callbacks: ScanCallbacks): Promise<void> {
    scanAbortController = new AbortController()
    scanPaused = false
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

        const baseOrigin = new URL(siteUrl).origin
        const startedAt = new Date().toISOString()

        // Fetch robots.txt if enabled
        let robotsRules: RobotsRules | null = null
        if (config.respectRobotsTxt) {
            robotsRules = await fetchRobotsTxt(siteUrl, config.timeout)
        }

        // Crawl frontier
        const pagesToVisit: Array<{ url: string; depth: number }> = [{ url: siteUrl, depth: 0 }]
        const visitedPages = new Set<string>()
        const checkedLinks = new Set<string>()
        const allLinks: LinkResult[] = []
        let pagesScanned = 0

        while (pagesToVisit.length > 0 && pagesScanned < config.maxPages) {
            if (signal.aborted) return
            await waitWhilePaused(signal)
            if (signal.aborted) return

            const current = pagesToVisit.shift()!
            const normalizedPageUrl = normalizeUrl(current.url)

            if (visitedPages.has(normalizedPageUrl)) continue
            if (current.depth > config.maxDepth) continue

            // Check robots.txt
            if (robotsRules) {
                try {
                    const path = new URL(current.url).pathname
                    if (!isPathAllowed(path, robotsRules.disallowedPaths)) continue
                } catch {
                    // skip
                }
            }

            visitedPages.add(normalizedPageUrl)
            pagesScanned++

            callbacks.onPageScanned(
                current.url,
                pagesScanned,
                Math.min(config.maxPages, pagesScanned + pagesToVisit.length),
            )

            // Fetch the page HTML
            const html = await fetchPageHtml(current.url, config, signal)
            if (signal.aborted) return
            if (!html) continue

            // Extract links from page
            const extractedLinks = extractLinksFromHtml(html, current.url)

            // Discover internal links for crawling
            if (current.depth < config.maxDepth) {
                const internalLinks = extractInternalLinks(html, current.url)
                for (const link of internalLinks) {
                    const normalized = normalizeUrl(link)
                    if (!visitedPages.has(normalized) && isInternalUrl(link, baseOrigin)) {
                        pagesToVisit.push({ url: link, depth: current.depth + 1 })
                    }
                }
            }

            // Check each link
            const linksToCheck = extractedLinks.filter((l) => {
                if (!shouldCheckElement(l.element, config)) return false
                if (!config.checkExternalLinks && !isInternalUrl(l.url, baseOrigin)) return false
                const key = `${current.url}|${l.url}`
                if (checkedLinks.has(key)) return false
                checkedLinks.add(key)
                return true
            })

            // Process links in batches
            const batchSize = config.concurrency
            for (let i = 0; i < linksToCheck.length; i += batchSize) {
                if (signal.aborted) return
                await waitWhilePaused(signal)
                if (signal.aborted) return

                const batch = linksToCheck.slice(i, i + batchSize)
                const results = await Promise.all(
                    batch.map((extractedLink) =>
                        checkSingleLink({
                            url: extractedLink.url,
                            sourceUrl: current.url,
                            element: extractedLink.element,
                            text: extractedLink.text,
                            context: extractedLink.context,
                            config,
                            signal,
                            baseOrigin,
                        })
                    ),
                )

                for (const result of results) {
                    if (signal.aborted) return
                    allLinks.push(result)
                    callbacks.onLinkChecked(
                        result,
                        allLinks.length,
                        Math.max(allLinks.length, linksToCheck.length * pagesScanned),
                    )
                }

                // Rate limiting
                if (i + batchSize < linksToCheck.length) {
                    await delay(RATE_LIMIT_DELAY)
                }
            }

            // Respect crawl delay from robots.txt
            if (robotsRules?.crawlDelay) {
                await delay(robotsRules.crawlDelay * 1000)
            } else {
                await delay(RATE_LIMIT_DELAY)
            }
        }

        if (signal.aborted) return

        // Calculate health score
        const total = allLinks.length
        const working = allLinks.filter((l) => l.status === "ok").length
        const healthScore = total > 0 ? Math.round((working / total) * 100) : 100

        const result: ScanResult = {
            id: crypto.randomUUID(),
            siteUrl,
            startedAt,
            completedAt: new Date().toISOString(),
            pagesScanned,
            linksChecked: allLinks.length,
            broken: allLinks.filter((l) => l.status === "broken" || l.status === "soft404").length,
            redirects: allLinks.filter((l) => l.status === "redirect").length,
            healthScore,
            links: allLinks,
        }

        callbacks.onComplete(result)
    } catch (err) {
        if (!signal.aborted) {
            callbacks.onError(err instanceof Error ? err.message : "Scan failed")
        }
    } finally {
        scanAbortController = null
        scanPaused = false
    }
}

// ── Fix suggestion helpers ───────────────────────────────────────────────────

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
            if (slug === brokenSlug) score += 50
            else if (slug.includes(brokenSlug) || brokenSlug.includes(slug)) score += 30
            const shared = [...brokenSlug].filter((c) => slug.includes(c)).length
            score += shared * 2
            if (parts.length === brokenParts.length) score += 10
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
