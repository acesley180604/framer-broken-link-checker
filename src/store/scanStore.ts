import { create } from "zustand"
import { DEFAULT_SCAN_CONFIG, DEFAULT_SCHEDULE_CONFIG, MAX_HISTORY_ITEMS } from "@/utils/defaults"
import type { LinkStatus } from "@/utils/statusCodes"
import type { LinkElementType } from "@/utils/htmlParser"

// ── Types ───────────────────────────────────────────────────────────────────

export interface LinkResult {
    id: string
    sourceUrl: string
    targetUrl: string
    statusCode: number | null
    status: LinkStatus
    redirectTo?: string
    responseTime: number
    linkText: string
    linkType: "internal" | "external"
    element: LinkElementType
    context: string
    checkedAt: string
    ignored: boolean
    softErrorReason?: string
    sslStatus?: string
    replacementUrl?: string
}

export interface ScanResult {
    id: string
    siteUrl: string
    startedAt: string
    completedAt: string
    pagesScanned: number
    linksChecked: number
    broken: number
    redirects: number
    healthScore: number
    links: LinkResult[]
}

export interface ScanConfig {
    siteUrl: string
    maxPages: number
    maxDepth: number
    timeout: number
    followRedirects: boolean
    checkExternalLinks: boolean
    checkImages: boolean
    checkScripts: boolean
    checkStylesheets: boolean
    respectRobotsTxt: boolean
    userAgent: string
    concurrency: number
    proxyUrl: string
    checkSsl: boolean
    detectSoftErrors: boolean
    safeBrowsingApiKey: string
}

export interface ScheduleConfig {
    enabled: boolean
    frequency: "daily" | "weekly" | "monthly"
    notifyEmail: string
    notifyOnBrokenOnly: boolean
    lastRun: string | null
    nextRun: string | null
}

export interface ScanProgress {
    scanning: boolean
    paused: boolean
    currentPage: string
    pagesScanned: number
    totalPages: number
    linksChecked: number
    estimatedTotalLinks: number
    phase: "crawling" | "checking" | "complete" | "idle" | "error" | "paused"
    liveResults: LinkResult[]
    okCount: number
    brokenCount: number
    redirectCount: number
    errorCount: number
}

// ── Filter types ────────────────────────────────────────────────────────────

export type StatusFilter = "all" | "ok" | "broken" | "redirect" | "timeout" | "error" | "soft404" | "ssl-error" | "mixed-content"
export type TypeFilter = "all" | "internal" | "external"
export type ElementFilter = "all" | LinkElementType

// ── Store types ─────────────────────────────────────────────────────────────

interface ScanState {
    // Data
    scanConfig: ScanConfig
    scheduleConfig: ScheduleConfig
    currentScan: ScanResult | null
    scanHistory: ScanResult[]
    progress: ScanProgress
    selectedLinkId: string | null

    // Filters
    statusFilter: StatusFilter
    typeFilter: TypeFilter
    elementFilter: ElementFilter
    pageFilter: string
    searchQuery: string

    // UI state
    error: string | null
    toast: { message: string; type: "error" | "success" | "info" } | null

    // Computed
    filteredLinks: () => LinkResult[]
    selectedLink: () => LinkResult | null
    uniquePages: () => string[]
    statusCounts: () => Record<string, number>

    // Actions
    setScanConfig: (updates: Partial<ScanConfig>) => void
    setScheduleConfig: (updates: Partial<ScheduleConfig>) => void
    setProgress: (updates: Partial<ScanProgress>) => void
    addLiveResult: (link: LinkResult) => void
    clearLiveResults: () => void
    setCurrentScan: (scan: ScanResult | null) => void
    addToHistory: (scan: ScanResult) => void
    clearHistory: () => void
    selectLink: (id: string | null) => void
    toggleIgnoreLink: (id: string) => void
    ignoreAllBroken: () => void
    setReplacementUrl: (linkId: string, url: string) => void

    // Filters
    setStatusFilter: (filter: StatusFilter) => void
    setTypeFilter: (filter: TypeFilter) => void
    setElementFilter: (filter: ElementFilter) => void
    setPageFilter: (filter: string) => void
    setSearchQuery: (query: string) => void
    resetFilters: () => void

    // Recheck
    recheckLink: (url: string) => Promise<void>

    // UI
    clearError: () => void
    showToast: (message: string, type: "error" | "success" | "info") => void
    dismissToast: () => void
}

// ── Store implementation ────────────────────────────────────────────────────

const STORAGE_KEY = "blc_scan_history"
const SCHEDULE_KEY = "blc_schedule"
const CONFIG_KEY = "blc_config"

