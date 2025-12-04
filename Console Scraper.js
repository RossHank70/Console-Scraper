// PRODUCTION VERSION: 1.0.0
// COPY AND PASTE THIS INTO YOUR CHROME CONSOLE (F12)

(async function scrapeProduction() {
    'use strict';
    console.clear();
    
    // --- CONFIGURATION ---
    const CONFIG = {
        headerTitle: "list of participating csps", // Text to find to anchor the search
        minWait: 300,         // Minimum time to wait after click (ms)
        maxWait: 5000,        // Maximum time to wait if page acts stuck (ms)
        stabilityWait: 600,   // How long page must be still to count as "loaded" (ms)
        // Words to strictly ignore if found on their own line
        ignoreList: [
            'participating', 'companies', 'contact', 'search', 'menu', 'home', 
            'privacy', 'terms', 'sitemap', 'login', 'about us', 'resources', 
            'news & events', 'infrastructure', 'mnos', 'vetting', 'back to top'
        ]
    };

    console.log("%c 🚀 STARTING PRODUCTION SCRAPER ", "background: #222; color: #00ff00; font-size: 16px; padding: 5px; border-radius: 4px;");

    // State management
    let isAborted = false;
    const masterList = [];

    // --- UI: STATUS OVERLAY ---
    // We create the UI immediately so the user sees something happening
    const overlay = document.createElement('div');
    overlay.id = "scraper-overlay";
    overlay.style.cssText = "position:fixed; bottom:20px; right:20px; width:300px; background:rgba(0,0,0,0.9); z-index:999999; padding:15px; border-radius:8px; color:white; font-family:sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.5);";
    
    const statusTitle = document.createElement('div');
    statusTitle.innerText = "Scraper Running...";
    statusTitle.style.fontWeight = "bold";
    statusTitle.style.marginBottom = "10px";

    const statusText = document.createElement('div');
    statusText.innerText = "Initializing...";
    statusText.style.fontSize = "12px";
    statusText.style.color = "#ccc";

    const stopBtn = document.createElement('button');
    stopBtn.innerText = "⏹ Stop Script";
    stopBtn.style.cssText = "margin-top:10px; width:100%; padding:5px; cursor:pointer; background:#ff4444; color:white; border:none; border-radius:4px;";
    stopBtn.onclick = () => {
        isAborted = true;
        statusTitle.innerText = "Stopping...";
        stopBtn.disabled = true;
    };

    overlay.appendChild(statusTitle);
    overlay.appendChild(statusText);
    overlay.appendChild(stopBtn);
    document.body.appendChild(overlay);

    const updateStatus = (msg) => {
        statusText.innerText = msg;
        console.log(`[Status] ${msg}`);
    };

    // --- UTILS ---

    // Smart Waiter: Resolves when DOM stops mutating
    const waitForContentLoad = () => {
        return new Promise(resolve => {
            let stabilityTimer, maxTimer;
            const observer = new MutationObserver(() => {
                clearTimeout(stabilityTimer);
                stabilityTimer = setTimeout(() => {
                    cleanup();
                    resolve("stable");
                }, CONFIG.stabilityWait);
            });
            
            const cleanup = () => {
                observer.disconnect();
                clearTimeout(maxTimer);
                clearTimeout(stabilityTimer);
            };

            observer.observe(document.body, { childList: true, subtree: true });
            
            // Failsafe
            maxTimer = setTimeout(() => {
                cleanup();
                resolve("timeout");
            }, CONFIG.maxWait);
            
            // Min wait
            setTimeout(() => {}, CONFIG.minWait);
        });
    };

    // Clean Text Extractor
    const extractCleanLines = (element) => {
        // Clone to avoid destroying page
        const clone = element.cloneNode(true);
        
        // Remove standard junk
        clone.querySelectorAll('script, style, noscript, iframe, nav, footer, header, svg').forEach(el => el.remove());

        // FORCE NEWLINES: Inject line breaks after block elements
        // This ensures companies in grids are split to new lines
        const separators = clone.querySelectorAll('div, p, li, br, tr, td, h1, h2, h3, h4, h5, h6, article, section');
        separators.forEach(el => el.after(document.createTextNode('\n')));

        return clone.innerText
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 1); // Remove empty/single-char noise
    };

    // --- MAIN LOGIC ---

    try {
        // 1. Locate Header
        const allHeaders = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, strong, b'));
        const anchorHeader = allHeaders.find(el => el.innerText.toLowerCase().includes(CONFIG.headerTitle));
        
        if (!anchorHeader) throw new Error(`Header '${CONFIG.headerTitle}' not found.`);
        
        anchorHeader.scrollIntoView({ block: "start", behavior: "smooth" });
        updateStatus("Header found. Scanning for sections...");

        // 2. Find Filter Buttons
        const candidates = document.querySelectorAll('a, li, span, div[role="button"]');
        const uniqueChars = new Set();
        const validButtons = [];
        const headerRect = anchorHeader.getBoundingClientRect();
        const headerAbsoluteTop = window.scrollY + headerRect.top;

        for (const el of candidates) {
            if (isAborted) break;
            if (el.offsetParent === null) continue; // Hidden
            
            const elRect = el.getBoundingClientRect();
            const elAbsoluteTop = window.scrollY + elRect.top;
            
            // Must be physically below header
            if (elAbsoluteTop <= headerAbsoluteTop) continue;
            
            const text = el.innerText.trim();
            // Regex: A-Z or #
            if (!/^[A-Z#]$/.test(text)) continue;
            
            if (el.closest('footer') || el.closest('nav')) continue;

            if (!uniqueChars.has(text)) {
                uniqueChars.add(text);
                validButtons.push({ element: el, text: text });
            }
        }
        validButtons.sort((a, b) => a.text.localeCompare(b.text));
        
        if (validButtons.length === 0) throw new Error("No alphabet filter buttons found below the header.");
        
        updateStatus(`Found ${validButtons.length} sections to scrape.`);

        // 3. Iterative Scrape Loop
        for (let i = 0; i < validButtons.length; i++) {
            if (isAborted) {
                updateStatus("Script stopped by user.");
                break;
            }

            const item = validButtons[i];
            updateStatus(`Scraping Section: ${item.text} (${i + 1}/${validButtons.length})`);

            try {
                item.element.scrollIntoView({ block: "center" });
                item.element.click();
                
                await waitForContentLoad();

                // Extract
                const cleanLines = extractCleanLines(document.body);
                
                // Filter and Store
                const newItems = cleanLines.filter(line => {
                    const lower = line.toLowerCase();
                    // Must not be the letter itself
                    if (line === item.text) return false;
                    // Must not be in ignore list
                    if (CONFIG.ignoreList.some(badWord => lower.includes(badWord))) return false;
                    return true;
                });

                newItems.forEach(line => {
                    // Check for duplicates in this specific letter section
                    const exists = masterList.some(entry => entry.name === line && entry.letter === item.text);
                    if (!exists) {
                        masterList.push({ letter: item.text, name: line });
                    }
                });

            } catch (err) {
                console.warn(`Skipping ${item.text} due to error`, err);
            }
        }

        // 4. Output
        if (isAborted) console.warn("Partial results generated due to abort.");
        updateStatus(`Done! Collected ${masterList.length} items.`);
        console.log("%c 🎉 SCRAPE COMPLETE ", "background: #0F9D58; color: #fff; font-size: 16px;");

        // Format Text
        let textOutput = "List of Participating CSPs\n==========================\n\n";
        let currentLetter = "";
        masterList.forEach(item => {
            if (item.letter !== currentLetter) {
                currentLetter = item.letter;
                textOutput += `\n--- ${currentLetter} ---\n`;
            }
            textOutput += `${item.name}\n`;
        });

        // Trigger Download
        const blob = new Blob([textOutput], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'participating_csps_list.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Show Final UI
        const textArea = document.createElement('textarea');
        textArea.value = textOutput;
        textArea.style.cssText = "width:100%; height:200px; margin-top:10px; font-family:monospace; font-size:11px;";
        overlay.innerHTML = ""; // Clear old UI
        
        const h2 = document.createElement('h3');
        h2.innerText = `Complete: ${masterList.length} items`;
        
        const closeBtn = document.createElement('button');
        closeBtn.innerText = "Close Overlay";
        closeBtn.style.cssText = "margin-top:5px; width:100%; padding:5px; cursor:pointer;";
        closeBtn.onclick = () => document.body.removeChild(overlay);

        overlay.appendChild(h2);
        overlay.appendChild(textArea);
        overlay.appendChild(closeBtn);

    } catch (criticalErr) {
        console.error(criticalErr);
        updateStatus(`Error: ${criticalErr.message}`);
        alert(`Scraper Error: ${criticalErr.message}`);
    }
})();