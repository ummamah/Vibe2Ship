# Browser Extension - Screen Time Tracker

This extension tracks time spent on websites and sends data to your backend.

## Structure

```
browser-extension/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── content.js            # Injected into web pages
├── popup/
│   ├── popup.html        # Extension popup UI
│   ├── popup.js          # Popup logic
│   └── popup.css         # Popup styles
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Implementation

### 1. Manifest (`manifest.json`)

```json
{
  "manifest_version": 3,
  "name": "Personal AI - Screen Time Tracker",
  "version": "1.0.0",
  "description": "Track your screen time and sync with your personal AI assistant",
  "permissions": [
    "tabs",
    "storage",
    "alarms",
    "notifications"
  ],
  "host_permissions": [
    "http://localhost:8000/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 2. Background Service Worker (`background.js`)

```javascript
// Configuration
const API_URL = 'http://localhost:8000/api/tracking';
const SYNC_INTERVAL = 5; // minutes

// Track current active tab
let currentTab = null;
let startTime = null;
let timeEntries = [];

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Screen Time Tracker installed');
  
  // Set up periodic sync alarm
  chrome.alarms.create('syncData', { periodInMinutes: SYNC_INTERVAL });
  
  // Load saved entries
  chrome.storage.local.get(['timeEntries'], (result) => {
    if (result.timeEntries) {
      timeEntries = result.timeEntries;
    }
  });
});

// Track tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await saveCurrentTabTime();
  
  // Get new active tab
  const tab = await chrome.tabs.get(activeInfo.tabId);
  startTracking(tab);
});

// Track tab updates (URL changes)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    await saveCurrentTabTime();
    startTracking(tab);
  }
});

// Track window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus
    await saveCurrentTabTime();
    currentTab = null;
    startTime = null;
  } else {
    // Browser gained focus
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) {
      startTracking(tab);
    }
  }
});

// Sync data periodically
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncData') {
    syncDataToServer();
  }
});

function startTracking(tab) {
  if (!tab || !tab.url) return;
  
  // Don't track chrome:// pages or extensions
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }
  
  currentTab = {
    url: tab.url,
    title: tab.title || 'Unknown',
    domain: new URL(tab.url).hostname
  };
  startTime = Date.now();
}

async function saveCurrentTabTime() {
  if (!currentTab || !startTime) return;
  
  const endTime = Date.now();
  const duration = Math.floor((endTime - startTime) / 1000); // seconds
  
  // Only save if spent more than 2 seconds
  if (duration < 2) return;
  
  const entry = {
    url: currentTab.url,
    title: currentTab.title,
    domain: currentTab.domain,
    duration: duration,
    timestamp: new Date(startTime).toISOString()
  };
  
  timeEntries.push(entry);
  
  // Save to local storage
  await chrome.storage.local.set({ timeEntries });
  
  // Check for excessive usage
  checkExcessiveUsage(currentTab.domain, duration);
}

async function syncDataToServer() {
  if (timeEntries.length === 0) return;
  
  try {
    const response = await fetch(`${API_URL}/screentime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(timeEntries)
    });
    
    if (response.ok) {
      console.log(`Synced ${timeEntries.length} entries to server`);
      // Clear synced entries
      timeEntries = [];
      await chrome.storage.local.set({ timeEntries: [] });
    } else {
      console.error('Failed to sync data:', response.statusText);
    }
  } catch (error) {
    console.error('Error syncing data:', error);
  }
}

async function checkExcessiveUsage(domain, duration) {
  // Get today's total time for this domain
  const today = new Date().toISOString().split('T')[0];
  
  const todayEntries = timeEntries.filter(entry => 
    entry.timestamp.startsWith(today) && entry.domain === domain
  );
  
  const totalTimeToday = todayEntries.reduce((sum, entry) => sum + entry.duration, 0);
  const hours = totalTimeToday / 3600;
  
  // Get warning threshold from settings (default 2 hours)
  const settings = await chrome.storage.local.get(['warningThreshold']);
  const threshold = settings.warningThreshold || 2;
  
  if (hours >= threshold) {
    // Show warning notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Screen Time Warning',
      message: `You've spent ${hours.toFixed(1)} hours on ${domain} today!`,
      priority: 2
    });
  }
}

// Manual sync trigger from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncNow') {
    syncDataToServer().then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getStats') {
    sendResponse({ entries: timeEntries });
  }
});
```

### 3. Content Script (`content.js`)

```javascript
// This script runs on every webpage
// Currently minimal, but can be extended for page-specific tracking

// Detect user activity (optional - for more accurate tracking)
let lastActivity = Date.now();

['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
  document.addEventListener(event, () => {
    lastActivity = Date.now();
  }, { passive: true });
});

