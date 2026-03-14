import { useCallback } from "react"
import { useScanStore } from "@/store/scanStore"

interface FixSuggestionsProps {
    brokenUrl: string
    similarUrls: string[]
    waybackUrl: string
}

export function FixSuggestions({ brokenUrl, similarUrls, waybackUrl }: FixSuggestionsProps) {
    const { showToast } = useScanStore()

    const handleCopy = useCallback(
        (url: string) => {
            void navigator.clipboard.writeText(url).then(() => {
                showToast("URL copied to clipboard", "success")
            })
        },
        [showToast],
    )

    return (
        <div className="stack">
            <h3>Fix Suggestions</h3>

            {/* Similar URLs */}
            {similarUrls.length > 0 && (
                <div className="stack-sm">
                    <label>Similar working URLs (possible replacements)</label>
                    {similarUrls.map((url) => (
                        <div
                            key={url}
                            className="info-box info-box-tint"
                            style={{
                                cursor: "pointer",
                                wordBreak: "break-all",
                                fontSize: 10,
                            }}
                            onClick={() => handleCopy(url)}
                        >
                            {url}
                            <span style={{ display: "block", marginTop: 2, opacity: 0.7, fontSize: 9 }}>
                                Click to copy
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Wayback Machine */}
            <div className="stack-sm">
                <label>Check archived version</label>
                <button
                    className="btn-secondary w-full"
                    onClick={() => window.open(waybackUrl, "_blank")}
                >
                    View on Wayback Machine
                </button>
            </div>

            {/* Common fix tips */}
            <div className="info-box info-box-default">
                <p style={{ fontSize: 10, margin: 0 }}>
                    <strong>Common fixes:</strong>
                    <br />
                    - Check for typos in the URL
                    <br />
                    - Page may have been moved (update to new URL)
                    <br />
                    - Page may have been deleted (remove the link)
                    <br />
                    - External site may be temporarily down (re-check later)
                    <br />
                    {brokenUrl.includes("http://") && "- Try switching from http:// to https://"}
                </p>
            </div>
        </div>
    )
}

export default FixSuggestions
