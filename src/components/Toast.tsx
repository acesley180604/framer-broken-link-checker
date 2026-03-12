import { useEffect } from "react"

interface ToastProps {
    message: string
    type: "error" | "success" | "info"
    onDismiss: () => void
    duration?: number
}

export default function Toast({ message, type, onDismiss, duration = 5000 }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, duration)
        return () => clearTimeout(timer)
    }, [onDismiss, duration])

    return (
        <div className="toast-container">
            <div className={`toast toast-${type}`}>
                <p style={{ flex: 1, color: "inherit" }}>{message}</p>
                <button onClick={onDismiss} aria-label="Dismiss">x</button>
            </div>
        </div>
    )
}
