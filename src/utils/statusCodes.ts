export const STATUS_CODE_DESCRIPTIONS: Record<number, string> = {
    200: "OK",
    201: "Created",
    204: "No Content",
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
    408: "Request Timeout",
    410: "Gone",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
}

export function getStatusDescription(code: number | null): string {
    if (code === null) return "No Response"
    return STATUS_CODE_DESCRIPTIONS[code] ?? `HTTP ${code}`
}

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
        default:
            return status
    }
}
