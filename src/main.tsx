import React from "react"
import ReactDOM from "react-dom/client"
import { framer } from "framer-plugin"
import App from "./App"
import "framer-plugin/framer.css"
import "./styles/globals.css"

framer.showUI({
    position: "top right",
    width: 400,
    height: 520,
    resizable: true,
})

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
