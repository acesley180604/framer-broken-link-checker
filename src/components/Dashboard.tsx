import { useMemo, useEffect, useState } from "react"
import { motion } from "motion/react"
import { useScanStore } from "@/store/scanStore"
import { getStatusColor } from "@/utils/statusCodes"

export function Dashboard() {
    const { currentScan, statusCounts } = useScanStore()
    const [animatedScore, setAnimatedScore] = useState(0)

    const counts = useMemo(() => statusCounts(), [statusCounts])

    const totalLinks = currentScan?.linksChecked ?? 0

    const avgResponseTime = useMemo(() => {
        if (!currentScan || totalLinks === 0) return 0
        return Math.round(currentScan.links.reduce((sum, l) => sum + l.responseTime, 0) / totalLinks)
    }, [currentScan, totalLinks])

    const healthColor = useMemo(() => {
        if (!currentScan) return "#38a169"
        return currentScan.healthScore >= 90 ? "#38a169" : currentScan.healthScore >= 70 ? "#d69e2e" : "#e53e3e"
    }, [currentScan])

    // Animate health score ring
    useEffect(() => {
        if (!currentScan) return
        setAnimatedScore(0)
        const target = currentScan.healthScore
        const duration = 1000
        const start = performance.now()
        const animate = (time: number) => {
            const elapsed = time - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
            setAnimatedScore(Math.round(eased * target))
            if (progress < 1) requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)
    }, [currentScan])

    // Group by status code
    const sortedStatusCodes = useMemo(() => {
        if (!currentScan) return []
        const statusCodeGroups: Record<number, number> = {}
        for (const link of currentScan.links) {
            if (link.statusCode !== null) {
                statusCodeGroups[link.statusCode] = (statusCodeGroups[link.statusCode] ?? 0) + 1
            }
        }
        return Object.entries(statusCodeGroups)
            .map(([code, count]) => ({ code: parseInt(code), count }))
            .sort((a, b) => b.count - a.count)
    }, [currentScan])

    // Top broken pages
    const topBrokenPages = useMemo(() => {
        if (!currentScan) return []
        const brokenByPage: Record<string, number> = {}
        for (const link of currentScan.links) {
            if (link.status === "broken" || link.status === "soft404") {
                brokenByPage[link.sourceUrl] = (brokenByPage[link.sourceUrl] ?? 0) + 1
            }
        }
        return Object.entries(brokenByPage)
            .map(([url, count]) => ({ url, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
    }, [currentScan])

    // Most linked-to broken URLs
    const topBrokenUrls = useMemo(() => {
        if (!currentScan) return []
        const brokenUrlCounts: Record<string, number> = {}
        for (const link of currentScan.links) {
            if (link.status === "broken" || link.status === "soft404") {
                brokenUrlCounts[link.targetUrl] = (brokenUrlCounts[link.targetUrl] ?? 0) + 1
            }
        }
        return Object.entries(brokenUrlCounts)
            .map(([url, count]) => ({ url, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
    }, [currentScan])

    // Links by element type
    const elementBreakdown = useMemo(() => {
        if (!currentScan) return []
        const byElement: Record<string, number> = {}
        for (const link of currentScan.links) {
            byElement[link.element] = (byElement[link.element] ?? 0) + 1
        }
        return Object.entries(byElement)
            .map(([element, count]) => ({ element, count }))
            .sort((a, b) => b.count - a.count)
    }, [currentScan])

    // Response time distribution
    const responseTimeDistribution = useMemo(() => {
        if (!currentScan) return []
        const buckets = [
            { label: "< 100ms", max: 100, count: 0 },
            { label: "100-300ms", max: 300, count: 0 },
            { label: "300-1s", max: 1000, count: 0 },
            { label: "1-3s", max: 3000, count: 0 },
            { label: "3s+", max: Infinity, count: 0 },
        ]
        for (const link of currentScan.links) {
            for (const bucket of buckets) {
                if (link.responseTime < bucket.max) {
                    bucket.count++
                    break
                }
            }
        }
        return buckets
    }, [currentScan])

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

    // SVG health ring
    const ringSize = 80
    const strokeWidth = 6
    const radius = (ringSize - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (animatedScore / 100) * circumference

    return (
        <div className="stack-lg">
            {/* Health Score + Key Stats */}
            <div className="row gap-15" style={{ alignItems: "flex-start" }}>
                {/* Health ring (SVG animated) */}
                <div style={{ position: "relative", width: ringSize, height: ringSize, flexShrink: 0 }}>
                    <svg width={ringSize} height={ringSize} style={{ transform: "rotate(-90deg)" }}>
                        <circle
                            cx={ringSize / 2}
                            cy={ringSize / 2}
                            r={radius}
                            fill="none"
                            stroke="var(--framer-color-bg-tertiary)"
                            strokeWidth={strokeWidth}
                        />
                        <motion.circle
                            cx={ringSize / 2}
                            cy={ringSize / 2}
                            r={radius}
                            fill="none"
                            stroke={healthColor}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                        />
                    </svg>
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <div style={{ fontSize: 20, fontWeight: 800, color: healthColor, lineHeight: 1 }}>
                            {animatedScore}
                        </div>
                        <div style={{ fontSize: 9, color: "var(--framer-color-text-tertiary)", marginTop: 2 }}>
                            Health
                        </div>
                    </div>
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

            {/* Status breakdown with animated bars */}
            <div className="stack-sm">
                <h3>Status Breakdown</h3>
                {[
                    { key: "ok", label: "Working", count: counts.ok },
                    { key: "broken", label: "Broken", count: counts.broken + (counts.soft404 ?? 0) },
                    { key: "redirect", label: "Redirects", count: counts.redirect },
                    { key: "timeout", label: "Timeout", count: counts.timeout },
                    { key: "error", label: "Error", count: counts.error },
                    { key: "ssl-error", label: "SSL Issues", count: (counts["ssl-error"] ?? 0) + (counts["mixed-content"] ?? 0) },
                ].filter((s) => s.count > 0).map((s) => (
                    <div key={s.key} className="row gap-8" style={{ alignItems: "center" }}>
                        <span style={{ fontSize: 10, width: 60, flexShrink: 0, color: getStatusColor(s.key) }}>
                            {s.label}
                        </span>
                        <div style={{ flex: 1, height: 12, background: "var(--framer-color-bg-tertiary)", borderRadius: 6, overflow: "hidden" }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(s.count / totalLinks) * 100}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                style={{ height: "100%", borderRadius: 6, background: getStatusColor(s.key) }}
                            />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, width: 40, textAlign: "right" }}>
                            {s.count}
                        </span>
                    </div>
                ))}
            </div>

            {/* Status bar visualization */}
            <div className="stack-sm">
                <h3>Link Status Distribution</h3>
                <div className="status-bar" style={{ height: 14 }}>
                    {totalLinks > 0 && (
                        <>
                            <motion.div
                                className="status-bar-segment"
                                initial={{ width: 0 }}
                                animate={{ width: `${(counts.ok / totalLinks) * 100}%` }}
                                transition={{ duration: 0.5 }}
                                style={{ background: "#38a169" }}
                                title={`Working: ${counts.ok}`}
                            />
                            <motion.div
                                className="status-bar-segment"
                                initial={{ width: 0 }}
                                animate={{ width: `${(counts.redirect / totalLinks) * 100}%` }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                style={{ background: "#d69e2e" }}
                                title={`Redirects: ${counts.redirect}`}
                            />
                            <motion.div
                                className="status-bar-segment"
                                initial={{ width: 0 }}
                                animate={{ width: `${((counts.broken + (counts.soft404 ?? 0)) / totalLinks) * 100}%` }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                style={{ background: "#e53e3e" }}
                                title={`Broken: ${counts.broken + (counts.soft404 ?? 0)}`}
                            />
                            <motion.div
                                className="status-bar-segment"
                                initial={{ width: 0 }}
                                animate={{ width: `${((counts.timeout + counts.error + (counts["ssl-error"] ?? 0) + (counts["mixed-content"] ?? 0)) / totalLinks) * 100}%` }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                style={{ background: "#805ad5" }}
                                title={`Other: ${counts.timeout + counts.error + (counts["ssl-error"] ?? 0) + (counts["mixed-content"] ?? 0)}`}
                            />
                        </>
                    )}
                </div>
                <div className="row gap-10" style={{ flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: "#38a169" }}>
                        Working {totalLinks > 0 ? Math.round((counts.ok / totalLinks) * 100) : 0}%
                    </span>
                    <span style={{ fontSize: 10, color: "#d69e2e" }}>
                        Redirect {totalLinks > 0 ? Math.round((counts.redirect / totalLinks) * 100) : 0}%
                    </span>
                    <span style={{ fontSize: 10, color: "#e53e3e" }}>
                        Broken {totalLinks > 0 ? Math.round(((counts.broken + (counts.soft404 ?? 0)) / totalLinks) * 100) : 0}%
                    </span>
                    <span style={{ fontSize: 10, color: "#805ad5" }}>
                        Other {totalLinks > 0 ? Math.round(((counts.timeout + counts.error + (counts["ssl-error"] ?? 0) + (counts["mixed-content"] ?? 0)) / totalLinks) * 100) : 0}%
                    </span>
                </div>
            </div>

            {/* Response Time Distribution */}
            {responseTimeDistribution.some((b) => b.count > 0) && (
                <div className="stack-sm">
                    <h3>Response Time Distribution</h3>
                    {responseTimeDistribution.map((bucket) => (
                        <div key={bucket.label} className="row gap-8" style={{ alignItems: "center" }}>
                            <span style={{ fontSize: 10, width: 70, flexShrink: 0, color: "var(--framer-color-text-secondary)" }}>
                                {bucket.label}
                            </span>
                            <div style={{ flex: 1, height: 10, background: "var(--framer-color-bg-tertiary)", borderRadius: 5, overflow: "hidden" }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${totalLinks > 0 ? (bucket.count / totalLinks) * 100 : 0}%` }}
                                    transition={{ duration: 0.5 }}
                                    style={{ height: "100%", borderRadius: 5, background: "var(--framer-color-tint)" }}
                                />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 600, width: 35, textAlign: "right" }}>
                                {bucket.count}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Links by Element Type */}
            {elementBreakdown.length > 0 && (
                <div className="stack-sm">
                    <h3>Links by Element Type</h3>
                    <div style={{ border: "1px solid var(--framer-color-divider)", borderRadius: 8, overflow: "hidden" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Element</th>
                                    <th className="text-right">Count</th>
                                    <th className="text-right">%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {elementBreakdown.map(({ element, count }) => (
                                    <tr key={element}>
                                        <td className="text-primary">&lt;{element}&gt;</td>
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

            {/* Most Linked-To Broken URLs */}
            {topBrokenUrls.length > 0 && (
                <div className="stack-sm">
                    <h3>Most Linked-To Broken URLs</h3>
                    <div style={{ border: "1px solid var(--framer-color-divider)", borderRadius: 8, overflow: "hidden" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>URL</th>
                                    <th className="text-right">References</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topBrokenUrls.map(({ url, count }) => (
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
                    Site: {currentScan.siteUrl}
                    <br />
                    Scanned: {new Date(currentScan.completedAt).toLocaleString()}
                    <br />
                    Duration:{" "}
                    {Math.round(
                        (new Date(currentScan.completedAt).getTime() -
                            new Date(currentScan.startedAt).getTime()) /
                            1000,
                    )}
                    s
                </p>
            </div>
        </div>
    )
}

export default Dashboard
