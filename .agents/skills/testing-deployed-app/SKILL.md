# Testing Lawliet Labs Deployed App

## Overview
The Lawliet Labs app is a React SPA deployed as static files. Some pages (like the AI Tokens page) are standalone HTML files served alongside the React app.

## Deployed App
- **URL**: The deployed app URL is provided by the Devin deploy tool (frontend deployment from `/home/ubuntu/deployed-app/`)
- **Source repo**: `zutronn/AI_Jules` on GitHub
- **Frontend source**: `frontend/` directory in the repo
- **Deployed build**: `/home/ubuntu/deployed-app/` on the Devin machine

## Architecture Notes
- The main app is a React SPA built with Vite + Tailwind CSS
- Standalone HTML pages (e.g., `/tokens/index.html`) live outside React and have their own inline styles, headers, and footers
- The React app's `index.html` includes a DOM injection script that adds nav links (like "AI Tokens") into the React-rendered header
- The injection script uses a `MutationObserver` to re-inject links after React re-renders remove them
- Links to standalone pages must use the full path (e.g., `/tokens/index.html`) to avoid being caught by the React SPA router

## Testing Process
1. Deploy the app using the Devin deploy tool (`frontend` command with `/home/ubuntu/deployed-app/` directory)
2. Wait ~8 seconds after navigating to the main page for the React app to fully render and the injection script to run
3. Verify injected nav links appear in the header before interacting with them
4. When testing standalone HTML pages, verify both navigation TO the page and BACK to the main app work
5. The React app fetches data periodically, so the page will re-render. Verify injected elements persist across re-renders

## Common Issues
- **Blank page on `/tokens/`**: The React SPA router intercepts paths like `/tokens/` and shows a blank page. Always use the full path `/tokens/index.html` to bypass the router
- **Nav link disappearing**: If the MutationObserver is disconnected, React re-renders will remove injected DOM elements. The observer must stay active
- **Slow initial load**: The React app takes several seconds to render. The injection script waits 1 second before first attempting injection, with retries every 500ms (max 20 retries)

## Devin Secrets Needed
- No secrets required for testing the deployed frontend (public URL)
- GitHub access is needed for PR operations (provided automatically by Devin)
