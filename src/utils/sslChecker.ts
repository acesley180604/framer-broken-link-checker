/**
 * SSL Certificate Validation Utility
 * Client-side SSL checking is limited — we can detect if HTTPS fails
 * and check for mixed content issues.
 */

export interface SslCheckResult {
    isHttps: boolean
    isValid: boolean | null // null = could not determine
    error: string | null
    mixedContent: boolean
}

export function checkSslBasic(url: string, sourceUrl: string): SslCheckResult {
    try {
        const parsed = new URL(url)
        const isHttps = parsed.protocol === "https:"
        const sourceParsed = new URL(sourceUrl)
        const sourceIsHttps = sourceParsed.protocol === "https:"
        const mixedContent = sourceIsHttps && !isHttps && parsed.protocol === "http:"

        return {
            isHttps,
            isValid: null, // Cannot determine from client side without fetching
            error: mixedContent ? "HTTP resource loaded from HTTPS page (mixed content)" : null,
            mixedContent,
        }
    } catch {
        return {
            isHttps: false,
            isValid: null,
            error: "Invalid URL",
            mixedContent: false,
        }
    }
}

export async function checkSslValidity(url: string, timeout: number): Promise<SslCheckResult> {
    try {
        const parsed = new URL(url)
        if (parsed.protocol !== "https:") {
            return {
                isHttps: false,
                isValid: null,
                error: null,
                mixedContent: false,
            }
        }

        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeout)

        try {
            await fetch(url, {
                method: "HEAD",
                mode: "no-cors",
                signal: controller.signal,
            })
            clearTimeout(timer)

            // If fetch succeeded, the SSL certificate is valid
            // (browser rejects invalid certificates before we even get a response)
            return {
                isHttps: true,
                isValid: true,
                error: null,
                mixedContent: false,
            }
        } catch (err) {
            clearTimeout(timer)

            if (err instanceof TypeError && !navigator.onLine) {
                return {
                    isHttps: true,
                    isValid: null,
                    error: "Network offline, cannot verify SSL",
                    mixedContent: false,
                }
            }

            // TypeError from fetch often indicates SSL issues
            const message = err instanceof Error ? err.message : "Unknown error"
            const sslRelated = message.toLowerCase().includes("ssl") ||
                message.toLowerCase().includes("cert") ||
                message.toLowerCase().includes("tls") ||
                message.toLowerCase().includes("secure")

            return {
                isHttps: true,
                isValid: sslRelated ? false : null,
                error: sslRelated ? `SSL error: ${message}` : null,
                mixedContent: false,
            }
        }
    } catch {
        return {
            isHttps: false,
            isValid: null,
            error: "Invalid URL",
            mixedContent: false,
        }
    }
}
