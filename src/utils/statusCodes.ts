export const STATUS_CODE_DESCRIPTIONS: Record<number, string> = {
    0: "Opaque Response (CORS blocked)",
    200: "OK",
    201: "Created",
    204: "No Content",
    206: "Partial Content",
    301: "Moved Permanently",
    302: "Found (Temporary Redirect)",
    303: "See Other",
    304: "Not Modified",
    307: "Temporary Redirect",
    308: "Permanent Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    408: "Request Timeout",
    410: "Gone",
    411: "Length Required",
    413: "Payload Too Large",
    414: "URI Too Long",
    415: "Unsupported Media Type",
    429: "Too Many Requests",
    451: "Unavailable For Legal Reasons",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    520: "Cloudflare: Unknown Error",
    521: "Cloudflare: Web Server Is Down",
    522: "Cloudflare: Connection Timed Out",
    523: "Cloudflare: Origin Is Unreachable",
    524: "Cloudflare: A Timeout Occurred",
    525: "Cloudflare: SSL Handshake Failed",
    526: "Cloudflare: Invalid SSL Certificate",
    530: "Cloudflare: Origin DNS Error",
}

export function getStatusDescription(code: number | null): string {
    if (code === null) return "No Response"
    return STATUS_CODE_DESCRIPTIONS[code] ?? `HTTP ${code}`
}

export type LinkStatus = "ok" | "broken" | "redirect" | "timeout" | "error" | "soft404" | "ssl-error" | "mixed-content"

export function getStatusColor(status: string): string {
    switch (status) {
        case "ok":
            return "#38a169"
        case "broken":
            return "#e53e3e"
        case "redirect":
            return "#d69e2e"
        case "timeout":
            return "#dd6b20"
        case "error":
            return "#805ad5"
        case "soft404":
            return "#e53e3e"
        case "ssl-error":
            return "#c05621"
        case "mixed-content":
            return "#dd6b20"
        default:
            return "var(--framer-color-text-tertiary)"
    }
}

export function getStatusLabel(status: string): string {
    switch (status) {
        case "ok":
            return "Working"
        case "broken":
            return "Broken"
        case "redirect":
            return "Redirect"
        case "timeout":
            return "Timeout"
        case "error":
            return "Error"
        case "soft404":
            return "Soft 404"
        case "ssl-error":
            return "SSL Error"
        case "mixed-content":
            return "Mixed Content"
        default:
            return status
    }
}

export function getStatusIcon(status: string): string {
    switch (status) {
        case "ok":
            return "check"
        case "broken":
            return "x"
        case "redirect":
            return "arrow-right"
        case "timeout":
            return "clock"
        case "error":
            return "alert"
        case "soft404":
            return "alert-triangle"
        case "ssl-error":
            return "shield-off"
        case "mixed-content":
            return "shield-alert"
        default:
            return "minus"
    }
}

export function isErrorStatus(code: number): boolean {
    return code >= 400
}

export function isRedirectStatus(code: number): boolean {
    return code >= 300 && code < 400
}

export function isSuccessStatus(code: number): boolean {
    return code >= 200 && code < 300
}
