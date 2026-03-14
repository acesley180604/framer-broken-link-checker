import type { ScanResult, LinkResult } from "@/store/scanStore"
import { getStatusDescription, getStatusLabel } from "./statusCodes"

// ── CSV Export ──────────────────────────────────────────────────────────────

export function exportToCSV(scan: ScanResult): string {
    const headers = [
        "Source URL",
        "Target URL",
        "Status",
        "Status Code",
        "Status Description",
        "Link Text",
        "Link Type",
        "Element",
        "Response Time (ms)",
        "Redirect To",
        "Context",
        "Soft Error Reason",
        "SSL Status",
        "Checked At",
        "Ignored",
    ]

    const rows = scan.links.map((link) => [
        escapeCSV(link.sourceUrl),
        escapeCSV(link.targetUrl),
        getStatusLabel(link.status),
        link.statusCode?.toString() ?? "",
        link.statusCode !== null ? getStatusDescription(link.statusCode) : "No Response",
        escapeCSV(link.linkText),
        link.linkType,
        link.element,
        link.responseTime.toString(),
        escapeCSV(link.redirectTo ?? ""),
        escapeCSV(link.context ?? ""),
        escapeCSV(link.softErrorReason ?? ""),
        escapeCSV(link.sslStatus ?? ""),
        link.checkedAt,
        link.ignored ? "Yes" : "No",
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
    return csvContent
}

function escapeCSV(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

export function downloadCSV(scan: ScanResult): void {
    const csv = exportToCSV(scan)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    downloadBlob(blob, `broken-link-report-${sanitizeFilename(scan.siteUrl)}-${scan.completedAt.split("T")[0]}.csv`)
}

// ── JSON Export ─────────────────────────────────────────────────────────────

export function exportToJSON(scan: ScanResult): string {
    const report = {
        meta: {
            siteUrl: scan.siteUrl,
            startedAt: scan.startedAt,
            completedAt: scan.completedAt,
            pagesScanned: scan.pagesScanned,
            linksChecked: scan.linksChecked,
            broken: scan.broken,
            redirects: scan.redirects,
            healthScore: scan.healthScore,
            generator: "Broken Link Checker for Framer v2.0",
        },
        summary: {
            ok: scan.links.filter((l) => l.status === "ok").length,
            broken: scan.links.filter((l) => l.status === "broken").length,
            soft404: scan.links.filter((l) => l.status === "soft404").length,
            redirect: scan.links.filter((l) => l.status === "redirect").length,
            timeout: scan.links.filter((l) => l.status === "timeout").length,
            error: scan.links.filter((l) => l.status === "error").length,
            sslError: scan.links.filter((l) => l.status === "ssl-error").length,
            mixedContent: scan.links.filter((l) => l.status === "mixed-content").length,
        },
        links: scan.links.map((l) => ({
            sourceUrl: l.sourceUrl,
            targetUrl: l.targetUrl,
            status: l.status,
            statusCode: l.statusCode,
            linkText: l.linkText,
            linkType: l.linkType,
            element: l.element,
            responseTime: l.responseTime,
            redirectTo: l.redirectTo ?? null,
            context: l.context ?? null,
            softErrorReason: l.softErrorReason ?? null,
            sslStatus: l.sslStatus ?? null,
            checkedAt: l.checkedAt,
        })),
    }
    return JSON.stringify(report, null, 2)
}

export function downloadJSON(scan: ScanResult): void {
    const json = exportToJSON(scan)
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" })
    downloadBlob(blob, `broken-link-report-${sanitizeFilename(scan.siteUrl)}-${scan.completedAt.split("T")[0]}.json`)
}

// ── HTML Report ─────────────────────────────────────────────────────────────

export function exportToHTMLReport(scan: ScanResult): string {
    const brokenLinks = scan.links.filter((l) => l.status === "broken" || l.status === "soft404")
    const redirectLinks = scan.links.filter((l) => l.status === "redirect")
    const workingLinks = scan.links.filter((l) => l.status === "ok")
    const sslLinks = scan.links.filter((l) => l.status === "ssl-error" || l.status === "mixed-content")
    const otherLinks = scan.links.filter((l) => l.status === "timeout" || l.status === "error")

    const avgResponseTime = scan.linksChecked > 0
        ? Math.round(scan.links.reduce((sum, l) => sum + l.responseTime, 0) / scan.linksChecked)
        : 0

    const linkRow = (link: LinkResult) => `
        <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                <a href="${escapeHtml(link.sourceUrl)}" target="_blank" style="color:#4299e1;">${escapeHtml(link.sourceUrl)}</a>
            </td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                <a href="${escapeHtml(link.targetUrl)}" target="_blank" style="color:#4299e1;">${escapeHtml(link.targetUrl)}</a>
            </td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;">${link.statusCode ?? "-"}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;">${getStatusLabel(link.status)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;">${link.responseTime}ms</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;">${escapeHtml(link.linkText || "-")}</td>
        </tr>
    `

    const duration = Math.round(
        (new Date(scan.completedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000,
    )

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Broken Link Report - ${escapeHtml(scan.siteUrl)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1a202c; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        h2 { font-size: 18px; margin-top: 32px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
        .meta { color: #718096; font-size: 13px; margin-bottom: 24px; }
        .stats { display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }
        .stat { padding: 16px; border-radius: 8px; background: #f7fafc; border: 1px solid #e2e8f0; flex: 1; min-width: 100px; text-align: center; }
        .stat-value { font-size: 28px; font-weight: 700; }
        .stat-label { font-size: 11px; color: #718096; margin-top: 4px; }
        .green { color: #38a169; }
        .red { color: #e53e3e; }
        .yellow { color: #d69e2e; }
        .orange { color: #dd6b20; }
        .purple { color: #805ad5; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { text-align: left; padding: 8px 10px; background: #f7fafc; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #718096; border-bottom: 2px solid #e2e8f0; }
        .bar { display: flex; height: 20px; border-radius: 10px; overflow: hidden; gap: 2px; margin-bottom: 8px; }
        .bar-segment { transition: width 0.3s; min-width: 2px; }
        .legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; }
        .legend-item { display: flex; align-items: center; gap: 6px; }
        .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
        @media print { body { margin: 20px; } .no-print { display: none; } }
    </style>
</head>
<body>
    <h1>Broken Link Report</h1>
    <div class="meta">
        <strong>${escapeHtml(scan.siteUrl)}</strong><br>
        Scanned: ${new Date(scan.completedAt).toLocaleString()}<br>
        Duration: ${duration}s | Pages: ${scan.pagesScanned} | Links: ${scan.linksChecked}
    </div>

    <div class="stats">
        <div class="stat">
            <div class="stat-value" style="color:${scan.healthScore >= 90 ? "#38a169" : scan.healthScore >= 70 ? "#d69e2e" : "#e53e3e"}">${scan.healthScore}%</div>
            <div class="stat-label">Health Score</div>
        </div>
        <div class="stat">
            <div class="stat-value green">${workingLinks.length}</div>
            <div class="stat-label">Working</div>
        </div>
        <div class="stat">
            <div class="stat-value red">${brokenLinks.length}</div>
            <div class="stat-label">Broken</div>
        </div>
        <div class="stat">
            <div class="stat-value yellow">${redirectLinks.length}</div>
            <div class="stat-label">Redirects</div>
        </div>
        <div class="stat">
            <div class="stat-value orange">${sslLinks.length}</div>
            <div class="stat-label">SSL Issues</div>
        </div>
        <div class="stat">
            <div class="stat-value purple">${otherLinks.length}</div>
            <div class="stat-label">Other</div>
        </div>
    </div>

    <div class="bar">
        <div class="bar-segment" style="width:${(workingLinks.length / scan.linksChecked) * 100}%;background:#38a169;"></div>
        <div class="bar-segment" style="width:${(redirectLinks.length / scan.linksChecked) * 100}%;background:#d69e2e;"></div>
        <div class="bar-segment" style="width:${(brokenLinks.length / scan.linksChecked) * 100}%;background:#e53e3e;"></div>
        <div class="bar-segment" style="width:${(sslLinks.length / scan.linksChecked) * 100}%;background:#dd6b20;"></div>
        <div class="bar-segment" style="width:${(otherLinks.length / scan.linksChecked) * 100}%;background:#805ad5;"></div>
    </div>
    <div class="legend">
        <div class="legend-item"><div class="legend-dot" style="background:#38a169;"></div>Working (${workingLinks.length})</div>
        <div class="legend-item"><div class="legend-dot" style="background:#d69e2e;"></div>Redirects (${redirectLinks.length})</div>
        <div class="legend-item"><div class="legend-dot" style="background:#e53e3e;"></div>Broken (${brokenLinks.length})</div>
        <div class="legend-item"><div class="legend-dot" style="background:#dd6b20;"></div>SSL Issues (${sslLinks.length})</div>
        <div class="legend-item"><div class="legend-dot" style="background:#805ad5;"></div>Other (${otherLinks.length})</div>
    </div>

    <div style="margin-top:16px;font-size:12px;color:#718096;">Average response time: ${avgResponseTime}ms</div>

    ${brokenLinks.length > 0 ? `
    <h2 class="red">Broken Links (${brokenLinks.length})</h2>
    <table>
        <thead><tr><th>Source</th><th>Target</th><th>Code</th><th>Status</th><th>Time</th><th>Text</th></tr></thead>
        <tbody>${brokenLinks.map(linkRow).join("")}</tbody>
    </table>
    ` : ""}

    ${sslLinks.length > 0 ? `
    <h2 class="orange">SSL Issues (${sslLinks.length})</h2>
    <table>
        <thead><tr><th>Source</th><th>Target</th><th>Code</th><th>Status</th><th>Time</th><th>Text</th></tr></thead>
        <tbody>${sslLinks.map(linkRow).join("")}</tbody>
    </table>
    ` : ""}

    ${redirectLinks.length > 0 ? `
    <h2 class="yellow">Redirects (${redirectLinks.length})</h2>
    <table>
        <thead><tr><th>Source</th><th>Target</th><th>Code</th><th>Status</th><th>Time</th><th>Text</th></tr></thead>
        <tbody>${redirectLinks.map(linkRow).join("")}</tbody>
    </table>
    ` : ""}

    ${otherLinks.length > 0 ? `
    <h2 class="purple">Timeouts &amp; Errors (${otherLinks.length})</h2>
    <table>
        <thead><tr><th>Source</th><th>Target</th><th>Code</th><th>Status</th><th>Time</th><th>Text</th></tr></thead>
        <tbody>${otherLinks.map(linkRow).join("")}</tbody>
    </table>
    ` : ""}

    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#a0aec0;">
        Generated by Broken Link Checker for Framer v2.0
    </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

export function downloadHTMLReport(scan: ScanResult): void {
    const html = exportToHTMLReport(scan)
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" })
    downloadBlob(blob, `broken-link-report-${sanitizeFilename(scan.siteUrl)}-${scan.completedAt.split("T")[0]}.html`)
}

// ── Shared helpers ──────────────────────────────────────────────────────────

function sanitizeFilename(str: string): string {
    return str.replace(/[^a-z0-9]/gi, "-").replace(/-+/g, "-").slice(0, 50)
}

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
}

// ── Wayback Machine bulk lookup helper ──────────────────────────────────────

export function generateWaybackBulkUrls(scan: ScanResult): string[] {
    return scan.links
        .filter((l) => l.status === "broken" || l.status === "soft404")
        .map((l) => `https://web.archive.org/web/*/${l.targetUrl}`)
}
