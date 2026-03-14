import { useMemo } from "react"
import { motion } from "motion/react"
import { useScanStore } from "@/store/scanStore"

export function ScanHistory() {
    const { scanHistory, setCurrentScan, clearHistory } = useScanStore()

    const trendScans = useMemo(
        () => [...scanHistory].reverse().slice(-10),
        [scanHistory],
    )

    if (scanHistory.length === 0) {
        return (
            <div className="empty-state">
                <p>No scan history yet.</p>
                <p style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                    Previous scan results will appear here for comparison.
                </p>
            </div>
        )
    }

    const barHeight = 60

    return (
        <div className="stack-lg">
            {/* Health Score Trend */}
            {trendScans.length >= 2 && (
                <div className="stack-sm">
                    <h3>Health Score Trend</h3>
                    <div
                        className="card"
                        style={{
                            padding: "12px",
                            display: "flex",
                            alignItems: "flex-end",
                            gap: 4,
                            height: barHeight + 30,
                        }}
                    >
                        {trendScans.map((scan, index) => {
                            const height = (scan.healthScore / 100) * barHeight
                            const color =
                                scan.healthScore >= 90
                                    ? "#38a169"
                                    : scan.healthScore >= 70
                                      ? "#d69e2e"
                                      : "#e53e3e"
                            return (
                                <div
                                    key={scan.id}
                                    style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: 2,
                                    }}
                                >
                                    <span style={{ fontSize: 9, fontWeight: 600, color }}>
                                        {scan.healthScore}%
                                    </span>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height }}
                                        transition={{ duration: 0.5, delay: index * 0.05 }}
                                        style={{
                                            width: "100%",
                                            maxWidth: 30,
                                            background: color,
                                            borderRadius: 3,
                                        }}
                                    />
                                    <span style={{ fontSize: 8, color: "var(--framer-color-text-tertiary)" }}>
                                        {new Date(scan.completedAt).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Comparison Table */}
            <div className="stack-sm">
                <div className="row-between">
                    <h3>Past Scans</h3>
                    <button className="btn-danger" onClick={clearHistory}>
                        Clear history
                    </button>
                </div>

                <div style={{ border: "1px solid var(--framer-color-divider)", borderRadius: 8, overflow: "hidden" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th className="text-right">Health</th>
                                <th className="text-right">Links</th>
                                <th className="text-right">Broken</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scanHistory.map((scan) => {
                                const healthColor =
                                    scan.healthScore >= 90
                                        ? "#38a169"
                                        : scan.healthScore >= 70
                                          ? "#d69e2e"
                                          : "#e53e3e"

                                return (
                                    <tr key={scan.id}>
                                        <td className="text-primary">
                                            {new Date(scan.completedAt).toLocaleDateString()}
                                        </td>
                                        <td className="text-right" style={{ color: healthColor, fontWeight: 600 }}>
                                            {scan.healthScore}%
                                        </td>
                                        <td className="text-right">{scan.linksChecked}</td>
                                        <td className="text-right text-red">{scan.broken}</td>
                                        <td className="text-right">
                                            <button className="btn-link" onClick={() => setCurrentScan(scan)}>
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Comparison between latest and previous */}
            {scanHistory.length >= 2 && (
                <div className="stack-sm">
                    <h3>Latest vs Previous</h3>
                    <div className="grid-2">
                        {(() => {
                            const latest = scanHistory[0]
                            const previous = scanHistory[1]
                            const healthDiff = latest.healthScore - previous.healthScore
                            const brokenDiff = latest.broken - previous.broken
                            const linksDiff = latest.linksChecked - previous.linksChecked

                            return (
                                <>
                                    <div className="stat-card">
                                        <div className="stat-label">Health Change</div>
                                        <div
                                            className="stat-value"
                                            style={{
                                                color:
                                                    healthDiff > 0
                                                        ? "#38a169"
                                                        : healthDiff < 0
                                                          ? "#e53e3e"
                                                          : "var(--framer-color-text)",
                                            }}
                                        >
                                            {healthDiff > 0 ? "+" : ""}
                                            {healthDiff}%
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-label">Broken Change</div>
                                        <div
                                            className="stat-value"
                                            style={{
                                                color:
                                                    brokenDiff < 0
                                                        ? "#38a169"
                                                        : brokenDiff > 0
                                                          ? "#e53e3e"
                                                          : "var(--framer-color-text)",
                                            }}
                                        >
                                            {brokenDiff > 0 ? "+" : ""}
                                            {brokenDiff}
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-label">Links Change</div>
                                        <div className="stat-value">
                                            {linksDiff > 0 ? "+" : ""}
                                            {linksDiff}
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-label">Previous Scan</div>
                                        <div
                                            style={{
                                                fontSize: 10,
                                                marginTop: 2,
                                                color: "var(--framer-color-text-secondary)",
                                            }}
                                        >
                                            {new Date(previous.completedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </>
                            )
                        })()}
                    </div>
                </div>
            )}
        </div>
    )
}

export default ScanHistory
