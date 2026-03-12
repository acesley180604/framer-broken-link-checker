import { useMemo, memo } from "react"
import { motion } from "motion/react"
import { useScanStore } from "@/store/scanStore"
import { getStatusColor, getStatusLabel } from "@/utils/statusCodes"
import type { LinkResult } from "@/store/scanStore"

const LiveResultItem = memo(function LiveResultItem({ link }: { link: LinkResult }) {
    return (
        <div className="live-result-item" style={{ borderLeftColor: getStatusColor(link.status) }}>
            <div className="row-between">
                <span className="truncate" style={{ fontSize: 10, fontWeight: 500, maxWidth: 220 }}>
                    {link.targetUrl}
                </span>
                <span
                    className={`badge badge-${link.status === "soft404" ? "broken" : link.status}`}
                    style={{ flexShrink: 0 }}
                >
                    {link.statusCode ?? link.status}
                </span>
            </div>
            <div className="row gap-6" style={{ marginTop: 2 }}>
                <span style={{ fontSize: 9, color: getStatusColor(link.status), fontWeight: 600 }}>
                    {getStatusLabel(link.status)}
                </span>
                <span style={{ fontSize: 9, color: "var(--framer-color-text-tertiary)" }}>
                    {link.responseTime}ms
                </span>
                <span style={{ fontSize: 9, color: "var(--framer-color-text-tertiary)" }}>
                    {link.element}
                </span>
            </div>
        </div>
    )
})

export function ScanProgress() {
    const { progress } = useScanStore()

    const pagePercent = useMemo(
        () => (progress.totalPages > 0 ? Math.round((progress.pagesScanned / progress.totalPages) * 100) : 0),
        [progress.pagesScanned, progress.totalPages],
    )

    const linkPercent = useMemo(
        () =>
            progress.estimatedTotalLinks > 0
                ? Math.min(100, Math.round((progress.linksChecked / progress.estimatedTotalLinks) * 100))
                : 0,
        [progress.linksChecked, progress.estimatedTotalLinks],
    )

    const recentResults = useMemo(
        () => progress.liveResults.slice(-15).reverse(),
        [progress.liveResults],
    )

    if (progress.phase === "idle") return null

    const isScanning = progress.scanning
    const phaseLabel =
        progress.phase === "crawling"
            ? "Crawling pages..."
            : progress.phase === "checking"
              ? "Checking links..."
              : progress.phase === "complete"
                ? "Scan complete"
                : progress.phase === "paused"
                  ? "Scan paused"
                  : progress.phase === "error"
                    ? "Scan failed"
                    : ""

    return (
        <div className="card" style={{ borderColor: isScanning ? "var(--framer-color-tint)" : undefined }}>
            <div className="stack-sm">
                <div className="row-between">
                    <h3>{phaseLabel}</h3>
                    {isScanning && !progress.paused && (
                        <span className="saving-indicator" style={{ fontSize: 10 }}>
                            Scanning...
                        </span>
                    )}
                </div>

                {/* Pages progress */}
                <div className="stack-sm">
                    <div className="row-between">
                        <span style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                            Pages scanned
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600 }}>
                            {progress.pagesScanned} / {progress.totalPages}
                        </span>
                    </div>
                    <div className="progress-bar">
                        <motion.div
                            className="progress-bar-fill"
                            animate={{ width: `${pagePercent}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                    </div>
                </div>

                {/* Links progress */}
                <div className="stack-sm">
                    <div className="row-between">
                        <span style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                            Links checked
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600 }}>{progress.linksChecked}</span>
                    </div>
                    <div className="progress-bar">
                        <motion.div
                            className="progress-bar-fill"
                            animate={{ width: `${linkPercent}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                    </div>
                </div>

                {/* Live status breakdown */}
                {isScanning && (
                    <div className="grid-4" style={{ marginTop: 4 }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#38a169" }}>
                                {progress.okCount}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--framer-color-text-tertiary)" }}>OK</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#e53e3e" }}>
                                {progress.brokenCount}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--framer-color-text-tertiary)" }}>Broken</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#d69e2e" }}>
                                {progress.redirectCount}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--framer-color-text-tertiary)" }}>Redirect</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#805ad5" }}>
                                {progress.errorCount}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--framer-color-text-tertiary)" }}>Other</div>
                        </div>
                    </div>
                )}

                {/* Current page */}
                {isScanning && progress.currentPage && (
                    <p className="truncate" style={{ fontSize: 10, maxWidth: "100%" }}>
                        {progress.currentPage}
                    </p>
                )}

                {/* Live results stream */}
                {recentResults.length > 0 && (
                    <div className="stack-sm" style={{ maxHeight: 180, overflowY: "auto", marginTop: 6 }}>
                        <label style={{ fontSize: 10, marginBottom: 0 }}>Recent results</label>
                        {recentResults.map((link) => (
                            <LiveResultItem key={link.id} link={link} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
