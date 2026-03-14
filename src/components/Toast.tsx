import { useEffect } from "react"
import { motion } from "motion/react"

interface ToastProps {
    message: string
    type: "error" | "success" | "info"
    onDismiss: () => void
    duration?: number
}

export function Toast({ message, type, onDismiss, duration = 5000 }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, duration)
        return () => clearTimeout(timer)
    }, [onDismiss, duration])

    return (
        <div className="toast-container">
            <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`toast toast-${type}`}
            >
                <p style={{ flex: 1, color: "inherit" }}>{message}</p>
                <button onClick={onDismiss} aria-label="Dismiss">
                    x
                </button>
            </motion.div>
        </div>
    )
}

export default Toast
