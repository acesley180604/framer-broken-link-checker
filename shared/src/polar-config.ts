// Polar organization ID — used for license key validation (public, safe to expose)
export const POLAR_ORG_ID = "dcc4eb32-81aa-44bc-a848-ae57892c12d4";
export const POLAR_API_URL = "https://api.polar.sh/v1/customer-portal/license-keys";

// Product mapping: plugin slug → Polar product ID
export const PRODUCTS: Record<string, { id: string; name: string; price: string; type: "one_time" | "yearly" }> = {
  "scroll-progress": { id: "1d204e1d-abc0-4fdb-9482-95332717ea5a", name: "Scroll Progress", price: "$5", type: "one_time" },
  "compare-slider": { id: "8b14ed6d-bedc-4bf7-98c0-a3b8a5634fce", name: "Compare Slider", price: "$9", type: "one_time" },
  "redirect-manager": { id: "4454f550-f91b-4572-8dde-e1d1114784bf", name: "Redirect Manager", price: "$9", type: "one_time" },
  "hotspot-marker": { id: "89f8026d-6013-49ae-b6b0-16090a7d89be", name: "Hotspot Marker", price: "$12", type: "one_time" },
  "social-share-buttons": { id: "df2e59ce-d2de-49e8-b0b4-d598d557a118", name: "Social Share Buttons", price: "$12", type: "one_time" },
  "nova-installer": { id: "5457c790-d2af-43ba-8c47-f5fc8d0fef48", name: "Nova Installer", price: "$15", type: "one_time" },
  "smart-countdown": { id: "ae6ff019-50ca-42b2-8d0d-d15e119675b6", name: "Smart Countdown", price: "$19/yr", type: "yearly" },
  "cookie-notice-gdpr": { id: "f3f6de4b-4f67-4e22-b058-a058c291554f", name: "Cookie Notice GDPR", price: "$29/yr", type: "yearly" },
  "exit-popup-pro": { id: "1ca13c66-dd71-4a81-91ec-0a07376c76ec", name: "Exit Popup Pro", price: "$29/yr", type: "yearly" },
  "popup-builder": { id: "94e2644b-ed3a-4ae6-ba49-fd33ac73a754", name: "Popup Builder", price: "$29/yr", type: "yearly" },
  "launch-list": { id: "5ba492ce-33ea-4871-9e6f-12079bbdba10", name: "Launch List", price: "$29/yr", type: "yearly" },
  "calc-kit": { id: "c97079c9-bb29-4048-ab6d-100e84492d00", name: "Calc Kit", price: "$39/yr", type: "yearly" },
  "broken-link-checker": { id: "a58b61d8-89c3-475b-804a-0cce5cf3edda", name: "Broken Link Checker", price: "$39/yr", type: "yearly" },
  "lingua-switch": { id: "590019a1-5426-4795-9bde-8ed9524ebf78", name: "Lingua Switch", price: "$39/yr", type: "yearly" },
  "schema-rich-snippets": { id: "8df5d1cd-3037-497e-b1b5-898ba81fd2ac", name: "Schema Rich Snippets", price: "$49/yr", type: "yearly" },
  "quiz-flow": { id: "429cac9e-546f-4c18-ac2f-0863d656d4a3", name: "Quiz Flow", price: "$49/yr", type: "yearly" },
  "social-proof-kit": { id: "ff2cf48e-e0bc-475d-8e94-58805ce060a7", name: "Social Proof Kit", price: "$49/yr", type: "yearly" },
};
