/**
 * HTML Link Extraction Utility
 * Parses HTML content and extracts all linkable resources.
 */

export type LinkElementType = "a" | "img" | "script" | "link" | "iframe" | "video" | "audio" | "source" | "css-url"

export interface ExtractedLink {
    url: string
    element: LinkElementType
    text: string
    context: string
}

const SKIP_PROTOCOLS = new Set(["mailto:", "tel:", "javascript:", "data:", "blob:"])

function shouldSkipHref(href: string): boolean {
    if (!href || href.trim() === "") return true
    const trimmed = href.trim()
    if (trimmed.startsWith("#")) return true
    for (const proto of SKIP_PROTOCOLS) {
        if (trimmed.startsWith(proto)) return true
    }
    return false
}

export function resolveUrl(href: string, baseUrl: string): string | null {
    if (shouldSkipHref(href)) return null
    try {
        const trimmed = href.trim()
        if (trimmed.startsWith("//")) {
            const base = new URL(baseUrl)
            return new URL(`${base.protocol}${trimmed}`).href
        }
        return new URL(trimmed, baseUrl).href
    } catch {
        return null
    }
}

function extractSurroundingContext(html: string, matchIndex: number, length: number): string {
    const contextRadius = 80
    const start = Math.max(0, matchIndex - contextRadius)
    const end = Math.min(html.length, matchIndex + length + contextRadius)
    let context = html.slice(start, end)
    if (start > 0) context = "..." + context
    if (end < html.length) context = context + "..."
    return context.replace(/\s+/g, " ").trim()
}

function extractCssUrls(html: string, baseUrl: string): ExtractedLink[] {
    const results: ExtractedLink[] = []
    const seen = new Set<string>()

    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
    let styleMatch: RegExpExecArray | null
    while ((styleMatch = styleRegex.exec(html)) !== null) {
        const cssContent = styleMatch[1]
        const urlRegex = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi
        let urlMatch: RegExpExecArray | null
        while ((urlMatch = urlRegex.exec(cssContent)) !== null) {
            const resolved = resolveUrl(urlMatch[1], baseUrl)
            if (resolved && !seen.has(resolved)) {
                seen.add(resolved)
                results.push({
                    url: resolved,
                    element: "css-url",
                    text: "",
                    context: extractSurroundingContext(cssContent, urlMatch.index, urlMatch[0].length),
                })
            }
        }
    }

    const inlineStyleRegex = /style\s*=\s*["']([^"']*)["']/gi
    let inlineMatch: RegExpExecArray | null
    while ((inlineMatch = inlineStyleRegex.exec(html)) !== null) {
        const styleContent = inlineMatch[1]
        const urlRegex = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi
        let urlMatch: RegExpExecArray | null
        while ((urlMatch = urlRegex.exec(styleContent)) !== null) {
            const resolved = resolveUrl(urlMatch[1], baseUrl)
            if (resolved && !seen.has(resolved)) {
                seen.add(resolved)
                results.push({
                    url: resolved,
                    element: "css-url",
                    text: "",
                    context: extractSurroundingContext(html, inlineMatch.index, inlineMatch[0].length),
                })
            }
        }
    }

    return results
}

