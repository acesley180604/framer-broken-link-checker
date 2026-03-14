import { useState, useCallback } from "react"
import { useScanStore, type LinkResult } from "@/store/scanStore"

interface LinkEditorProps {
    link: LinkResult
}

export function LinkEditor({ link }: LinkEditorProps) {
    const { setReplacementUrl, showToast } = useScanStore()
    const [newUrl, setNewUrl] = useState(link.replacementUrl ?? "")
    const [showRedirectRule, setShowRedirectRule] = useState(false)

    const handleSave = useCallback(() => {
        if (!newUrl.trim()) return
        setReplacementUrl(link.id, newUrl.trim())
        showToast("Replacement URL saved", "success")
    }, [newUrl, link.id, setReplacementUrl, showToast])

    const handleCopyRedirectRule = useCallback(() => {
        let pathname: string
        try {
            pathname = new URL(link.targetUrl).pathname
        } catch {
            pathname = link.targetUrl
        }
        // Generate redirect rule formats
        const rules = [
            `# Nginx redirect rule`,
            `rewrite ^${pathname}$ ${newUrl || "[NEW_URL]"} permanent;`,
            ``,
            `# Apache .htaccess redirect rule`,
            `Redirect 301 ${pathname} ${newUrl || "[NEW_URL]"}`,
            ``,
            `# Framer custom code (meta refresh)`,
            `<meta http-equiv="refresh" content="0;url=${newUrl || "[NEW_URL]"}" />`,
        ].join("\n")

        void navigator.clipboard.writeText(rules).then(
            () => showToast("Redirect rules copied", "success"),
            () => showToast("Failed to copy to clipboard", "error"),
        )
    }, [link.targetUrl, newUrl, showToast])

    return (
        <div className="stack-sm" style={{ padding: "10px 12px", background: "var(--framer-color-bg-secondary)", borderRadius: 8 }}>
            <h3>Edit Link</h3>

            {/* Context showing where the link appears */}
            {link.context && (
                <div className="code-block" style={{ fontSize: 10, maxHeight: 60, overflow: "hidden" }}>
                    {link.context}
                </div>
            )}

            {/* Current broken URL */}
            <div className="stack-sm">
                <label>Broken URL</label>
                <div className="info-box info-box-error" style={{ wordBreak: "break-all", fontSize: 10 }}>
                    {link.targetUrl}
                </div>
            </div>

            {/* Replacement URL input */}
            <div className="stack-sm">
                <label>Replacement URL</label>
                <input
                    type="url"
                    placeholder="https://correct-url.example.com/page"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                />
            </div>

            <div className="row gap-6">
                <button className="framer-button-primary" onClick={handleSave} disabled={!newUrl.trim()}>
                    Save Replacement
                </button>
                <button className="btn-secondary" onClick={() => setShowRedirectRule(!showRedirectRule)}>
                    {showRedirectRule ? "Hide" : "Create"} Redirect
                </button>
            </div>

            {/* Redirect rule generator */}
            {showRedirectRule && (
                <div className="stack-sm">
                    <label>Redirect Rules</label>
                    <div className="code-block" style={{ fontSize: 10 }}>
                        {`# Nginx\nrewrite ^${(() => { try { return new URL(link.targetUrl).pathname } catch { return link.targetUrl } })()}$ ${newUrl || "[NEW_URL]"} permanent;\n\n# Apache\nRedirect 301 ${(() => { try { return new URL(link.targetUrl).pathname } catch { return link.targetUrl } })()} ${newUrl || "[NEW_URL]"}`}
                    </div>
                    <button className="btn-secondary w-full" onClick={handleCopyRedirectRule}>
                        Copy Redirect Rules
                    </button>
                </div>
            )}
        </div>
    )
}
