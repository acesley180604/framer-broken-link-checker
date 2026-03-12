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
    userAgent: "BrokenLinkChecker/1.0",
    concurrency: 5,
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
    enabled: false,
    frequency: "weekly",
    notifyEmail: "",
    notifyOnBrokenOnly: true,
    lastRun: null,
    nextRun: null,
}
