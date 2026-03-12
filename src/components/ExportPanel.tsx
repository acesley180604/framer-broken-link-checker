import { useState } from "react"
import { useScanStore } from "@/store/scanStore"
import { downloadCSV, downloadHTMLReport } from "@/utils/exportUtils"

export default function ExportPanel() {
    const { currentScan, showToast, ignoreAllBroken } = useScanStore()
    const [copied, setCopied] = useState(false)

    if (!currentScan) {
        return (
            <div className="empty-state">
                <p>No scan results to export.</p>
                <p style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                    Run a scan first to export results.
                </p>
            </div>
        )
    }

    const brokenCount = currentScan.links.filter((l) => l.status === "broken").length
    const ignoredCount = currentScan.links.filter((l) => l.ignored).length

    const handleCopyBrokenUrls = () => {
        const brokenUrls = currentScan.links
            .filter((l) => l.status === "broken" && !l.ignored)
            .map((l) => l.targetUrl)
            .join("\n")

        navigator.clipboard.writeText(brokenUrls).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    // Embed script content
    const embedScript = `<script>
(function(){
  var links=document.querySelectorAll('a[href]');
  var results=[];
  links.forEach(function(a){
    var url=a.href;
    if(!url||url.startsWith('javascript:')||url.startsWith('mailto:')||url.startsWith('tel:'))return;
    fetch(url,{method:'HEAD',mode:'no-cors'}).then(function(r){
      results.push({url:url,status:r.status||0,ok:r.ok});
    }).catch(function(){
      results.push({url:url,status:0,ok:false});
    });
  });
  window.__blcResults=results;
  console.log('[BLC] Checking',links.length,'links');
})();
</script>`

    return (
        <div className="stack-lg">
            {/* Export options */}
            <div className="stack-sm">
                <h2>Export Report</h2>
                <p>Download scan results in your preferred format.</p>
            </div>

            <div className="grid-2">
                <button
                    className="framer-button-primary"
                    onClick={() => {
                        downloadCSV(currentScan)
                        showToast("CSV downloaded", "success")
                    }}
                >
                    Export CSV
                </button>
                <button
                    className="framer-button-primary"
                    onClick={() => {
                        downloadHTMLReport(currentScan)
                        showToast("HTML report downloaded", "success")
                    }}
                >
                    Export Report
                </button>
            </div>

            <hr />

            {/* Bulk actions */}
            <div className="stack-sm">
                <h2>Bulk Actions</h2>
                <div className="grid-2">
                    <button
                        className="btn-secondary"
                        onClick={handleCopyBrokenUrls}
                        disabled={brokenCount === 0}
                    >
                        {copied ? "Copied!" : `Copy ${brokenCount} broken URLs`}
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => {
                            ignoreAllBroken()
                            showToast(`Ignored ${brokenCount} broken links`, "info")
                        }}
                        disabled={brokenCount === 0}
                    >
                        Ignore all broken
                    </button>
                </div>
                {ignoredCount > 0 && (
                    <p style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                        {ignoredCount} link{ignoredCount !== 1 ? "s" : ""} currently ignored
                    </p>
                )}
            </div>

            <hr />

            {/* Embed Script */}
            <div className="stack-sm">
                <h2>Continuous Monitoring</h2>
                <p>
                    Add this script to your Framer site's custom code to enable client-side
                    link checking on every page load.
                </p>
                <div className="code-block">
                    <button
                        className={`copy-btn ${copied ? "copied" : ""}`}
                        onClick={() => {
                            navigator.clipboard.writeText(embedScript)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                        }}
                    >
                        {copied ? "Copied" : "Copy"}
                    </button>
                    {embedScript}
                </div>
            </div>

            {/* Install guide */}
            <div className="stack-sm" style={{ border: "1px solid var(--framer-color-divider)", borderRadius: 8, overflow: "hidden" }}>
                <header style={{ padding: "8px 12px", background: "var(--framer-color-bg-secondary)", borderBottom: "1px solid var(--framer-color-divider)", fontSize: 11, fontWeight: 600 }}>
                    Installation Guide
                </header>
                <ol style={{ padding: "10px 12px 10px 28px", margin: 0, fontSize: 11, color: "var(--framer-color-text-secondary)", lineHeight: 1.8 }}>
                    <li>Open your Framer project settings</li>
                    <li>Go to General &gt; Custom Code</li>
                    <li>Paste the script in the "End of &lt;body&gt; tag" section</li>
                    <li>Publish your site</li>
                    <li>Open browser console to see results</li>
                </ol>
            </div>

            {/* Summary */}
            <div className="info-box info-box-default">
                <p style={{ fontSize: 10, margin: 0 }}>
                    <strong>Scan Summary</strong><br />
                    Site: {currentScan.siteUrl}<br />
                    Pages: {currentScan.pagesScanned} | Links: {currentScan.linksChecked}<br />
                    Broken: {currentScan.broken} | Redirects: {currentScan.redirects}<br />
                    Health: {currentScan.healthScore}%
                </p>
            </div>
        </div>
    )
}
