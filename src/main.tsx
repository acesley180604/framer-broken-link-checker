import React from "react"
import ReactDOM from "react-dom/client"
import { framer } from "framer-plugin"
import { App } from "./App"
import "framer-plugin/framer.css"
import "./styles/globals.css"

void framer.showUI({
    position: "top right",
    width: 420,
    height: 600,
    resizable: true,
})

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
