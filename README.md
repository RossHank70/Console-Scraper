Participating CSPs Scraper Project
This project contains two production-ready tools designed to scrape the "Participating Companies" list from the Campaign Registry website. Both tools are optimized to handle the specific alphabet-filter behavior where clicking a letter hides previous results.

1. Console Scraper (JavaScript)
File: console_scraper.js
Best for: Quick, one-off scrapes directly in the browser without installing software.

Features
Iterative Scraping: Automatically clicks A-Z headers one by one.
Smart Waiting: Uses MutationObserver to detect exactly when data loads (fast).
UI Overlay: Shows a progress box on the screen with a "Stop" button.
Auto-Download: Generates a participating_csps_list.txt file automatically.
New-Line Enforcement: Ensures company names listed in grids are split onto new lines.

How to Run
Open the target webpage in Chrome.
Press F12 to open Developer Tools.
Go to the Console tab.
Paste the code from console_scraper.js and hit Enter.
Wait for the "Scrape Complete" notification and file download.

3. Dynamic Scraper (Python)
File: dynamic_scraper.py
Best for: Automated, scheduled, or headless scraping tasks.

Features
Selenium & BeautifulSoup: Hybrid approach for reliability and speed.
Stale Element Protection: Re-queries DOM elements before every interaction to prevent crashes.
Headless Mode: Runs in the background without a visible browser window.
Iterative Logic: Locates the "List of Participating CSPs" header and strictly clicks buttons below it.

Requirements
pip install selenium beautifulsoup4 webdriver-manager


How to Run
# Standard run (Headless Chrome)
python dynamic_scraper.py "[https://www.campaignregistry.com/participating-companies/csps/](https://www.campaignregistry.com/participating-companies/csps/)"

# Run with visible browser (good for debugging)
python dynamic_scraper.py "URL" --visible

# Run using Firefox
python dynamic_scraper.py "URL" --browser firefox


Output
The script generates a file (default: scraped_data.txt) containing the scraped data organized by section headers.
