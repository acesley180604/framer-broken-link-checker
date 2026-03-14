import { useState, useCallback } from "react"
import { useScanStore } from "@/store/scanStore"
import { downloadCSV, downloadHTMLReport, downloadJSON, generateWaybackBulkUrls } from "@/utils/exportUtils"
import { SafetyCheck } from "./SafetyCheck"

export function ExportPanel() {
    const { currentScan, showToast, ignoreAllBroken } = useScanStore()
    const [copied, setCopied] = useState(false)
    const [embedCopied, setEmbedCopied] = useState(false)

    const brokenCount = currentScan?.links.filter((l) => l.status === "broken" || l.status === "soft404").length ?? 0
    const ignoredCount = currentScan?.links.filter((l) => l.ignored).length ?? 0

    const handleCopyBrokenUrls = useCallback(() => {
        if (!currentScan) return
        const brokenUrls = currentScan.links
            .filter((l) => (l.status === "broken" || l.status === "soft404") && !l.ignored)
            .map((l) => l.targetUrl)
            .join("\n")

        void navigator.clipboard.writeText(brokenUrls).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }, [currentScan])

    const handleCopyWaybackUrls = useCallback(() => {
        if (!currentScan) return
        const urls = generateWaybackBulkUrls(currentScan).join("\n")
        void navigator.clipboard.writeText(urls).then(() => {
            showToast("Wayback Machine URLs copied", "success")
        })
    }, [currentScan, showToast])

    // Embed script content
    const embedScript = `<script data-blc-config='{"webhookUrl":"","checkImages":true,"checkExternal":true,"timeout":10000,"verbose":false,"checkInterval":86400000}'>
(function(){
  var P="[BLC]",T=10000,I=86400000;
  var c=document.querySelector("[data-blc-config]");
  var cfg=c?JSON.parse(c.getAttribute("data-blc-config")||"{}"):{}
  T=cfg.timeout||T;I=cfg.checkInterval||I;
  var K="blc_last_check",L=localStorage.getItem(K);
  if(L&&Date.now()-parseInt(L)<I){console.log(P+" Skip: checked recently");return}
  function norm(h){
    if(!h||h.startsWith("javascript:")||h.startsWith("mailto:")||h.startsWith("tel:")||h.startsWith("#")||h.startsWith("data:"))return null;
    try{return new URL(h,location.origin).href}catch(e){return null}
  }
  function collect(){
    var links=[],seen={};
    document.querySelectorAll("a[href]").forEach(function(a){
      var u=norm(a.href);if(u&&!seen[u]){seen[u]=1;links.push({url:u,el:"a",text:a.textContent.trim().slice(0,50)})}
    });
    if(cfg.checkImages!==false){
      document.querySelectorAll("img[src]").forEach(function(img){
        var u=norm(img.src);if(u&&!seen[u]){seen[u]=1;links.push({url:u,el:"img",text:img.alt||""})}
      });
    }
    return links;
  }
  async function check(url,el,text){
    var s=performance.now(),int=new URL(url).origin===location.origin;
    try{
      var ac=new AbortController(),t=setTimeout(function(){ac.abort()},T);
      var r=await fetch(url,{method:"HEAD",mode:int?"same-origin":"no-cors",signal:ac.signal,redirect:"follow"});
      clearTimeout(t);var ms=Math.round(performance.now()-s);
      var st=r.type==="opaque"?0:r.status,ok=r.type==="opaque"?true:r.ok;
      return{url:url,status:st,ok:ok,type:int?"internal":"external",el:el,ms:ms,text:text};
    }catch(e){
      var ms2=Math.round(performance.now()-s);
      return{url:url,status:null,ok:false,type:int?"internal":"external",el:el,ms:ms2,text:e.name==="AbortError"?"Timeout":"Error"};
    }
  }
  async function run(){
    var links=collect();
    if(!links.length){console.log(P+" No links found");return}
    if(!cfg.checkExternal)links=links.filter(function(l){return new URL(l.url).origin===location.origin});
    console.log(P+" Checking "+links.length+" links...");
    var results=[],batch=5;
    for(var i=0;i<links.length;i+=batch){
      var b=links.slice(i,i+batch);
      var br=await Promise.all(b.map(function(l){return check(l.url,l.el,l.text)}));
      results.push.apply(results,br);
    }
    var broken=results.filter(function(r){return!r.ok});
    console.log(P+" Done: "+results.length+" checked, "+broken.length+" broken");
    if(broken.length)broken.forEach(function(r){console.warn(P+" "+r.url+" ("+r.status+")")});
    window.__blcResults=results;window.__blcBroken=broken;
    localStorage.setItem(K,Date.now().toString());
    localStorage.setItem("blc_results",JSON.stringify({page:location.href,ts:new Date().toISOString(),total:results.length,broken:broken.length,items:broken}));
    if(cfg.webhookUrl&&broken.length){
      fetch(cfg.webhookUrl,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({page:location.href,timestamp:new Date().toISOString(),total:results.length,broken:broken.length,
          brokenLinks:broken.map(function(r){return{url:r.url,status:r.status,type:r.type,el:r.el}})})
      }).catch(function(){console.warn(P+" Webhook failed")});
    }
    if(cfg.showBadge&&broken.length){
      var d=document.createElement("div");
      d.style.cssText="position:fixed;bottom:10px;right:10px;z-index:99999;padding:6px 12px;border-radius:20px;font:600 12px/1 sans-serif;color:#fff;background:"+(broken.length?"#e53e3e":"#38a169")+";cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2)";
      d.textContent=broken.length+" broken link"+(broken.length>1?"s":"");
      d.onclick=function(){console.table(broken)};document.body.appendChild(d);
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(run,2000)});
  else setTimeout(run,2000);
})();
</script>`

    if (!currentScan) {
        return (
            <div className="empty-state">
                <p>No scan results to export.</p>
                <p style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                    Run a scan first to export results.
                </p>
            </div>
        )
    }

    return (
        <div className="stack-lg">
            {/* Export options */}
            <div className="stack-sm">
                <h2>Export Report</h2>
                <p>Download scan results in your preferred format.</p>
            </div>

            <div className="grid-3">
                <button
                    className="framer-button-primary"
                    onClick={() => {
                        downloadCSV(currentScan)
                        showToast("CSV downloaded", "success")
                    }}
                >
                    CSV
                </button>
                <button
                    className="framer-button-primary"
                    onClick={() => {
                        downloadHTMLReport(currentScan)
                        showToast("HTML report downloaded", "success")
                    }}
                >
                    HTML
                </button>
                <button
                    className="framer-button-primary"
                    onClick={() => {
                        downloadJSON(currentScan)
                        showToast("JSON exported", "success")
                    }}
                >
                    JSON
                </button>
            </div>

            <hr />

            {/* Bulk actions */}
            <div className="stack-sm">
                <h2>Bulk Actions</h2>
                <div className="grid-2">
                    <button
                        className="btn-secondary"
                        onClick={handleCopyBrokenUrls}
                        disabled={brokenCount === 0}
                    >
                        {copied ? "Copied!" : `Copy ${brokenCount} broken URLs`}
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => {
                            ignoreAllBroken()
                            showToast(`Ignored ${brokenCount} broken links`, "info")
                        }}
                        disabled={brokenCount === 0}
                    >
                        Ignore all broken
                    </button>
                </div>
                <button
                    className="btn-secondary w-full"
                    onClick={handleCopyWaybackUrls}
                    disabled={brokenCount === 0}
                >
                    Copy Wayback Machine URLs for broken links
                </button>
                {ignoredCount > 0 && (
                    <p style={{ fontSize: 10, color: "var(--framer-color-text-tertiary)" }}>
                        {ignoredCount} link{ignoredCount !== 1 ? "s" : ""} currently ignored
                    </p>
                )}
            </div>

            <hr />

            {/* Safety Check */}
            <SafetyCheck />

            <hr />

            {/* Embed Script */}
            <div className="stack-sm">
                <h2>Continuous Monitoring</h2>
                <p>
                    Add this script to your Framer site's custom code. It checks all links on every
                    page load, stores results in localStorage, and optionally reports to a webhook.
                    Configure the check interval to avoid repeated checks.
                </p>
                <div className="code-block">
                    <button
                        className={`copy-btn ${embedCopied ? "copied" : ""}`}
                        onClick={() => {
                            void navigator.clipboard.writeText(embedScript).then(() => {
                                setEmbedCopied(true)
                                setTimeout(() => setEmbedCopied(false), 2000)
                            })
                        }}
                    >
                        {embedCopied ? "Copied" : "Copy"}
                    </button>
                    {embedScript}
                </div>
            </div>

            {/* Install guide */}
            <div
                className="stack-sm"
                style={{
                    border: "1px solid var(--framer-color-divider)",
                    borderRadius: 8,
                    overflow: "hidden",
                }}
            >
                <header
                    style={{
                        padding: "8px 12px",
                        background: "var(--framer-color-bg-secondary)",
                        borderBottom: "1px solid var(--framer-color-divider)",
                        fontSize: 11,
                        fontWeight: 600,
                    }}
                >
                    Installation Guide
                </header>
                <ol
                    style={{
                        padding: "10px 12px 10px 28px",
                        margin: 0,
                        fontSize: 11,
                        color: "var(--framer-color-text-secondary)",
                        lineHeight: 1.8,
                    }}
                >
                    <li>Open your Framer project settings</li>
                    <li>Go to General &gt; Custom Code</li>
                    <li>Paste the script in the "End of &lt;body&gt; tag" section</li>
                    <li>Configure the webhook URL in the data-blc-config attribute (optional)</li>
                    <li>Set checkInterval (ms) to control how often checks run (default: 24h)</li>
                    <li>Set showBadge to true for a visual broken link indicator</li>
                    <li>Publish your site</li>
                    <li>Open browser console to see results</li>
                </ol>
            </div>

            {/* Summary */}
            <div className="info-box info-box-default">
                <p style={{ fontSize: 10, margin: 0 }}>
                    <strong>Scan Summary</strong>
                    <br />
                    Site: {currentScan.siteUrl}
                    <br />
                    Pages: {currentScan.pagesScanned} | Links: {currentScan.linksChecked}
                    <br />
                    Broken: {currentScan.broken} | Redirects: {currentScan.redirects}
                    <br />
                    Health: {currentScan.healthScore}%
                </p>
            </div>
        </div>
    )
}

export default ExportPanel
