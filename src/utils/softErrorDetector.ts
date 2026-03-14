/**
 * Soft Error Detection
 * Detects "soft 404" pages — pages that return 200 but actually show error content.
 */

export interface SoftErrorResult {
    isSoftError: boolean
    reason: string | null
}

const ERROR_TITLE_PATTERNS = [
    /404/i,
    /not\s*found/i,
    /page\s*not\s*found/i,
    /^error$/i,
    /error\s*\d{3}/i,
    /does\s*not\s*exist/i,
    /no\s*longer\s*available/i,
    /page\s*removed/i,
    /moved\s*permanently/i,
]

const ERROR_BODY_PATTERNS = [
    /page\s*(was\s*)?(not\s*found|doesn'?t?\s*exist)/i,
    /the\s*page\s*you\s*(are\s*)?look(ing)?\s*for/i,
    /this\s*page\s*(is\s*)?(no\s*longer|doesn'?t?\s*exist|has\s*been\s*(removed|moved|deleted))/i,
    /404\s*(error|not\s*found|page)/i,
    /error\s*404/i,
    /oops.*?not\s*found/i,
    /we\s*couldn'?t?\s*find/i,
    /nothing\s*(was\s*)?found/i,
]

export function detectSoftError(html: string, responseSize: number): SoftErrorResult {
    // Very short response
    if (responseSize < 100 && responseSize > 0) {
        return { isSoftError: true, reason: "Very short response (less than 100 bytes)" }
    }

    // Check title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (titleMatch) {
        const title = titleMatch[1].trim()
        for (const pattern of ERROR_TITLE_PATTERNS) {
            if (pattern.test(title)) {
                return { isSoftError: true, reason: `Title contains error indicator: "${title}"` }
            }
        }
    }

    // Check body for error patterns (only first 10KB to avoid perf issues)
    const bodyContent = html.slice(0, 10000)
    for (const pattern of ERROR_BODY_PATTERNS) {
        if (pattern.test(bodyContent)) {
            const match = bodyContent.match(pattern)
            return { isSoftError: true, reason: `Page contains error text: "${match?.[0] ?? ""}"` }
        }
    }

    // Check for meta refresh to an error page
    const metaRefreshMatch = html.match(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["']?\d+;\s*url=([^"'\s>]+)/i)
    if (metaRefreshMatch) {
        const redirectUrl = metaRefreshMatch[1].toLowerCase()
        if (redirectUrl.includes("404") || redirectUrl.includes("error") || redirectUrl.includes("not-found")) {
            return { isSoftError: true, reason: `Meta refresh redirects to error page: ${metaRefreshMatch[1]}` }
        }
    }

    return { isSoftError: false, reason: null }
}

export function detectMixedContent(pageUrl: string, linkUrl: string): boolean {
    try {
        const page = new URL(pageUrl)
        const link = new URL(linkUrl)
        return page.protocol === "https:" && link.protocol === "http:"
    } catch {
        return false
    }
}
