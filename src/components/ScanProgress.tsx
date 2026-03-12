import { useScanStore } from "@/store/scanStore"

export default function ScanProgress() {
    const { progress } = useScanStore()

    if (progress.phase === "idle") return null

    const pagePercent = progress.totalPages > 0
        ? Math.round((progress.pagesScanned / progress.totalPages) * 100)
        : 0

    const linkPercent = progress.estimatedTotalLinks > 0
        ? Math.min(100, Math.round((progress.linksChecked / progress.estimatedTotalLinks) * 100))
        : 0

    const isScanning = progress.scanning
    const phaseLabel = progress.phase === "crawling"
        ? "Crawling pages..."
        : progress.phase === "checking"
            ? "Checking links..."
            : progress.phase === "complete"
                ? "Scan complete"
                : progress.phase === "error"
                    ? "Scan failed"
                    : ""

    return (
        <div className="card" style={{ borderColor: isScanning ? "var(--framer-color-tint)" : undefined }}>
            <div className="stack-sm">
                <div className="row-between">
                    <h3>{phaseLabel}</h3>
                    {isScanning && (
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
                        <div className="progress-bar-fill" style={{ width: `${pagePercent}%` }} />
                    </div>
                </div>

                {/* Links progress */}
                <div className="stack-sm">
                    <div className="row-between">
                        <span style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                            Links checked
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600 }}>
                            {progress.linksChecked}
                        </span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${linkPercent}%` }} />
                    </div>
                </div>

                {/* Current page */}
                {isScanning && progress.currentPage && (
                    <p className="truncate" style={{ fontSize: 10, maxWidth: "100%" }}>
                        {progress.currentPage}
                    </p>
                )}
            </div>
        </div>
    )
}
