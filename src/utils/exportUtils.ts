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
        "Checked At",
        "Ignored",
    ]

    const rows = scan.links.map((link) => [
        escapeCSV(link.sourceUrl),
        escapeCSV(link.targetUrl),
        getStatusLabel(link.status),
        link.statusCode?.toString() ?? "",
        link.statusCode ? getStatusDescription(link.statusCode) : "No Response",
        escapeCSV(link.linkText),
        link.linkType,
        link.element,
        link.responseTime.toString(),
        escapeCSV(link.redirectTo ?? ""),
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
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `broken-link-report-${scan.siteUrl.replace(/[^a-z0-9]/gi, "-")}-${scan.completedAt.split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
}

// ── PDF-style HTML Report ───────────────────────────────────────────────────

export function exportToHTMLReport(scan: ScanResult): string {
    const brokenLinks = scan.links.filter((l) => l.status === "broken")
    const redirectLinks = scan.links.filter((l) => l.status === "redirect")
    const workingLinks = scan.links.filter((l) => l.status === "ok")
    const otherLinks = scan.links.filter((l) => l.status === "timeout" || l.status === "error")

    const linkRow = (link: LinkResult) => `
        <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${link.sourceUrl}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${link.targetUrl}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;">${link.statusCode ?? "-"}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;">${link.responseTime}ms</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;">${link.linkText || "-"}</td>
        </tr>
    `

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Broken Link Report - ${scan.siteUrl}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1a202c; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        h2 { font-size: 18px; margin-top: 32px; margin-bottom: 12px; }
        .meta { color: #718096; font-size: 13px; margin-bottom: 24px; }
        .stats { display: flex; gap: 16px; margin-bottom: 32px; }
        .stat { padding: 16px; border-radius: 8px; background: #f7fafc; border: 1px solid #e2e8f0; flex: 1; text-align: center; }
        .stat-value { font-size: 28px; font-weight: 700; }
        .stat-label { font-size: 11px; color: #718096; margin-top: 4px; }
        .green { color: #38a169; }
        .red { color: #e53e3e; }
        .yellow { color: #d69e2e; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { text-align: left; padding: 8px 10px; background: #f7fafc; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #718096; border-bottom: 2px solid #e2e8f0; }
        .score-ring { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; margin: 0 auto; }
        @media print { body { margin: 20px; } }
    </style>
</head>
<body>
    <h1>Broken Link Report</h1>
    <div class="meta">
        <strong>${scan.siteUrl}</strong><br>
        Scanned: ${new Date(scan.completedAt).toLocaleString()}<br>
        Pages: ${scan.pagesScanned} | Links: ${scan.linksChecked}
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
            <div class="stat-value">${otherLinks.length}</div>
            <div class="stat-label">Timeout/Error</div>
        </div>
    </div>

    ${brokenLinks.length > 0 ? `
    <h2 class="red">Broken Links (${brokenLinks.length})</h2>
    <table>
        <thead><tr><th>Source</th><th>Target</th><th>Code</th><th>Time</th><th>Text</th></tr></thead>
        <tbody>${brokenLinks.map(linkRow).join("")}</tbody>
    </table>
    ` : ""}

    ${redirectLinks.length > 0 ? `
    <h2 class="yellow">Redirects (${redirectLinks.length})</h2>
    <table>
        <thead><tr><th>Source</th><th>Target</th><th>Code</th><th>Time</th><th>Text</th></tr></thead>
        <tbody>${redirectLinks.map(linkRow).join("")}</tbody>
    </table>
    ` : ""}

    ${otherLinks.length > 0 ? `
    <h2>Timeouts &amp; Errors (${otherLinks.length})</h2>
    <table>
        <thead><tr><th>Source</th><th>Target</th><th>Code</th><th>Time</th><th>Text</th></tr></thead>
        <tbody>${otherLinks.map(linkRow).join("")}</tbody>
    </table>
    ` : ""}

    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#a0aec0;">
        Generated by Broken Link Checker for Framer
    </div>
</body>
</html>`
}

export function downloadHTMLReport(scan: ScanResult): void {
    const html = exportToHTMLReport(scan)
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `broken-link-report-${scan.siteUrl.replace(/[^a-z0-9]/gi, "-")}-${scan.completedAt.split("T")[0]}.html`
    link.click()
    URL.revokeObjectURL(url)
}
