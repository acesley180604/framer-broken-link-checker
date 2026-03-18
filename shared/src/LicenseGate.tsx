import React, { useState } from "react";
import { useLicense } from "./use-license";

interface LicenseGateProps {
  pluginSlug: string;
  children: React.ReactNode;
}

export function LicenseGate({ pluginSlug, children }: LicenseGateProps) {
  const { isLicensed, isLoading, error, activate, productInfo, checkoutUrl } = useLicense(pluginSlug);
  const [keyInput, setKeyInput] = useState("");
  const [activating, setActivating] = useState(false);

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.spinner} />
        <p style={styles.hint}>Verifying license...</p>
      </div>
    );
  }

  if (isLicensed) {
    return <>{children}</>;
  }

  const handleActivate = async () => {
    if (!keyInput.trim()) return;
    setActivating(true);
    await activate(keyInput.trim());
    setActivating(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 style={styles.title}>{productInfo?.name || "Plugin"}</h2>
        <p style={styles.subtitle}>Enter your license key to unlock this plugin</p>

        <input
          type="text"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleActivate()}
          placeholder="XXXX_XXXX-XXXX-XXXX-XXXX"
          style={styles.input}
          disabled={activating}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button onClick={handleActivate} disabled={activating || !keyInput.trim()} style={styles.activateBtn}>
          {activating ? "Activating..." : "Activate License"}
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or</span>
        </div>

        <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" style={styles.buyBtn}>
          Buy License — {productInfo?.price}
          {productInfo?.type === "yearly" ? "" : " one-time"}
        </a>

        <p style={styles.footer}>
          License activates on up to 3 devices
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    padding: "20px",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    background: "#1a1a1a",
    color: "#fff",
  },
  spinner: {
    width: 24,
    height: 24,
    border: "2px solid #333",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    color: "#888",
  },
  card: {
    width: "100%",
    maxWidth: 300,
    textAlign: "center" as const,
  },
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    margin: "0 0 4px 0",
    color: "#fff",
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
    margin: "0 0 20px 0",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 13,
    fontFamily: "monospace",
    background: "#2a2a2a",
    border: "1px solid #444",
    borderRadius: 8,
    color: "#fff",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  error: {
    fontSize: 12,
    color: "#ff6b6b",
    margin: "8px 0 0 0",
  },
  activateBtn: {
    width: "100%",
    padding: "10px 0",
    marginTop: 12,
    fontSize: 13,
    fontWeight: 600,
    background: "#fff",
    color: "#000",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    margin: "16px 0",
    gap: 8,
  },
  dividerText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    textAlign: "center" as const,
  },
  buyBtn: {
    display: "block",
    width: "100%",
    padding: "10px 0",
    fontSize: 13,
    fontWeight: 600,
    background: "linear-gradient(135deg, #0066ff, #5500ff)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    textDecoration: "none",
    textAlign: "center" as const,
    boxSizing: "border-box" as const,
  },
  footer: {
    fontSize: 11,
    color: "#666",
    marginTop: 16,
  },
};
