import { useState, useCallback } from "react"
import { LicenseGate } from "@shared/index"
import { AnimatePresence, motion } from "motion/react"
import { useScanStore } from "./store/scanStore"
import { ScanConfig } from "./components/ScanConfig"
import { ScanProgress } from "./components/ScanProgress"
import ResultsList from "./components/ResultsList"
import LinkDetail from "./components/LinkDetail"
import Dashboard from "./components/Dashboard"
import ScanHistory from "./components/ScanHistory"
import ScheduleConfig from "./components/ScheduleConfig"
import ExportPanel from "./components/ExportPanel"
import Toast from "./components/Toast"

type Tab = "scan" | "results" | "dashboard" | "history" | "schedule" | "export"

const TABS: { id: Tab; label: string }[] = [
    { id: "scan", label: "Scan" },
    { id: "results", label: "Results" },
    { id: "dashboard", label: "Dashboard" },
    { id: "history", label: "History" },
    { id: "schedule", label: "Schedule" },
    { id: "export", label: "Export" },
]

export function App() {
    const [activeTab, setActiveTab] = useState<Tab>("scan")
    const { currentScan, progress, toast, dismissToast, selectedLinkId } = useScanStore()

    const brokenCount = currentScan?.broken ?? 0

    const handleTabChange = useCallback((tab: Tab) => {
        setActiveTab(tab)
    }, [])

    return (
        <LicenseGate pluginSlug="broken-link-checker">
        <section>
            <header
                className="row-between"
                style={{ padding: "12px 15px", borderBottom: "1px solid var(--framer-color-divider)" }}
            >
                <div className="row gap-8">
                    <h1>Broken Link Checker</h1>
                    {progress.scanning && (
                        <span className="saving-indicator">
                            {progress.paused ? "Paused" : "Scanning..."}
                        </span>
                    )}
                </div>
                {currentScan && (
                    <div className="row gap-6">
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color:
                                    currentScan.healthScore >= 90
                                        ? "#38a169"
                                        : currentScan.healthScore >= 70
                                          ? "#d69e2e"
                                          : "#e53e3e",
                            }}
                        >
                            {currentScan.healthScore}%
                        </span>
                        {brokenCount > 0 && (
                            <span className="badge badge-broken">{brokenCount} broken</span>
                        )}
                    </div>
                )}
            </header>

            <nav className="tab-bar">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={activeTab === tab.id ? "active" : ""}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            <main>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                    >
                        {activeTab === "scan" && (
                            <div className="stack-lg">
                                <ScanConfig />
                                <ScanProgress />
                            </div>
                        )}
                        {activeTab === "results" && <ResultsList />}
                        {activeTab === "dashboard" && <Dashboard />}
                        {activeTab === "history" && <ScanHistory />}
                        {activeTab === "schedule" && <ScheduleConfig />}
                        {activeTab === "export" && <ExportPanel />}
                    </motion.div>
                </AnimatePresence>
            </main>

            {selectedLinkId && <LinkDetail />}
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
            <footer>Free plan: 3 scans/mo. Pro $9/mo | Team $19/mo | Agency $39/mo</footer>
        </section>
        </LicenseGate>
    )
}
