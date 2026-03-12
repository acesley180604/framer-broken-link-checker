/**
 * Robots.txt Parser
 * Fetches and parses robots.txt to determine which paths are disallowed.
 */

export interface RobotsRules {
    disallowedPaths: string[]
    crawlDelay: number | null
    sitemapUrls: string[]
}

export function parseRobotsTxt(content: string, userAgent: string): RobotsRules {
    const lines = content.split("\n").map((l) => l.trim())
    const disallowedPaths: string[] = []
    const sitemapUrls: string[] = []
    let crawlDelay: number | null = null

    let isMatchingBlock = false
    let isWildcardBlock = false
    let foundSpecific = false

    for (const line of lines) {
        if (line === "" || line.startsWith("#")) continue

        const colonIndex = line.indexOf(":")
        if (colonIndex === -1) continue

        const directive = line.slice(0, colonIndex).trim().toLowerCase()
        const value = line.slice(colonIndex + 1).trim()

        if (directive === "user-agent") {
            const agent = value.toLowerCase()
            if (agent === userAgent.toLowerCase() || agent === userAgent.split("/")[0].toLowerCase()) {
                isMatchingBlock = true
                foundSpecific = true
                isWildcardBlock = false
            } else if (agent === "*" && !foundSpecific) {
                isWildcardBlock = true
                isMatchingBlock = false
            } else {
                isMatchingBlock = false
                isWildcardBlock = false
            }
            continue
        }

        const inBlock = isMatchingBlock || (isWildcardBlock && !foundSpecific)

        if (directive === "disallow" && inBlock && value) {
            disallowedPaths.push(value)
        } else if (directive === "crawl-delay" && inBlock) {
            const parsed = parseFloat(value)
            if (!isNaN(parsed)) crawlDelay = parsed
        } else if (directive === "sitemap") {
            sitemapUrls.push(value)
        }
    }

    return { disallowedPaths, crawlDelay, sitemapUrls }
}

export function isPathAllowed(path: string, disallowedPaths: string[]): boolean {
    for (const disallowed of disallowedPaths) {
        if (disallowed === "/") return false
        if (path.startsWith(disallowed)) return false
        // Handle wildcard patterns
        if (disallowed.includes("*")) {
            const pattern = disallowed
                .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
                .replace(/\*/g, ".*")
            const regex = new RegExp(`^${pattern}`)
            if (regex.test(path)) return false
        }
    }
    return true
}

export async function fetchRobotsTxt(siteUrl: string, timeout: number): Promise<RobotsRules | null> {
    try {
        const origin = new URL(siteUrl).origin
        const robotsUrl = `${origin}/robots.txt`

        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(robotsUrl, {
            signal: controller.signal,
            redirect: "follow",
        })

        clearTimeout(timer)

        if (!response.ok) return null

        const text = await response.text()
        return parseRobotsTxt(text, "BrokenLinkChecker")
    } catch {
        return null
    }
}
