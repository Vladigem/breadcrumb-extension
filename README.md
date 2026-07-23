# Breadcrumb

Breadcrumb is a local-first browser extension for saving useful webpage highlights with a short note about why they matter. It will save the selected text, page title, URL, date, and an optional personal note in the browser.

## First version

1. Highlight text on a webpage.
2. Use the extension popup to save that text as a breadcrumb.
3. View the latest saved breadcrumb in the popup.

Later versions can add tags, search, return-to-page reminders, and a visual learning trail.

## Learning plan

Build this in small, testable steps:

1. Learn the extension folder and `manifest.json`.
2. Build a popup with HTML and CSS.
3. Add JavaScript for a button click.
4. Read selected webpage text with a content script.
5. Save and display breadcrumbs with browser storage.
6. Improve the design and add features.

## Project rules

- Keep the extension local-first: saved data stays in the browser unless a later feature clearly says otherwise.
- Track only genuine work using Hackatime.
- Test after each small change by reloading the unpacked extension in Chrome.
- Do not commit API keys, passwords, or other secrets.
