import { useState, useCallback } from "react"
import { useScanStore } from "@/store/scanStore"

interface SafetyResult {
    url: string
    safe: boolean
    threats: string[]
}

export function SafetyCheck() {
    const { currentScan, scanConfig, showToast } = useScanStore()
    const [checking, setChecking] = useState(false)
    const [results, setResults] = useState<SafetyResult[]>([])

    const handleCheck = useCallback(async () => {
        if (!currentScan || !scanConfig.safeBrowsingApiKey) {
            showToast("Configure a Google Safe Browsing API key in advanced settings", "error")
            return
        }

        setChecking(true)
        const uniqueUrls = Array.from(new Set(currentScan.links.map((l) => l.targetUrl)))

        // Google Safe Browsing API v4
        const apiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${scanConfig.safeBrowsingApiKey}`

        // Process in batches of 500 (API limit)
        const batchSize = 500
        const allResults: SafetyResult[] = []

        try {
            for (let i = 0; i < uniqueUrls.length; i += batchSize) {
                const batch = uniqueUrls.slice(i, i + batchSize)
                const body = {
                    client: {
                        clientId: "broken-link-checker-framer",
                        clientVersion: "2.0.0",
                    },
                    threatInfo: {
                        threatTypes: [
                            "MALWARE",
                            "SOCIAL_ENGINEERING",
                            "UNWANTED_SOFTWARE",
                            "POTENTIALLY_HARMFUL_APPLICATION",
                        ],
                        platformTypes: ["ANY_PLATFORM"],
                        threatEntryTypes: ["URL"],
                        threatEntries: batch.map((url) => ({ url })),
                    },
                }

                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                })

                if (!response.ok) {
                    throw new Error(`Safe Browsing API error: ${response.status}`)
                }

                const data = await response.json()
                const threatMap = new Map<string, string[]>()

                if (data.matches) {
                    for (const match of data.matches) {
                        const url = match.threat?.url
                        const threat = match.threatType
                        if (url && threat) {
                            const existing = threatMap.get(url) ?? []
                            existing.push(threat)
                            threatMap.set(url, existing)
                        }
                    }
                }

                for (const url of batch) {
                    const threats = threatMap.get(url) ?? []
                    allResults.push({
                        url,
                        safe: threats.length === 0,
                        threats,
                    })
                }
            }

            setResults(allResults)
            const unsafeCount = allResults.filter((r) => !r.safe).length
            showToast(
                unsafeCount > 0
                    ? `Found ${unsafeCount} potentially unsafe URLs`
                    : `All ${allResults.length} URLs passed safety check`,
                unsafeCount > 0 ? "error" : "success",
            )
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Safety check failed", "error")
        } finally {
            setChecking(false)
        }
    }, [currentScan, scanConfig.safeBrowsingApiKey, showToast])

    const unsafeResults = results.filter((r) => !r.safe)

    return (
        <div className="stack-lg">
            <div className="row-between">
                <div>
                    <h3>Safety Check</h3>
                    <p style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                        Check links against Google Safe Browsing database
                    </p>
                </div>
                <button
                    className="framer-button-primary"
                    onClick={handleCheck}
                    disabled={checking || !currentScan || !scanConfig.safeBrowsingApiKey}
                >
                    {checking ? "Checking..." : "Run Safety Check"}
                </button>
            </div>

            {!scanConfig.safeBrowsingApiKey && (
                <div className="info-box info-box-warn">
                    <p style={{ fontSize: 10, margin: 0 }}>
                        Configure a Google Safe Browsing API key in Scan &gt; Advanced Settings
                        to enable malware detection.
                    </p>
                </div>
            )}

            {unsafeResults.length > 0 && (
                <div className="stack-sm">
                    <h3 style={{ color: "#e53e3e" }}>Unsafe URLs ({unsafeResults.length})</h3>
                    {unsafeResults.map((result) => (
                        <div
                            key={result.url}
                            className="info-box info-box-error"
                            style={{ wordBreak: "break-all" }}
                        >
                            <p style={{ fontSize: 10, fontWeight: 600, margin: 0 }}>{result.url}</p>
                            <p style={{ fontSize: 9, margin: "2px 0 0", opacity: 0.8 }}>
                                Threats: {result.threats.map((t) => t.replace(/_/g, " ").toLowerCase()).join(", ")}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {results.length > 0 && unsafeResults.length === 0 && (
                <div className="info-box info-box-tint">
                    <p style={{ fontSize: 10, margin: 0 }}>
                        All {results.length} URLs passed the Google Safe Browsing check. No known
                        threats detected.
                    </p>
                </div>
            )}
        </div>
    )
}
