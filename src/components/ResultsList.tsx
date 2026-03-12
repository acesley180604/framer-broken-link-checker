import { useScanStore } from "@/store/scanStore"
import { getStatusColor, getStatusLabel } from "@/utils/statusCodes"

export default function ResultsList() {
    const {
        currentScan,
        filteredLinks,
        statusFilter,
        typeFilter,
        pageFilter,
        searchQuery,
        setStatusFilter,
        setTypeFilter,
        setPageFilter,
        setSearchQuery,
        resetFilters,
        selectLink,
        uniquePages,
        statusCounts,
    } = useScanStore()

    if (!currentScan) {
        return (
            <div className="empty-state">
                <p>No scan results yet.</p>
                <p style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                    Run a scan from the Scan tab to see results here.
                </p>
            </div>
        )
    }

    const links = filteredLinks()
    const counts = statusCounts()
    const pages = uniquePages()

    return (
        <div className="stack-lg">
            {/* Summary bar */}
            <div className="status-bar">
                {counts.ok > 0 && (
                    <div
                        className="status-bar-segment"
                        style={{
                            width: `${(counts.ok / currentScan.linksChecked) * 100}%`,
                            background: "#38a169",
                        }}
                    />
                )}
                {counts.redirect > 0 && (
                    <div
                        className="status-bar-segment"
                        style={{
                            width: `${(counts.redirect / currentScan.linksChecked) * 100}%`,
                            background: "#d69e2e",
                        }}
                    />
                )}
                {counts.broken > 0 && (
                    <div
                        className="status-bar-segment"
                        style={{
                            width: `${(counts.broken / currentScan.linksChecked) * 100}%`,
                            background: "#e53e3e",
                        }}
                    />
                )}
                {counts.timeout > 0 && (
                    <div
                        className="status-bar-segment"
                        style={{
                            width: `${(counts.timeout / currentScan.linksChecked) * 100}%`,
                            background: "#dd6b20",
                        }}
                    />
                )}
                {counts.error > 0 && (
                    <div
                        className="status-bar-segment"
                        style={{
                            width: `${(counts.error / currentScan.linksChecked) * 100}%`,
                            background: "#805ad5",
                        }}
                    />
                )}
            </div>

            {/* Filters */}
            <div className="stack-sm">
                {/* Status filter */}
                <div className="segment-group" style={{ flexWrap: "wrap" }}>
                    {(["all", "ok", "broken", "redirect", "timeout", "error"] as const).map((s) => (
                        <button
                            key={s}
                            className={`segment-btn ${statusFilter === s ? "active" : ""}`}
                            onClick={() => setStatusFilter(s)}
                        >
                            {s === "all" ? `All (${currentScan.linksChecked})` : `${getStatusLabel(s)} (${counts[s] ?? 0})`}
                        </button>
                    ))}
                </div>

                {/* Type and page filters */}
                <div className="row gap-6">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as "all" | "internal" | "external")}
                        style={{ flex: 1 }}
                    >
                        <option value="all">All types</option>
                        <option value="internal">Internal</option>
                        <option value="external">External</option>
                    </select>
                    <select
                        value={pageFilter}
                        onChange={(e) => setPageFilter(e.target.value)}
                        style={{ flex: 1 }}
                    >
                        <option value="">All pages</option>
                        {pages.map((p) => (
                            <option key={p} value={p}>
                                {new URL(p).pathname || "/"}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Search */}
                <input
                    type="text"
                    placeholder="Search URLs or link text..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                {/* Reset */}
                {(statusFilter !== "all" || typeFilter !== "all" || pageFilter || searchQuery) && (
                    <button className="btn-link" onClick={resetFilters}>
                        Reset filters
                    </button>
                )}
            </div>

            {/* Results count */}
            <div className="row-between">
                <p style={{ fontSize: 10 }}>
                    Showing {links.length} of {currentScan.linksChecked} links
                </p>
            </div>

            {/* Results list */}
            {links.length === 0 ? (
                <div className="empty-state">
                    <p>No links match your filters.</p>
                </div>
            ) : (
                <div className="stack-sm" style={{ maxHeight: 300, overflowY: "auto" }}>
                    {links.slice(0, 100).map((link) => (
                        <div
                            key={link.id}
                            className={`link-row ${link.ignored ? "ignored" : ""}`}
                            onClick={() => selectLink(link.id)}
                        >
                            <div className="row-between">
                                <div className="link-row-url">{link.targetUrl}</div>
                                <span
                                    className={`badge badge-${link.status}`}
                                    style={{ flexShrink: 0 }}
                                >
                                    {link.statusCode ?? link.status}
                                </span>
                            </div>
                            <div className="link-row-meta">
                                <span style={{ fontSize: 10, color: getStatusColor(link.status), fontWeight: 600 }}>
                                    {getStatusLabel(link.status)}
                                </span>
                                <span style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                                    {link.linkType}
                                </span>
                                <span style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                                    {link.element}
                                </span>
                                <span style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                                    {link.responseTime}ms
                                </span>
                            </div>
                            <div className="link-row-source">
                                from: {link.sourceUrl}
                            </div>
                        </div>
                    ))}
                    {links.length > 100 && (
                        <p style={{ textAlign: "center", fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                            Showing first 100 results. Use filters to narrow down.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
