import { useState, useCallback } from "react"
import { useScanStore } from "@/store/scanStore"
import { runScan, abortScan, pauseScan, resumeScan } from "@/utils/scanner"

export function ScanConfig() {
    const {
        scanConfig,
        setScanConfig,
        setProgress,
        setCurrentScan,
        addToHistory,
        addLiveResult,
        clearLiveResults,
        progress,
        showToast,
    } = useScanStore()
    const [showAdvanced, setShowAdvanced] = useState(false)

    const handleStartScan = useCallback(async () => {
        if (progress.scanning) {
            abortScan()
            setProgress({ scanning: false, paused: false, phase: "idle" })
            showToast("Scan cancelled", "info")
            return
        }

        clearLiveResults()
        setProgress({
            scanning: true,
            paused: false,
            currentPage: "",
            pagesScanned: 0,
            totalPages: 0,
            linksChecked: 0,
            estimatedTotalLinks: 0,
            phase: "crawling",
            liveResults: [],
            okCount: 0,
            brokenCount: 0,
            redirectCount: 0,
            errorCount: 0,
        })

        await runScan(scanConfig, {
            onPageScanned: (url, pageIndex, totalPages) => {
                setProgress({
                    currentPage: url,
                    pagesScanned: pageIndex,
                    totalPages,
                    phase: "crawling",
                })
            },
            onLinkChecked: (link, linkIndex, totalLinks) => {
                setProgress({
                    linksChecked: linkIndex,
                    estimatedTotalLinks: totalLinks,
                    phase: "checking",
                })
                addLiveResult(link)
            },
            onComplete: (result) => {
                setCurrentScan(result)
                addToHistory(result)
                setProgress({
                    scanning: false,
                    paused: false,
                    phase: "complete",
                    pagesScanned: result.pagesScanned,
                    linksChecked: result.linksChecked,
                })
                showToast(
                    `Scan complete: ${result.linksChecked} links checked, ${result.broken} broken`,
                    result.broken > 0 ? "error" : "success",
                )
            },
            onError: (error) => {
                setProgress({ scanning: false, paused: false, phase: "error" })
                showToast(error, "error")
            },
        })
    }, [progress.scanning, scanConfig, setProgress, setCurrentScan, addToHistory, addLiveResult, clearLiveResults, showToast])

    const handlePauseResume = useCallback(() => {
        if (progress.paused) {
            resumeScan()
            setProgress({ paused: false, phase: "checking" })
        } else {
            pauseScan()
            setProgress({ paused: true, phase: "paused" })
        }
    }, [progress.paused, setProgress])

    return (
        <div className="stack-lg">
            {/* URL Input */}
            <div className="stack-sm">
                <label>Site URL</label>
                <div className="row gap-6">
                    <input
                        type="url"
                        placeholder="https://your-site.framer.website"
                        value={scanConfig.siteUrl}
                        onChange={(e) => setScanConfig({ siteUrl: e.target.value })}
                        disabled={progress.scanning}
                    />
                </div>
            </div>

            {/* Quick Settings */}
            <div className="grid-2">
                <div className="stack-sm">
                    <label>Max Pages</label>
                    <input
                        type="number"
                        min={1}
                        max={500}
                        value={scanConfig.maxPages}
                        onChange={(e) => setScanConfig({ maxPages: parseInt(e.target.value) || 100 })}
                        disabled={progress.scanning}
                    />
                </div>
                <div className="stack-sm">
                    <label>Timeout (ms)</label>
                    <input
                        type="number"
                        min={1000}
                        max={30000}
                        step={1000}
                        value={scanConfig.timeout}
                        onChange={(e) => setScanConfig({ timeout: parseInt(e.target.value) || 10000 })}
                        disabled={progress.scanning}
                    />
                </div>
            </div>

            {/* Toggles */}
            <div className="stack-sm">
                <div className="row-between">
                    <span style={{ fontSize: 11 }}>Check external links</span>
                    <div
                        className={`toggle ${scanConfig.checkExternalLinks ? "on" : ""}`}
                        onClick={() => setScanConfig({ checkExternalLinks: !scanConfig.checkExternalLinks })}
                    >
                        <div className="toggle-knob" />
                    </div>
                </div>
                <div className="row-between">
                    <span style={{ fontSize: 11 }}>Check images</span>
                    <div
                        className={`toggle ${scanConfig.checkImages ? "on" : ""}`}
                        onClick={() => setScanConfig({ checkImages: !scanConfig.checkImages })}
                    >
                        <div className="toggle-knob" />
                    </div>
                </div>
                <div className="row-between">
                    <span style={{ fontSize: 11 }}>Follow redirects</span>
                    <div
                        className={`toggle ${scanConfig.followRedirects ? "on" : ""}`}
                        onClick={() => setScanConfig({ followRedirects: !scanConfig.followRedirects })}
                    >
                        <div className="toggle-knob" />
                    </div>
                </div>
                <div className="row-between">
                    <span style={{ fontSize: 11 }}>Detect soft 404 errors</span>
                    <div
                        className={`toggle ${scanConfig.detectSoftErrors ? "on" : ""}`}
                        onClick={() => setScanConfig({ detectSoftErrors: !scanConfig.detectSoftErrors })}
                    >
                        <div className="toggle-knob" />
                    </div>
                </div>
                <div className="row-between">
                    <span style={{ fontSize: 11 }}>Check SSL certificates</span>
                    <div
                        className={`toggle ${scanConfig.checkSsl ? "on" : ""}`}
                        onClick={() => setScanConfig({ checkSsl: !scanConfig.checkSsl })}
                    >
                        <div className="toggle-knob" />
                    </div>
                </div>
            </div>

            {/* Advanced Settings Toggle */}
            <button className="btn-link" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? "Hide" : "Show"} advanced settings
            </button>

            {showAdvanced && (
                <div
                    className="stack-sm"
                    style={{
                        padding: "10px 12px",
                        background: "var(--framer-color-bg-secondary)",
                        borderRadius: 8,
                    }}
                >
                    <div className="grid-2">
                        <div className="stack-sm">
                            <label>Max Depth</label>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={scanConfig.maxDepth}
                                onChange={(e) => setScanConfig({ maxDepth: parseInt(e.target.value) || 5 })}
                                disabled={progress.scanning}
                            />
                        </div>
                        <div className="stack-sm">
                            <label>Concurrency</label>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={scanConfig.concurrency}
                                onChange={(e) => setScanConfig({ concurrency: parseInt(e.target.value) || 5 })}
                                disabled={progress.scanning}
                            />
                        </div>
                    </div>

                    <div className="stack-sm">
                        <label>CORS Proxy URL (for accurate external link checking)</label>
                        <input
                            type="url"
                            placeholder="https://your-cors-proxy.example.com"
                            value={scanConfig.proxyUrl}
                            onChange={(e) => setScanConfig({ proxyUrl: e.target.value })}
                            disabled={progress.scanning}
                        />
                    </div>

                    <div className="stack-sm">
                        <label>Google Safe Browsing API Key</label>
                        <input
                            type="password"
                            placeholder="API key for malware detection"
                            value={scanConfig.safeBrowsingApiKey}
                            onChange={(e) => setScanConfig({ safeBrowsingApiKey: e.target.value })}
                            disabled={progress.scanning}
                        />
                    </div>

                    <div className="row-between">
                        <span style={{ fontSize: 11 }}>Check scripts</span>
                        <div
                            className={`toggle ${scanConfig.checkScripts ? "on" : ""}`}
                            onClick={() => setScanConfig({ checkScripts: !scanConfig.checkScripts })}
                        >
                            <div className="toggle-knob" />
                        </div>
                    </div>
                    <div className="row-between">
                        <span style={{ fontSize: 11 }}>Check stylesheets</span>
                        <div
                            className={`toggle ${scanConfig.checkStylesheets ? "on" : ""}`}
                            onClick={() => setScanConfig({ checkStylesheets: !scanConfig.checkStylesheets })}
                        >
                            <div className="toggle-knob" />
                        </div>
                    </div>
                    <div className="row-between">
                        <span style={{ fontSize: 11 }}>Respect robots.txt</span>
                        <div
                            className={`toggle ${scanConfig.respectRobotsTxt ? "on" : ""}`}
                            onClick={() => setScanConfig({ respectRobotsTxt: !scanConfig.respectRobotsTxt })}
                        >
                            <div className="toggle-knob" />
                        </div>
                    </div>
                    <div className="stack-sm">
                        <label>User Agent</label>
                        <input
                            type="text"
                            value={scanConfig.userAgent}
                            onChange={(e) => setScanConfig({ userAgent: e.target.value })}
                            disabled={progress.scanning}
                        />
                    </div>
                </div>
            )}

            {/* Start/Stop/Pause Buttons */}
            <div className="row gap-6">
                <button
                    className={progress.scanning ? "btn-secondary w-full" : "framer-button-primary w-full"}
                    onClick={handleStartScan}
                    disabled={!scanConfig.siteUrl && !progress.scanning}
                    style={progress.scanning ? { borderColor: "#e53e3e", color: "#e53e3e" } : undefined}
                >
                    {progress.scanning ? "Stop Scan" : "Start Scan"}
                </button>
                {progress.scanning && (
                    <button
                        className="btn-secondary"
                        onClick={handlePauseResume}
                        style={{ minWidth: 80 }}
                    >
                        {progress.paused ? "Resume" : "Pause"}
                    </button>
                )}
            </div>

            {/* Info */}
            <div className="info-box info-box-default">
                <p style={{ fontSize: 10 }}>
                    The scanner crawls your site starting from the URL above, fetches each page's
                    HTML, extracts all links, and checks them with real HTTP requests. Internal links
                    get full status codes; external links use HEAD requests with CORS fallback.
                    {scanConfig.proxyUrl && " A CORS proxy is configured for accurate external checking."}
                </p>
            </div>
        </div>
    )
}
