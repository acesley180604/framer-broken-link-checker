import { useCallback } from "react"
import { useScanStore } from "@/store/scanStore"

export function ScheduleConfig() {
    const { scheduleConfig, setScheduleConfig, showToast } = useScanStore()

    const handleSave = useCallback(() => {
        const now = new Date()
        let nextRun: Date

        switch (scheduleConfig.frequency) {
            case "daily":
                nextRun = new Date(now.getTime() + 86400000)
                break
            case "weekly":
                nextRun = new Date(now.getTime() + 7 * 86400000)
                break
            case "monthly":
                nextRun = new Date(now.getTime() + 30 * 86400000)
                break
        }

        setScheduleConfig({
            nextRun: scheduleConfig.enabled ? nextRun.toISOString() : null,
        })
        showToast("Schedule saved", "success")
    }, [scheduleConfig.frequency, scheduleConfig.enabled, setScheduleConfig, showToast])

    return (
        <div className="stack-lg">
            <div className="row-between">
                <div>
                    <h2>Scheduled Scans</h2>
                    <p>Automatically scan your site on a schedule.</p>
                </div>
                <div
                    className={`toggle ${scheduleConfig.enabled ? "on" : ""}`}
                    onClick={() => setScheduleConfig({ enabled: !scheduleConfig.enabled })}
                >
                    <div className="toggle-knob" />
                </div>
            </div>

            {scheduleConfig.enabled && (
                <div className="stack">
                    {/* Frequency */}
                    <div className="stack-sm">
                        <label>Scan Frequency</label>
                        <div className="segment-group">
                            {(["daily", "weekly", "monthly"] as const).map((freq) => (
                                <button
                                    key={freq}
                                    className={`segment-btn ${scheduleConfig.frequency === freq ? "active" : ""}`}
                                    onClick={() => setScheduleConfig({ frequency: freq })}
                                >
                                    {freq}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Email notifications */}
                    <div className="stack-sm">
                        <label>Notification Email</label>
                        <input
                            type="email"
                            placeholder="your@email.com"
                            value={scheduleConfig.notifyEmail}
                            onChange={(e) => setScheduleConfig({ notifyEmail: e.target.value })}
                        />
                    </div>

                    <div className="row-between">
                        <span style={{ fontSize: 11 }}>Only notify on new broken links</span>
                        <div
                            className={`toggle ${scheduleConfig.notifyOnBrokenOnly ? "on" : ""}`}
                            onClick={() =>
                                setScheduleConfig({ notifyOnBrokenOnly: !scheduleConfig.notifyOnBrokenOnly })
                            }
                        >
                            <div className="toggle-knob" />
                        </div>
                    </div>

                    {/* Status info */}
                    {scheduleConfig.lastRun && (
                        <div className="info-box info-box-default">
                            <p style={{ fontSize: 10, margin: 0 }}>
                                Last run: {new Date(scheduleConfig.lastRun).toLocaleString()}
                            </p>
                        </div>
                    )}

                    {scheduleConfig.nextRun && (
                        <div className="info-box info-box-tint">
                            <p style={{ fontSize: 10, margin: 0 }}>
                                Next scan: {new Date(scheduleConfig.nextRun).toLocaleString()}
                            </p>
                        </div>
                    )}

                    <button className="framer-button-primary w-full" onClick={handleSave}>
                        Save Schedule
                    </button>
                </div>
            )}

            {!scheduleConfig.enabled && (
                <div className="info-box info-box-default">
                    <p style={{ fontSize: 10, margin: 0 }}>
                        Enable scheduled scans to automatically monitor your site for broken links. You'll
                        receive email notifications when new broken links are found. Requires the embed
                        script to be installed on your site.
                    </p>
                </div>
            )}
        </div>
    )
}

export default ScheduleConfig
