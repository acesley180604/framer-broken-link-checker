import type { ScanConfig, ScheduleConfig } from "@/store/scanStore"

export const DEFAULT_SCAN_CONFIG: ScanConfig = {
    siteUrl: "",
    maxPages: 100,
    maxDepth: 5,
    timeout: 10000,
    followRedirects: true,
    checkExternalLinks: true,
    checkImages: true,
    checkScripts: false,
    checkStylesheets: false,
    respectRobotsTxt: true,
    userAgent: "BrokenLinkChecker/2.0",
    concurrency: 5,
    proxyUrl: "",
    checkSsl: true,
    detectSoftErrors: true,
    safeBrowsingApiKey: "",
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
    enabled: false,
    frequency: "weekly",
    notifyEmail: "",
    notifyOnBrokenOnly: true,
    lastRun: null,
    nextRun: null,
}

export const RATE_LIMIT_DELAY = 100 // ms between requests
export const MAX_CONCURRENT_REQUESTS = 5
export const MAX_HISTORY_ITEMS = 20
export const SOFT_ERROR_MAX_CHECK_SIZE = 50000 // bytes
