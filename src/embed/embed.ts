/**
 * Broken Link Checker v2.0 - Embed script for continuous monitoring.
 * Target: < 10kB minified.
 * Runs client-side on published Framer sites to check links on each page.
 * Features:
 * - Configurable check interval (default 24h)
 * - localStorage caching to avoid re-checking
 * - Webhook notifications
 * - Optional visual badge
 * - Soft error detection
 * - Results stored in localStorage for external access
 */

interface BlcConfig {
    webhookUrl?: string
    checkImages?: boolean
    checkExternal?: boolean
    timeout?: number
    verbose?: boolean
    checkInterval?: number // ms between checks (default 24h)
    showBadge?: boolean // show visual indicator
    softErrorDetection?: boolean
}

interface BlcResult {
    url: string
    status: number | null
    ok: boolean
    type: "internal" | "external"
    element: string
    responseTime: number
    text: string
    isSoftError?: boolean
}

;(function () {
    if ((window as unknown as Record<string, unknown>).__blcLoaded) return
    ;(window as unknown as Record<string, unknown>).__blcLoaded = true
    const PREFIX = "[BLC]"
    const DEFAULT_TIMEOUT = 10000
    const DEFAULT_INTERVAL = 86400000 // 24 hours
    const STORAGE_KEY_LAST_CHECK = "blc_last_check"
    const STORAGE_KEY_RESULTS = "blc_results"

    // ── Config loading ──────────────────────────────────────────────────────

    function getConfig(): BlcConfig {
        const el = document.querySelector("[data-blc-config]")
        if (!el) return {}
        try {
            return JSON.parse(el.getAttribute("data-blc-config") || "{}")
        } catch {
            return {}
        }
    }

    // ── Check if we should run ─────────────────────────────────────────────

    function shouldRun(config: BlcConfig): boolean {
        const interval = config.checkInterval || DEFAULT_INTERVAL
        const lastCheck = localStorage.getItem(STORAGE_KEY_LAST_CHECK)
        if (lastCheck) {
            const elapsed = Date.now() - parseInt(lastCheck, 10)
            if (elapsed < interval) {
                console.log(`${PREFIX} Skipping: last check was ${Math.round(elapsed / 60000)}min ago`)
                return false
            }
        }
        return true
    }

    // ── URL helpers ─────────────────────────────────────────────────────────

    function isInternalUrl(url: string): boolean {
        try {
            const parsed = new URL(url, window.location.origin)
            return parsed.origin === window.location.origin
        } catch {
            return false
        }
    }

    function normalizeUrl(href: string): string | null {
        if (!href) return null
        if (
            href.startsWith("javascript:") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:") ||
            href.startsWith("#") ||
            href.startsWith("data:")
        ) {
            return null
        }
        try {
            return new URL(href, window.location.origin).href
        } catch {
            return null
        }
    }

    // ── Link collection ─────────────────────────────────────────────────────

    function collectLinks(
        config: BlcConfig,
    ): Array<{ url: string; element: string; text: string }> {
        const links: Array<{ url: string; element: string; text: string }> = []
        const seen = new Set<string>()

        // Anchor tags
        document.querySelectorAll("a[href]").forEach((el) => {
            const url = normalizeUrl((el as HTMLAnchorElement).href)
            if (url && !seen.has(url)) {
                seen.add(url)
                links.push({ url, element: "a", text: (el.textContent?.trim() || "").slice(0, 50) })
            }
        })

        // Images
        if (config.checkImages !== false) {
            document.querySelectorAll("img[src]").forEach((el) => {
                const url = normalizeUrl((el as HTMLImageElement).src)
                if (url && !seen.has(url)) {
                    seen.add(url)
                    links.push({ url, element: "img", text: (el as HTMLImageElement).alt || "" })
                }
            })
        }

        // iframes
        document.querySelectorAll("iframe[src]").forEach((el) => {
            const url = normalizeUrl((el as HTMLIFrameElement).src)
            if (url && !seen.has(url)) {
                seen.add(url)
                links.push({ url, element: "iframe", text: (el as HTMLIFrameElement).title || "" })
            }
        })

        // Scripts
        document.querySelectorAll("script[src]").forEach((el) => {
            const url = normalizeUrl((el as HTMLScriptElement).src)
            if (url && !seen.has(url)) {
                seen.add(url)
                links.push({ url, element: "script", text: "" })
            }
        })

        // Stylesheets
        document.querySelectorAll("link[href]").forEach((el) => {
            const link = el as HTMLLinkElement
            const url = normalizeUrl(link.href)
            if (url && !seen.has(url)) {
                seen.add(url)
                links.push({ url, element: "link", text: link.rel || "" })
            }
        })

        // Video/audio sources
        document.querySelectorAll("video[src], audio[src], source[src]").forEach((el) => {
            const src = (el as HTMLMediaElement).getAttribute("src")
            if (src) {
                const url = normalizeUrl(src)
                if (url && !seen.has(url)) {
                    seen.add(url)
                    links.push({ url, element: el.tagName.toLowerCase(), text: "" })
                }
            }
        })

        return links
    }

    // ── Link checking ───────────────────────────────────────────────────────

    async function checkLink(
        url: string,
        timeout: number,
        element: string,
        text: string,
        detectSoft: boolean,
    ): Promise<BlcResult> {
        const start = performance.now()
        const isInternal = isInternalUrl(url)

        try {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), timeout)

            const response = await fetch(url, {
                method: isInternal ? "HEAD" : "HEAD",
                mode: isInternal ? "same-origin" : "no-cors",
                signal: controller.signal,
                redirect: "follow",
            })

            clearTimeout(timer)
            const responseTime = Math.round(performance.now() - start)

            const status = response.type === "opaque" ? 0 : response.status
            let ok = response.type === "opaque" ? true : response.ok

            // Soft error detection for internal HTML pages
            let isSoftError = false
            if (ok && detectSoft && isInternal && element === "a" && status === 200) {
                try {
                    const getController = new AbortController()
                    const getTimer = setTimeout(() => getController.abort(), timeout)
                    const getResponse = await fetch(url, {
                        method: "GET",
                        signal: getController.signal,
                        redirect: "follow",
                    })
                    clearTimeout(getTimer)
                    const contentType = getResponse.headers.get("content-type") ?? ""
                    if (contentType.includes("text/html")) {
                        const body = await getResponse.text()
                        const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""
                        if (/404|not\s*found/i.test(title) || /page\s*(not\s*found|doesn.?t?\s*exist)/i.test(body.slice(0, 5000))) {
                            isSoftError = true
                            ok = false
                        }
                    }
                } catch {
                    // Soft error detection failed
                }
            }

            return { url, status, ok, type: isInternal ? "internal" : "external", element, responseTime, text, isSoftError }
        } catch (err) {
            const responseTime = Math.round(performance.now() - start)
            const isTimeout = err instanceof DOMException && err.name === "AbortError"
            return {
                url,
                status: null,
                ok: false,
                type: isInternal ? "internal" : "external",
                element,
                responseTime,
                text: isTimeout ? "Timeout" : "Error",
            }
        }
    }

    // ── Batch processing ────────────────────────────────────────────────────

    async function processLinks(
        links: Array<{ url: string; element: string; text: string }>,
        config: BlcConfig,
    ): Promise<BlcResult[]> {
        const timeout = config.timeout || DEFAULT_TIMEOUT
        const detectSoft = config.softErrorDetection !== false
        const results: BlcResult[] = []
        const batchSize = 5

        for (let i = 0; i < links.length; i += batchSize) {
            const batch = links.slice(i, i + batchSize)
            const batchResults = await Promise.all(
                batch.map((link) => checkLink(link.url, timeout, link.element, link.text, detectSoft)),
            )
            results.push(...batchResults)
        }

        return results
    }

    // ── Reporting ───────────────────────────────────────────────────────────

    function reportResults(results: BlcResult[], config: BlcConfig): void {
        const broken = results.filter((r) => !r.ok)
        const working = results.filter((r) => r.ok)
        const softErrors = results.filter((r) => r.isSoftError)

        if (config.verbose) {
            console.log(`${PREFIX} Scan complete: ${results.length} links checked`)
            console.log(`${PREFIX} Working: ${working.length}, Broken: ${broken.length}, Soft 404: ${softErrors.length}`)
            console.table(results)
        } else {
            console.log(
                `${PREFIX} ${results.length} links checked | ${working.length} OK | ${broken.length} broken${softErrors.length > 0 ? ` | ${softErrors.length} soft 404` : ""}`,
            )
            if (broken.length > 0) {
                console.warn(`${PREFIX} Broken links:`)
                broken.forEach((r) => console.warn(`  ${r.url} (${r.status ?? "no response"})${r.isSoftError ? " [soft 404]" : ""}`))
            }
        }

        // Store results on window for external access
        const w = window as unknown as Record<string, unknown>
        w.__blcResults = results
        w.__blcBroken = broken
        w.__blcSoftErrors = softErrors

        // Store in localStorage
        try {
            localStorage.setItem(STORAGE_KEY_LAST_CHECK, Date.now().toString())
            localStorage.setItem(
                STORAGE_KEY_RESULTS,
                JSON.stringify({
                    page: window.location.href,
                    timestamp: new Date().toISOString(),
                    total: results.length,
                    broken: broken.length,
                    softErrors: softErrors.length,
                    brokenLinks: broken.map((r) => ({
                        url: r.url,
                        status: r.status,
                        type: r.type,
                        element: r.element,
                        isSoftError: r.isSoftError,
                    })),
                }),
            )
        } catch {
            // localStorage unavailable
        }

        // Send to webhook if configured
        if (config.webhookUrl && broken.length > 0) {
            fetch(config.webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    page: window.location.href,
                    timestamp: new Date().toISOString(),
                    total: results.length,
                    broken: broken.length,
                    softErrors: softErrors.length,
                    brokenLinks: broken.map((r) => ({
                        url: r.url,
                        status: r.status,
                        type: r.type,
                        element: r.element,
                        isSoftError: r.isSoftError,
                    })),
                }),
            }).catch(() => {
                console.warn(`${PREFIX} Failed to send webhook notification`)
            })
        }

        // Visual badge
        if (config.showBadge) {
            const badge = document.createElement("div")
            badge.style.cssText = `position:fixed;bottom:10px;right:10px;z-index:99999;padding:6px 12px;border-radius:20px;font:600 12px/1 -apple-system,sans-serif;color:#fff;background:${broken.length > 0 ? "#e53e3e" : "#38a169"};cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2);transition:transform .2s`
            badge.textContent = broken.length > 0 ? `${broken.length} broken link${broken.length > 1 ? "s" : ""}` : "Links OK"
            badge.title = "Click to see details in console"
            badge.onclick = () => {
                console.table(broken.length > 0 ? broken : results)
            }
            badge.onmouseenter = () => {
                badge.style.transform = "scale(1.05)"
            }
            badge.onmouseleave = () => {
                badge.style.transform = "scale(1)"
            }
            document.body.appendChild(badge)
        }
    }

    // ── Init ────────────────────────────────────────────────────────────────

    async function init() {
        const config = getConfig()

        if (!shouldRun(config)) return

        const links = collectLinks(config)

        if (links.length === 0) {
            console.log(`${PREFIX} No links found on this page`)
            return
        }

        console.log(`${PREFIX} Checking ${links.length} links on ${window.location.pathname}...`)

        // Filter external if not wanted
        const filteredLinks =
            config.checkExternal === false ? links.filter((l) => isInternalUrl(l.url)) : links

        const results = await processLinks(filteredLinks, config)
        reportResults(results, config)
    }

    // Wait for page load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            setTimeout(init, 2000)
        })
    } else {
        setTimeout(init, 2000)
    }
})()

// ── Exports for testing ──────────────────────────────────────────────────────

export function _testNormalizeUrl(href: string, origin: string): string | null {
    if (!href) return null
    if (
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        href.startsWith("data:")
    ) {
        return null
    }
    try {
        return new URL(href, origin).href
    } catch {
        return null
    }
}

export function _testIsInternalUrl(url: string, origin: string): boolean {
    try {
        const parsed = new URL(url, origin)
        return parsed.origin === origin
    } catch {
        return false
    }
}
