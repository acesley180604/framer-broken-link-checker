/**
 * Broken Link Checker - Embed script for continuous monitoring.
 * Target: < 10kB minified.
 * Runs client-side on published Framer sites to check links on each page.
 * Results are logged to console and optionally sent to a webhook.
 */

interface BlcConfig {
    webhookUrl?: string;
    checkImages?: boolean;
    checkExternal?: boolean;
    timeout?: number;
    verbose?: boolean;
}

interface BlcResult {
    url: string;
    status: number | null;
    ok: boolean;
    type: "internal" | "external";
    element: string;
    responseTime: number;
    text: string;
}

(function () {
    const PREFIX = "[BLC]";
    const DEFAULT_TIMEOUT = 10000;

    // ── Config loading ──────────────────────────────────────────────────────

    function getConfig(): BlcConfig {
        const el = document.querySelector("[data-blc-config]");
        if (!el) return {};
        try {
            return JSON.parse(el.getAttribute("data-blc-config") || "{}");
        } catch {
            return {};
        }
    }

    // ── URL helpers ─────────────────────────────────────────────────────────

    function isInternalUrl(url: string): boolean {
        try {
            const parsed = new URL(url, window.location.origin);
            return parsed.origin === window.location.origin;
        } catch {
            return false;
        }
    }

    function normalizeUrl(href: string): string | null {
        if (!href) return null;
        if (
            href.startsWith("javascript:") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:") ||
            href.startsWith("#") ||
            href.startsWith("data:")
        ) {
            return null;
        }
        try {
            return new URL(href, window.location.origin).href;
        } catch {
            return null;
        }
    }

    // ── Link collection ─────────────────────────────────────────────────────

    function collectLinks(config: BlcConfig): Array<{ url: string; element: string; text: string }> {
        const links: Array<{ url: string; element: string; text: string }> = [];
        const seen = new Set<string>();

        // Anchor tags
        document.querySelectorAll("a[href]").forEach((el) => {
            const url = normalizeUrl((el as HTMLAnchorElement).href);
            if (url && !seen.has(url)) {
                seen.add(url);
                links.push({ url, element: "a", text: el.textContent?.trim() || "" });
            }
        });

        // Images
        if (config.checkImages !== false) {
            document.querySelectorAll("img[src]").forEach((el) => {
                const url = normalizeUrl((el as HTMLImageElement).src);
                if (url && !seen.has(url)) {
                    seen.add(url);
                    links.push({ url, element: "img", text: (el as HTMLImageElement).alt || "" });
                }
            });
        }

        return links;
    }

    // ── Link checking ───────────────────────────────────────────────────────

    async function checkLink(
        url: string,
        timeout: number,
        element: string,
        text: string,
    ): Promise<BlcResult> {
        const start = performance.now();
        const isInternal = isInternalUrl(url);

        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeout);

            // Use HEAD for internal, no-cors for external
            const response = await fetch(url, {
                method: isInternal ? "HEAD" : "HEAD",
                mode: isInternal ? "same-origin" : "no-cors",
                signal: controller.signal,
                redirect: "follow",
            });

            clearTimeout(timer);
            const responseTime = Math.round(performance.now() - start);

            // no-cors responses have status 0 and type "opaque"
            // We can't determine actual status, so mark as ok if no error
            const status = response.type === "opaque" ? 0 : response.status;
            const ok = response.type === "opaque" ? true : response.ok;

            return {
                url,
                status,
                ok,
                type: isInternal ? "internal" : "external",
                element,
                responseTime,
                text,
            };
        } catch (err) {
            const responseTime = Math.round(performance.now() - start);
            const isTimeout = err instanceof DOMException && err.name === "AbortError";

            return {
                url,
                status: null,
                ok: false,
                type: isInternal ? "internal" : "external",
                element,
                responseTime,
                text: isTimeout ? "Timeout" : "Error",
            };
        }
    }

    // ── Batch processing ────────────────────────────────────────────────────

    async function processLinks(
        links: Array<{ url: string; element: string; text: string }>,
        config: BlcConfig,
    ): Promise<BlcResult[]> {
        const timeout = config.timeout || DEFAULT_TIMEOUT;
        const results: BlcResult[] = [];
        const batchSize = 5;

        for (let i = 0; i < links.length; i += batchSize) {
            const batch = links.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map((link) => checkLink(link.url, timeout, link.element, link.text))
            );
            results.push(...batchResults);
        }

        return results;
    }

    // ── Reporting ───────────────────────────────────────────────────────────

    function reportResults(results: BlcResult[], config: BlcConfig): void {
        const broken = results.filter((r) => !r.ok);
        const working = results.filter((r) => r.ok);

        if (config.verbose) {
            console.log(`${PREFIX} Scan complete: ${results.length} links checked`);
            console.log(`${PREFIX} Working: ${working.length}, Broken: ${broken.length}`);
            console.table(results);
        } else {
            console.log(
                `${PREFIX} ${results.length} links checked | ${working.length} OK | ${broken.length} broken`
            );
            if (broken.length > 0) {
                console.warn(`${PREFIX} Broken links:`);
                broken.forEach((r) => console.warn(`  ${r.url} (${r.status ?? "no response"})`));
            }
        }

        // Store results on window for external access
        (window as unknown as Record<string, unknown>).__blcResults = results;
        (window as unknown as Record<string, unknown>).__blcBroken = broken;

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
                    brokenLinks: broken.map((r) => ({
                        url: r.url,
                        status: r.status,
                        type: r.type,
                        element: r.element,
                    })),
                }),
            }).catch(() => {
                console.warn(`${PREFIX} Failed to send webhook notification`);
            });
        }
    }

    // ── Init ────────────────────────────────────────────────────────────────

    async function init() {
        const config = getConfig();
        const links = collectLinks(config);

        if (links.length === 0) {
            console.log(`${PREFIX} No links found on this page`);
            return;
        }

        console.log(`${PREFIX} Checking ${links.length} links on ${window.location.pathname}...`);

        // Filter external if not wanted
        const filteredLinks = config.checkExternal === false
            ? links.filter((l) => isInternalUrl(l.url))
            : links;

        const results = await processLinks(filteredLinks, config);
        reportResults(results, config);
    }

    // Wait for page load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            // Delay to let dynamic content load
            setTimeout(init, 2000);
        });
    } else {
        setTimeout(init, 2000);
    }
})();

// ── Exports for testing ──────────────────────────────────────────────────────

export function _testNormalizeUrl(href: string, origin: string): string | null {
    if (!href) return null;
    if (
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        href.startsWith("data:")
    ) {
        return null;
    }
    try {
        return new URL(href, origin).href;
    } catch {
        return null;
    }
}

export function _testIsInternalUrl(url: string, origin: string): boolean {
    try {
        const parsed = new URL(url, origin);
        return parsed.origin === origin;
    } catch {
        return false;
    }
}
