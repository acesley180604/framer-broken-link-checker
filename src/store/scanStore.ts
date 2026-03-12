import { create } from "zustand"
import { DEFAULT_SCAN_CONFIG, DEFAULT_SCHEDULE_CONFIG } from "@/utils/defaults"

// ── Types ───────────────────────────────────────────────────────────────────

export interface LinkResult {
    id: string
    sourceUrl: string
    targetUrl: string
    statusCode: number | null
    status: "ok" | "broken" | "redirect" | "timeout" | "error"
    redirectTo?: string
    responseTime: number
    linkText: string
    linkType: "internal" | "external"
    element: "a" | "img" | "script" | "link" | "iframe"
    checkedAt: string
    ignored: boolean
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
    currentPage: string
    pagesScanned: number
    totalPages: number
    linksChecked: number
    estimatedTotalLinks: number
    phase: "crawling" | "checking" | "complete" | "idle" | "error"
}

// ── Filter types ────────────────────────────────────────────────────────────

export type StatusFilter = "all" | "ok" | "broken" | "redirect" | "timeout" | "error"
export type TypeFilter = "all" | "internal" | "external"
export type ElementFilter = "all" | "a" | "img" | "script" | "link" | "iframe"

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
    setCurrentScan: (scan: ScanResult | null) => void
    addToHistory: (scan: ScanResult) => void
    clearHistory: () => void
    selectLink: (id: string | null) => void
    toggleIgnoreLink: (id: string) => void
    ignoreAllBroken: () => void

    // Filters
    setStatusFilter: (filter: StatusFilter) => void
    setTypeFilter: (filter: TypeFilter) => void
    setElementFilter: (filter: ElementFilter) => void
    setPageFilter: (filter: string) => void
    setSearchQuery: (query: string) => void
    resetFilters: () => void

    // UI
    clearError: () => void
    showToast: (message: string, type: "error" | "success" | "info") => void
    dismissToast: () => void
}

// ── Store implementation ────────────────────────────────────────────────────

const STORAGE_KEY = "blc_scan_history"
const SCHEDULE_KEY = "blc_schedule"

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
        // Keep only last 20 scans to avoid storage bloat
        const trimmed = history.slice(0, 20)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch {
        // localStorage full or unavailable
    }
}

function loadSchedule(): ScheduleConfig {
    try {
        const raw = localStorage.getItem(SCHEDULE_KEY)
        return raw ? JSON.parse(raw) : DEFAULT_SCHEDULE_CONFIG
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

export const useScanStore = create<ScanState>((set, get) => ({
    // Data
    scanConfig: { ...DEFAULT_SCAN_CONFIG },
    scheduleConfig: loadSchedule(),
    currentScan: null,
    scanHistory: loadHistory(),
    progress: {
        scanning: false,
        currentPage: "",
        pagesScanned: 0,
        totalPages: 0,
        linksChecked: 0,
        estimatedTotalLinks: 0,
        phase: "idle",
    },
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
        if (!currentScan) return { ok: 0, broken: 0, redirect: 0, timeout: 0, error: 0 }
        const counts: Record<string, number> = { ok: 0, broken: 0, redirect: 0, timeout: 0, error: 0 }
        for (const link of currentScan.links) {
            counts[link.status] = (counts[link.status] ?? 0) + 1
        }
        return counts
    },

    // Actions
    setScanConfig: (updates) => {
        set((state) => ({ scanConfig: { ...state.scanConfig, ...updates } }))
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
                l.id === id ? { ...l, ignored: !l.ignored } : l
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
                l.status === "broken" ? { ...l, ignored: true } : l
            )
            return {
                currentScan: { ...state.currentScan, links: updatedLinks },
            }
        })
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