function loadHistory(): ScanResult[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function saveHistory(history: ScanResult[]): void {
    try {
        const trimmed = history.slice(0, MAX_HISTORY_ITEMS)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch {
        // localStorage full or unavailable
    }
}

function loadSchedule(): ScheduleConfig {
    try {
        const raw = localStorage.getItem(SCHEDULE_KEY)
        return raw ? { ...DEFAULT_SCHEDULE_CONFIG, ...JSON.parse(raw) } : DEFAULT_SCHEDULE_CONFIG
    } catch {
        return DEFAULT_SCHEDULE_CONFIG
    }
}

function saveSchedule(config: ScheduleConfig): void {
    try {
        localStorage.setItem(SCHEDULE_KEY, JSON.stringify(config))
    } catch {
        // localStorage unavailable
    }
}

function loadConfig(): Partial<ScanConfig> {
    try {
        const raw = localStorage.getItem(CONFIG_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

function saveConfig(config: ScanConfig): void {
    try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
    } catch {
        // localStorage unavailable
    }
}

const defaultProgress: ScanProgress = {
    scanning: false,
    paused: false,
    currentPage: "",
    pagesScanned: 0,
    totalPages: 0,
    linksChecked: 0,
    estimatedTotalLinks: 0,
    phase: "idle",
    liveResults: [],
    okCount: 0,
    brokenCount: 0,
    redirectCount: 0,
    errorCount: 0,
}

export const useScanStore = create<ScanState>((set, get) => ({
    // Data
    scanConfig: { ...DEFAULT_SCAN_CONFIG, ...loadConfig() },
    scheduleConfig: loadSchedule(),
    currentScan: null,
    scanHistory: loadHistory(),
    progress: { ...defaultProgress },
    selectedLinkId: null,

    // Filters
    statusFilter: "all",
    typeFilter: "all",
    elementFilter: "all",
    pageFilter: "",
    searchQuery: "",

    // UI state
    error: null,
    toast: null,

    // Computed
    filteredLinks: () => {
        const { currentScan, statusFilter, typeFilter, elementFilter, pageFilter, searchQuery } = get()
        if (!currentScan) return []

        return currentScan.links.filter((link) => {
            if (statusFilter !== "all" && link.status !== statusFilter) return false
            if (typeFilter !== "all" && link.linkType !== typeFilter) return false
            if (elementFilter !== "all" && link.element !== elementFilter) return false
            if (pageFilter && link.sourceUrl !== pageFilter) return false
            if (searchQuery) {
                const q = searchQuery.toLowerCase()
                const matchesUrl = link.targetUrl.toLowerCase().includes(q)
                const matchesText = link.linkText.toLowerCase().includes(q)
                const matchesSource = link.sourceUrl.toLowerCase().includes(q)
                if (!matchesUrl && !matchesText && !matchesSource) return false
            }
            return true
        })
    },

    selectedLink: () => {
        const { currentScan, selectedLinkId } = get()
        if (!currentScan || !selectedLinkId) return null
        return currentScan.links.find((l) => l.id === selectedLinkId) ?? null
    },

    uniquePages: () => {
        const { currentScan } = get()
        if (!currentScan) return []
        const pages = new Set(currentScan.links.map((l) => l.sourceUrl))
        return Array.from(pages).sort()
    },

    statusCounts: () => {
        const { currentScan } = get()
        if (!currentScan) return { ok: 0, broken: 0, redirect: 0, timeout: 0, error: 0, soft404: 0, "ssl-error": 0, "mixed-content": 0 }
        const counts: Record<string, number> = { ok: 0, broken: 0, redirect: 0, timeout: 0, error: 0, soft404: 0, "ssl-error": 0, "mixed-content": 0 }
        for (const link of currentScan.links) {
            counts[link.status] = (counts[link.status] ?? 0) + 1
        }
        return counts
    },

    // Actions
    setScanConfig: (updates) => {
        set((state) => {
            const newConfig = { ...state.scanConfig, ...updates }
            saveConfig(newConfig)
            return { scanConfig: newConfig }
        })
    },

    setScheduleConfig: (updates) => {
        set((state) => {
            const newConfig = { ...state.scheduleConfig, ...updates }
            saveSchedule(newConfig)
            return { scheduleConfig: newConfig }
        })
    },

    setProgress: (updates) => {
        set((state) => ({ progress: { ...state.progress, ...updates } }))
    },

    addLiveResult: (link) => {
        set((state) => {
            const liveResults = [...state.progress.liveResults, link]
            const okCount = state.progress.okCount + (link.status === "ok" ? 1 : 0)
            const brokenCount = state.progress.brokenCount + (link.status === "broken" || link.status === "soft404" ? 1 : 0)
            const redirectCount = state.progress.redirectCount + (link.status === "redirect" ? 1 : 0)
            const errorCount = state.progress.errorCount + (link.status === "error" || link.status === "timeout" || link.status === "ssl-error" || link.status === "mixed-content" ? 1 : 0)
            return {
                progress: {
                    ...state.progress,
                    liveResults,
                    okCount,
                    brokenCount,
                    redirectCount,
                    errorCount,
                },
            }
        })
    },

    clearLiveResults: () => {
        set((state) => ({
            progress: {
                ...state.progress,
                liveResults: [],
                okCount: 0,
                brokenCount: 0,
                redirectCount: 0,
                errorCount: 0,
            },
        }))
    },

    setCurrentScan: (scan) => {
        set({ currentScan: scan, selectedLinkId: null })
    },

    addToHistory: (scan) => {
        set((state) => {
            const newHistory = [scan, ...state.scanHistory]
            saveHistory(newHistory)
            return { scanHistory: newHistory }
        })
    },

    clearHistory: () => {
        set({ scanHistory: [] })
        saveHistory([])
    },

    selectLink: (id) => {
        set({ selectedLinkId: id })
    },

    toggleIgnoreLink: (id) => {
        set((state) => {
            if (!state.currentScan) return state
            const updatedLinks = state.currentScan.links.map((l) =>
                l.id === id ? { ...l, ignored: !l.ignored } : l,
            )
            return {
                currentScan: { ...state.currentScan, links: updatedLinks },
            }
        })
    },

    ignoreAllBroken: () => {
        set((state) => {
            if (!state.currentScan) return state
            const updatedLinks = state.currentScan.links.map((l) =>
                l.status === "broken" || l.status === "soft404" ? { ...l, ignored: true } : l,
            )
            return {
                currentScan: { ...state.currentScan, links: updatedLinks },
            }
        })
    },

    setReplacementUrl: (linkId, url) => {
        set((state) => {
            if (!state.currentScan) return state
            const updatedLinks = state.currentScan.links.map((l) =>
                l.id === linkId ? { ...l, replacementUrl: url } : l,
            )
            return {
                currentScan: { ...state.currentScan, links: updatedLinks },
            }
        })
    },

    // Recheck a single link
    recheckLink: async (url: string) => {
        const { currentScan, showToast } = get()
        if (!currentScan) return

        const linkIndex = currentScan.links.findIndex((l) => l.targetUrl === url)
        if (linkIndex === -1) return

        try {
            const startTime = performance.now()
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000)

            let statusCode: number | null = null
            let status: LinkStatus = "error"
            let redirectTo: string | undefined
            let responseTime = 0

            try {
                const response = await fetch(url, {
                    method: "HEAD",
                    signal: controller.signal,
                    redirect: "follow",
                })
                clearTimeout(timeoutId)
                responseTime = Math.round(performance.now() - startTime)
                statusCode = response.status

                if (response.ok) {
                    status = "ok"
                } else if (statusCode >= 300 && statusCode < 400) {
                    status = "redirect"
                    redirectTo = response.headers.get("location") || undefined
                } else if (statusCode === 404) {
                    status = "broken"
                } else if (statusCode >= 500) {
                    status = "error"
                } else {
                    status = "broken"
                }
            } catch (fetchError: unknown) {
                clearTimeout(timeoutId)
                responseTime = Math.round(performance.now() - startTime)
                if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
                    status = "timeout"
                } else {
                    status = "error"
                }
            }

            set((state) => {
                if (!state.currentScan) return state
                const updatedLinks = state.currentScan.links.map((l) =>
                    l.targetUrl === url
                        ? {
                              ...l,
                              statusCode,
                              status,
                              redirectTo,
                              responseTime,
                              checkedAt: new Date().toISOString(),
                          }
                        : l,
                )
                return {
                    currentScan: { ...state.currentScan, links: updatedLinks },
                }
            })

            showToast(`Rechecked ${url}: ${status}`, status === "ok" ? "success" : "info")
        } catch {
            showToast(`Failed to recheck ${url}`, "error")
        }
    },

    // Filters
    setStatusFilter: (filter) => set({ statusFilter: filter }),
    setTypeFilter: (filter) => set({ typeFilter: filter }),
    setElementFilter: (filter) => set({ elementFilter: filter }),
    setPageFilter: (filter) => set({ pageFilter: filter }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    resetFilters: () =>
        set({
            statusFilter: "all",
            typeFilter: "all",
            elementFilter: "all",
            pageFilter: "",
            searchQuery: "",
        }),

    // UI
    clearError: () => set({ error: null }),
    showToast: (message, type) => set({ toast: { message, type } }),
    dismissToast: () => set({ toast: null }),
}))