// Send activity status to background script periodically
setInterval(() => {
  const idleTime = Date.now() - lastActivity;
  
  // If idle for more than 5 minutes, user might be away
  if (idleTime > 5 * 60 * 1000) {
    chrome.runtime.sendMessage({ type: 'userIdle' });
  }
}, 60000); // Check every minute
```

### 4. Popup HTML (`popup/popup.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Screen Time Tracker</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Screen Time</h1>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Today</div>
        <div class="stat-value" id="todayTime">0h 0m</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">This Week</div>
        <div class="stat-value" id="weekTime">0h 0m</div>
      </div>
    </div>
    
    <div class="section">
      <h2>Top Sites Today</h2>
      <div id="topSites" class="site-list">
        <div class="loading">Loading...</div>
      </div>
    </div>
    
    <div class="actions">
      <button id="syncBtn" class="btn-primary">
        Sync Now
      </button>
      <button id="viewDashboard" class="btn-secondary">
        View Dashboard
      </button>
    </div>
    
    <div class="footer">
      <div id="lastSync">Last synced: Never</div>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### 5. Popup JavaScript (`popup/popup.js`)

```javascript
// Load and display stats
async function loadStats() {
  // Get entries from storage
  const result = await chrome.storage.local.get(['timeEntries']);
  const entries = result.timeEntries || [];
  
  if (entries.length === 0) {
    document.getElementById('topSites').innerHTML = '<div class="empty">No data yet</div>';
    return;
  }
  
  // Calculate today's time
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter(e => e.timestamp.startsWith(today));
  
  const todaySeconds = todayEntries.reduce((sum, e) => sum + e.duration, 0);
  document.getElementById('todayTime').textContent = formatTime(todaySeconds);
  
  // Calculate week's time
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekEntries = entries.filter(e => new Date(e.timestamp) >= weekAgo);
  
  const weekSeconds = weekEntries.reduce((sum, e) => sum + e.duration, 0);
  document.getElementById('weekTime').textContent = formatTime(weekSeconds);
  
  // Group by domain for today
  const domainTimes = {};
  todayEntries.forEach(entry => {
    domainTimes[entry.domain] = (domainTimes[entry.domain] || 0) + entry.duration;
  });
  
  // Sort and display top 5
  const topDomains = Object.entries(domainTimes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const siteList = document.getElementById('topSites');
  siteList.innerHTML = topDomains.map(([domain, seconds]) => `
    <div class="site-item">
      <div class="site-name">${domain}</div>
      <div class="site-time">${formatTime(seconds)}</div>
    </div>
  `).join('');
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Sync button handler
document.getElementById('syncBtn').addEventListener('click', async () => {
  const btn = document.getElementById('syncBtn');
  btn.textContent = 'Syncing...';
  btn.disabled = true;
  
  try {
    await chrome.runtime.sendMessage({ action: 'syncNow' });
    btn.textContent = '✓ Synced';
    setTimeout(() => {
      btn.textContent = 'Sync Now';
      btn.disabled = false;
    }, 2000);
  } catch (error) {
    btn.textContent = '✗ Failed';
    setTimeout(() => {
      btn.textContent = 'Sync Now';
      btn.disabled = false;
    }, 2000);
  }
});

// View dashboard button
document.getElementById('viewDashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:3000/analytics' });
});

// Load stats on popup open
loadStats();
```

### 6. Popup CSS (`popup/popup.css`)

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 350px;
  background: #f9fafb;
}

.container {
  padding: 16px;
}

.header {
  text-align: center;
  margin-bottom: 16px;
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #0ea5e9;
}

.section {
  margin-bottom: 20px;
}

.section h2 {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.site-list {
  background: white;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
}

.site-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #f3f4f6;
}

.site-item:last-child {
  border-bottom: none;
}

.site-name {
  font-size: 13px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.site-time {
  font-size: 13px;
  font-weight: 600;
  color: #0ea5e9;
  margin-left: 12px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #0ea5e9;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0284c7;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f9fafb;
}

.footer {
  text-align: center;
  font-size: 11px;
  color: #9ca3af;
}

.loading,
.empty {
  text-align: center;
  padding: 20px;
  color: #9ca3af;
  font-size: 13px;
}
```

## Installation

1. **Create icons** (or use placeholder):
   - Create `icons/` folder
   - Add `icon16.png`, `icon48.png`, `icon128.png`

2. **Load extension in Chrome**:
   ```
   1. Open Chrome
   2. Go to chrome://extensions/
   3. Enable "Developer mode" (top right)
   4. Click "Load unpacked"
   5. Select the browser-extension/ folder
   ```

3. **Grant permissions** when prompted

4. **Pin extension** to toolbar for easy access

## Testing

- Browse different websites
- Check popup to see tracked time
- Click "Sync Now" to send data to backend
- Verify data appears in your analytics dashboard

## Notes

- Extension tracks only when browser is active
- Data syncs every 5 minutes automatically
- Can manually sync anytime from popup
- Notifications appear when exceeding time limits
- All data stored locally until synced

---

Next: [DEPLOYMENT.md](DEPLOYMENT.md) for running on your local network
