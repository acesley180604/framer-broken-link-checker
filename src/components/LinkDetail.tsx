import { useScanStore } from "@/store/scanStore"
import { getStatusColor, getStatusLabel, getStatusDescription } from "@/utils/statusCodes"
import { getSimilarUrls, getWaybackUrl } from "@/utils/scanner"
import FixSuggestions from "./FixSuggestions"

export default function LinkDetail() {
    const { selectedLink, selectLink, toggleIgnoreLink, currentScan } = useScanStore()
    const link = selectedLink()

    if (!link) return null

    const allUrls = currentScan?.links
        .filter((l) => l.status === "ok")
        .map((l) => l.targetUrl) ?? []

    return (
        <div className="overlay" onClick={() => selectLink(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Link Details</h2>
                    <button onClick={() => selectLink(null)} style={{ fontSize: 16 }}>x</button>
                </div>
                <div className="modal-body">
                    <div className="stack-lg">
                        {/* Status badge */}
                        <div className="row gap-8">
                            <span
                                className={`badge badge-${link.status}`}
                                style={{ fontSize: 12, padding: "4px 12px" }}
                            >
                                {getStatusLabel(link.status)}
                            </span>
                            {link.statusCode && (
                                <span style={{ fontSize: 12, color: getStatusColor(link.status), fontWeight: 600 }}>
                                    {link.statusCode} - {getStatusDescription(link.statusCode)}
                                </span>
                            )}
                        </div>

                        {/* Target URL */}
                        <div className="stack-sm">
                            <label>Target URL</label>
                            <div className="info-box info-box-default" style={{ wordBreak: "break-all" }}>
                                {link.targetUrl}
                            </div>
                        </div>

                        {/* Source page */}
                        <div className="stack-sm">
                            <label>Found on page</label>
                            <div className="info-box info-box-default" style={{ wordBreak: "break-all" }}>
                                {link.sourceUrl}
                            </div>
                        </div>

                        {/* Redirect destination */}
                        {link.redirectTo && (
                            <div className="stack-sm">
                                <label>Redirects to</label>
                                <div className="info-box info-box-tint" style={{ wordBreak: "break-all" }}>
                                    {link.redirectTo}
                                </div>
                            </div>
                        )}

                        {/* Metadata grid */}
                        <div className="grid-2">
                            <div className="stat-card">
                                <div className="stat-label">Link Text</div>
                                <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>
                                    {link.linkText || "(no text)"}
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Response Time</div>
                                <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>
                                    {link.responseTime}ms
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Element</div>
                                <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>
                                    &lt;{link.element}&gt;
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Link Type</div>
                                <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }} className="capitalize">
                                    {link.linkType}
                                </div>
                            </div>
                        </div>

                        {/* Checked at */}
                        <p style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                            Checked: {new Date(link.checkedAt).toLocaleString()}
                        </p>

                        {/* Fix suggestions for broken links */}
                        {(link.status === "broken" || link.status === "timeout" || link.status === "error") && (
                            <FixSuggestions
                                brokenUrl={link.targetUrl}
                                similarUrls={getSimilarUrls(link.targetUrl, allUrls)}
                                waybackUrl={getWaybackUrl(link.targetUrl)}
                            />
                        )}

                        {/* Actions */}
                        <div className="row gap-8">
                            <button
                                className="btn-secondary"
                                onClick={() => toggleIgnoreLink(link.id)}
                            >
                                {link.ignored ? "Un-ignore" : "Ignore this link"}
                            </button>
                            <button
                                className="btn-link"
                                onClick={() => window.open(link.targetUrl, "_blank")}
                            >
                                Open URL
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