export function extractLinksFromHtml(html: string, baseUrl: string): ExtractedLink[] {
    const results: ExtractedLink[] = []
    const seen = new Set<string>()

    function addLink(url: string | null, element: LinkElementType, text: string, context: string): void {
        if (!url) return
        if (seen.has(url)) return
        seen.add(url)
        results.push({ url, element, text, context })
    }

    // Use DOMParser for robust extraction
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")

    // <a href>
    doc.querySelectorAll("a[href]").forEach((el) => {
        const anchor = el as HTMLAnchorElement
        const href = anchor.getAttribute("href") ?? ""
        const resolved = resolveUrl(href, baseUrl)
        const text = anchor.textContent?.trim() ?? ""
        addLink(resolved, "a", text, anchor.outerHTML.slice(0, 200))
    })

    // <img src>
    doc.querySelectorAll("img[src]").forEach((el) => {
        const img = el as HTMLImageElement
        const src = img.getAttribute("src") ?? ""
        const resolved = resolveUrl(src, baseUrl)
        addLink(resolved, "img", img.alt ?? "", img.outerHTML.slice(0, 200))
    })

    // <img srcset>
    doc.querySelectorAll("img[srcset]").forEach((el) => {
        const img = el as HTMLImageElement
        const srcset = img.getAttribute("srcset") ?? ""
        const entries = srcset.split(",").map((s) => s.trim().split(/\s+/)[0])
        for (const entry of entries) {
            if (entry) {
                const resolved = resolveUrl(entry, baseUrl)
                addLink(resolved, "img", img.alt ?? "", img.outerHTML.slice(0, 200))
            }
        }
    })

    // <script src>
    doc.querySelectorAll("script[src]").forEach((el) => {
        const script = el as HTMLScriptElement
        const src = script.getAttribute("src") ?? ""
        const resolved = resolveUrl(src, baseUrl)
        addLink(resolved, "script", "", script.outerHTML.slice(0, 200))
    })

    // <link href> (stylesheets, icons, etc.)
    doc.querySelectorAll("link[href]").forEach((el) => {
        const link = el as HTMLLinkElement
        const href = link.getAttribute("href") ?? ""
        const resolved = resolveUrl(href, baseUrl)
        addLink(resolved, "link", link.rel ?? "", link.outerHTML.slice(0, 200))
    })

    // <iframe src>
    doc.querySelectorAll("iframe[src]").forEach((el) => {
        const iframe = el as HTMLIFrameElement
        const src = iframe.getAttribute("src") ?? ""
        const resolved = resolveUrl(src, baseUrl)
        addLink(resolved, "iframe", iframe.title ?? "", iframe.outerHTML.slice(0, 200))
    })

    // <video src> and <video poster>
    doc.querySelectorAll("video[src], video[poster]").forEach((el) => {
        const video = el as HTMLVideoElement
        const src = video.getAttribute("src")
        if (src) {
            const resolved = resolveUrl(src, baseUrl)
            addLink(resolved, "video", "", video.outerHTML.slice(0, 200))
        }
        const poster = video.getAttribute("poster")
        if (poster) {
            const resolved = resolveUrl(poster, baseUrl)
            addLink(resolved, "video", "", video.outerHTML.slice(0, 200))
        }
    })

    // <audio src>
    doc.querySelectorAll("audio[src]").forEach((el) => {
        const audio = el as HTMLAudioElement
        const src = audio.getAttribute("src") ?? ""
        const resolved = resolveUrl(src, baseUrl)
        addLink(resolved, "audio", "", audio.outerHTML.slice(0, 200))
    })

    // <source src>
    doc.querySelectorAll("source[src]").forEach((el) => {
        const source = el as HTMLSourceElement
        const src = source.getAttribute("src") ?? ""
        const resolved = resolveUrl(src, baseUrl)
        addLink(resolved, "source", "", source.outerHTML.slice(0, 200))
    })

    // CSS url() references
    const cssLinks = extractCssUrls(html, baseUrl)
    for (const link of cssLinks) {
        if (!seen.has(link.url)) {
            seen.add(link.url)
            results.push(link)
        }
    }

    return results
}

export function extractInternalLinks(html: string, baseUrl: string): string[] {
    const links = extractLinksFromHtml(html, baseUrl)
    const baseOrigin = new URL(baseUrl).origin
    const internal = new Set<string>()

    for (const link of links) {
        if (link.element === "a") {
            try {
                const parsed = new URL(link.url)
                if (parsed.origin === baseOrigin) {
                    // Normalize: remove hash, keep path + query
                    const normalized = parsed.origin + parsed.pathname + parsed.search
                    internal.add(normalized)
                }
            } catch {
                // skip
            }
        }
    }

    return Array.from(internal)
}
