# Broken Link Checker - Framer Plugin

Scan your Framer website for broken links, redirects, timeouts, and errors.

## Features

- **Full site scanning** - Crawl all pages and check every link
- **Status detection** - Identify broken (404), redirects (301/302), timeouts, and errors
- **Filterable results** - Filter by status, link type, page, element type
- **Health score** - Overall site link health percentage
- **Dashboard** - Visual breakdown of link status distribution
- **Scan history** - Compare scans over time to track improvements
- **Scheduled scans** - Set up daily, weekly, or monthly automated scans
- **Email notifications** - Get alerted when new broken links are found
- **Fix suggestions** - Similar URL suggestions and Wayback Machine lookup
- **Export** - Download results as CSV or HTML report
- **Continuous monitoring** - Embed script for client-side link checking

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Stack

- React 18 + TypeScript
- Zustand (state management)
- Vite (build tool)
- Framer Plugin SDK
- Tailwind CSS
