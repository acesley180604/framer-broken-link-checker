import { useScanStore } from "@/store/scanStore"
import { getStatusColor } from "@/utils/statusCodes"

export default function Dashboard() {
    const { currentScan, statusCounts } = useScanStore()

    if (!currentScan) {
        return (
            <div className="empty-state">
                <p>No scan data available.</p>
                <p style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                    Run a scan first to see your dashboard.
                </p>
            </div>
        )
    }

    const counts = statusCounts()
    const totalLinks = currentScan.linksChecked
    const avgResponseTime = totalLinks > 0
        ? Math.round(currentScan.links.reduce((sum, l) => sum + l.responseTime, 0) / totalLinks)
        : 0

    // Health score color
    const healthColor = currentScan.healthScore >= 90
        ? "#38a169"
        : currentScan.healthScore >= 70
            ? "#d69e2e"
            : "#e53e3e"

    // Group by status code
    const statusCodeGroups: Record<number, number> = {}
    for (const link of currentScan.links) {
        if (link.statusCode) {
            statusCodeGroups[link.statusCode] = (statusCodeGroups[link.statusCode] ?? 0) + 1
        }
    }
    const sortedStatusCodes = Object.entries(statusCodeGroups)
        .map(([code, count]) => ({ code: parseInt(code), count }))
        .sort((a, b) => b.count - a.count)

    // Top broken pages (pages with most broken links)
    const brokenByPage: Record<string, number> = {}
    for (const link of currentScan.links) {
        if (link.status === "broken") {
            brokenByPage[link.sourceUrl] = (brokenByPage[link.sourceUrl] ?? 0) + 1
        }
    }
    const topBrokenPages = Object.entries(brokenByPage)
        .map(([url, count]) => ({ url, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

    return (
        <div className="stack-lg">
            {/* Health Score + Key Stats */}
            <div className="row gap-15" style={{ alignItems: "flex-start" }}>
                {/* Health ring */}
                <div
                    className="health-ring"
                    style={{
                        border: `4px solid ${healthColor}`,
                        background: `color-mix(in srgb, ${healthColor} 8%, transparent)`,
                    }}
                >
                    <div className="health-value" style={{ color: healthColor }}>
                        {currentScan.healthScore}
                    </div>
                    <div className="health-label">Health</div>
                </div>

                {/* Key stats */}
                <div className="stack-sm" style={{ flex: 1 }}>
                    <div className="grid-2">
                        <div className="stat-card">
                            <div className="stat-label">Total Links</div>
                            <div className="stat-value">{totalLinks}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Pages Scanned</div>
                            <div className="stat-value">{currentScan.pagesScanned}</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Avg Response Time</div>
                        <div className="stat-value">{avgResponseTime}ms</div>
                    </div>
                </div>
            </div>

            {/* Status breakdown */}
            <div className="grid-4">
                <div className="stat-card">
                    <div className="stat-label">Working</div>
                    <div className="stat-value" style={{ color: getStatusColor("ok") }}>
                        {counts.ok}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Broken</div>
                    <div className="stat-value" style={{ color: getStatusColor("broken") }}>
                        {counts.broken}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Redirects</div>
                    <div className="stat-value" style={{ color: getStatusColor("redirect") }}>
                        {counts.redirect}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Timeout</div>
                    <div className="stat-value" style={{ color: getStatusColor("timeout") }}>
                        {counts.timeout + counts.error}
                    </div>
                </div>
            </div>

            {/* Status bar visualization */}
            <div className="stack-sm">
                <h3>Link Status Distribution</h3>
                <div className="status-bar" style={{ height: 14 }}>
                    {totalLinks > 0 && (
                        <>
                            <div
                                className="status-bar-segment"
                                style={{ width: `${(counts.ok / totalLinks) * 100}%`, background: "#38a169" }}
                                title={`Working: ${counts.ok}`}
                            />
                            <div
                                className="status-bar-segment"
                                style={{ width: `${(counts.redirect / totalLinks) * 100}%`, background: "#d69e2e" }}
                                title={`Redirects: ${counts.redirect}`}
                            />
                            <div
                                className="status-bar-segment"
                                style={{ width: `${(counts.broken / totalLinks) * 100}%`, background: "#e53e3e" }}
                                title={`Broken: ${counts.broken}`}
                            />
                            <div
                                className="status-bar-segment"
                                style={{ width: `${((counts.timeout + counts.error) / totalLinks) * 100}%`, background: "#dd6b20" }}
                                title={`Timeout/Error: ${counts.timeout + counts.error}`}
                            />
                        </>
                    )}
                </div>
                <div className="row gap-10" style={{ flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "#38a169" }}>Working {Math.round((counts.ok / totalLinks) * 100)}%</span>
                    <span style={{ fontSize: 10, color: "#d69e2e" }}>Redirect {Math.round((counts.redirect / totalLinks) * 100)}%</span>
                    <span style={{ fontSize: 10, color: "#e53e3e" }}>Broken {Math.round((counts.broken / totalLinks) * 100)}%</span>
                    <span style={{ fontSize: 10, color: "#dd6b20" }}>Other {Math.round(((counts.timeout + counts.error) / totalLinks) * 100)}%</span>
                </div>
            </div>

            {/* Status Codes Table */}
            {sortedStatusCodes.length > 0 && (
                <div className="stack-sm">
                    <h3>Links by Status Code</h3>
                    <div style={{ border: "1px solid var(--framer-color-divider)", borderRadius: 8, overflow: "hidden" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th className="text-right">Count</th>
                                    <th className="text-right">%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStatusCodes.slice(0, 10).map(({ code, count }) => (
                                    <tr key={code}>
                                        <td className="text-primary">{code}</td>
                                        <td className="text-right">{count}</td>
                                        <td className="text-right">
                                            {Math.round((count / totalLinks) * 100)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Top Broken Pages */}
            {topBrokenPages.length > 0 && (
                <div className="stack-sm">
                    <h3>Top Pages with Broken Links</h3>
                    <div style={{ border: "1px solid var(--framer-color-divider)", borderRadius: 8, overflow: "hidden" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Page</th>
                                    <th className="text-right">Broken</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topBrokenPages.map(({ url, count }) => (
                                    <tr key={url}>
                                        <td className="text-primary truncate" style={{ maxWidth: 220 }}>
                                            {url}
                                        </td>
                                        <td className="text-right text-red">{count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Scan info */}
            <div className="info-box info-box-default">
                <p style={{ fontSize: 10, margin: 0 }}>
                    Site: {currentScan.siteUrl}<br />
                    Scanned: {new Date(currentScan.completedAt).toLocaleString()}<br />
                    Duration: {Math.round((new Date(currentScan.completedAt).getTime() - new Date(currentScan.startedAt).getTime()) / 1000)}s
                </p>
            </div>
        </div>
    )
}
