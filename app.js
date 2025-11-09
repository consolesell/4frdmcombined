// ============================================
// Constants & Configuration
// ============================================
const STORAGE_KEYS = {
    BOTS: 'tradingBots',
    ACTIVE_BOTS: 'activeBots',
    THEME: 'themePreference',
    LAST_ACTIVE_TAB: 'lastActiveTab'
};

const DEFAULT_BOTS = [
    {
        id: 'odd-even',
        name: 'Odd/Even Bot',
        url: 'https://4liferobustowdeven.netlify.app/',
        isDefault: true
    },
    {
        id: 'kichele-bot',
        name: 'kichele/Bot',
        url: 'https://consolesell.github.io/4backup.mrt.bt/',
        isDefault: true
    },
    {
        id: 'call-put',
        name: 'CALL/PUT Bot',
        url: 'https://consolesell.github.io/4backup.mrt.bt/',
        isDefault: true
    }
];

// ============================================
// State Management
// ============================================
class AppState {
    constructor() {
        this.bots = this.loadBots();
        this.activeBots = this.loadActiveBots();
        this.currentBotId = null;
        this.isDarkMode = this.loadTheme();
    }

    loadBots() {
        const stored = localStorage.getItem(STORAGE_KEYS.BOTS);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse stored bots:', e);
            }
        }
        // Initialize with default bots
        this.saveBots(DEFAULT_BOTS);
        return [...DEFAULT_BOTS];
    }

    saveBots(bots) {
        localStorage.setItem(STORAGE_KEYS.BOTS, JSON.stringify(bots));
        this.bots = bots;
    }

    loadActiveBots() {
        const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_BOTS);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse active bots:', e);
            }
        }
        return [];
    }

    saveActiveBots(activeBots) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_BOTS, JSON.stringify(activeBots));
        this.activeBots = activeBots;
    }

    loadTheme() {
        const stored = localStorage.getItem(STORAGE_KEYS.THEME);
        return stored === 'dark' || stored === null; // Default to dark
    }

    saveTheme(isDark) {
        localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
        this.isDarkMode = isDark;
    }

    addBot(bot) {
        this.bots.push(bot);
        this.saveBots(this.bots);
    }

    removeBot(botId) {
        this.bots = this.bots.filter(bot => bot.id !== botId);
        this.saveBots(this.bots);
        // Also remove from active bots
        this.removeActiveBot(botId);
    }

    addActiveBot(botId) {
        if (!this.activeBots.includes(botId)) {
            this.activeBots.push(botId);
            this.saveActiveBots(this.activeBots);
        }
    }

    removeActiveBot(botId) {
        this.activeBots = this.activeBots.filter(id => id !== botId);
        this.saveActiveBots(this.activeBots);
    }

    isActive(botId) {
        return this.activeBots.includes(botId);
    }
}

// ============================================
// DOM Elements Cache
// ============================================
const DOM = {};

function cacheDOMElements() {
    DOM.loadingOverlay = document.getElementById('loading-overlay');
    DOM.liveDatetime = document.getElementById('live-datetime');
    DOM.activeBotCount = document.getElementById('active-bots-count');
    DOM.botTabsList = document.getElementById('bot-tabs-list');
    DOM.botFramesContainer = document.getElementById('bot-frames-container');
    DOM.loadingSpinner = document.getElementById('loading-spinner');
    DOM.themeToggle = document.getElementById('theme-toggle');
    DOM.settingsToggle = document.getElementById('settings-toggle');
    DOM.settingsOverlay = document.getElementById('settings-overlay');
    DOM.settingsPanel = document.getElementById('settings-panel');
    DOM.closeSettings = document.getElementById('close-settings');
    DOM.addBotForm = document.getElementById('add-bot-form');
    DOM.botNameInput = document.getElementById('bot-name-input');
    DOM.botUrlInput = document.getElementById('bot-url-input');
    DOM.botsList = document.getElementById('bots-list');
    DOM.activeBotsList = document.getElementById('active-bots-list');
}

// ============================================
// Utility Functions
// ============================================
function generateUniqueId() {
    return 'bot-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function sanitizeUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.href;
    } catch (e) {
        return null;
    }
}

function formatDateTime() {
    const now = new Date();
    const options = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    return now.toLocaleString('en-US', options);
}

function showLoading(show = true) {
    if (show) {
        DOM.loadingSpinner.classList.add('show');
    } else {
        DOM.loadingSpinner.classList.remove('show');
    }
}

function showNotification(message, type = 'info') {
    // Simple console notification - can be enhanced with toast library
    console.log(`[${type.toUpperCase()}] ${message}`);
    // TODO: Implement visual toast notifications
}

// ============================================
// Theme Management
// ============================================
function applyTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        DOM.themeToggle.querySelector('.theme-icon').textContent = '🌙';
    } else {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
        DOM.themeToggle.querySelector('.theme-icon').textContent = '☀️';
    }

    // Notify all iframes about theme change
    const iframes = document.querySelectorAll('.bot-frame');
    iframes.forEach(iframe => {
        try {
            iframe.contentWindow?.postMessage({
                type: 'SET_THEME',
                theme: isDark ? 'dark' : 'light'
            }, '*');
        } catch (e) {
            console.warn('Could not send theme to iframe:', e);
        }
    });
}

function toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    state.saveTheme(state.isDarkMode);
    applyTheme(state.isDarkMode);
}

// ============================================
// Live Clock
// ============================================
function updateClock() {
    DOM.liveDatetime.textContent = formatDateTime();
}

function startClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

// ============================================
// Active Bots Monitoring
// ============================================
function updateActiveBotCount() {
    const count = state.activeBots.length;
    DOM.activeBotCount.textContent = count;

    if (count > 0) {
        DOM.activeBotCount.classList.add('pulse');
    } else {
        DOM.activeBotCount.classList.remove('pulse');
    }
}

function refreshActiveBotsList() {
    DOM.activeBotsList.innerHTML = '';

    if (state.activeBots.length === 0) {
        DOM.activeBotsList.innerHTML = '<p class="no-active-bots">No bots currently running</p>';
        return;
    }

    state.activeBots.forEach(botId => {
        const bot = state.bots.find(b => b.id === botId);
        if (bot) {
            const itemHTML = `
                <div class="active-bot-item">
                    <div class="active-bot-indicator"></div>
                    <div class="active-bot-name">${bot.name}</div>
                </div>
            `;
            DOM.activeBotsList.insertAdjacentHTML('beforeend', itemHTML);
        }
    });
}

// Simulate bot activity detection (can be enhanced with actual iframe communication)
function monitorBotActivity() {
    // This is a placeholder - in production, bots would send postMessage when active
    // For now, we'll consider a bot active if it's the current tab
    setInterval(() => {
        // Check if current bot should be marked as active
        if (state.currentBotId) {
            state.addActiveBot(state.currentBotId);
        }

        // Auto-remove bots that haven't been active
        // This is simplified - real implementation would use timestamps
        updateActiveBotCount();
        refreshActiveBotsList();
    }, 5000);
}

// ============================================
// Bot Rendering
// ============================================
function renderBotTab(bot) {
    const li = document.createElement('li');
    const isActive = state.isActive(bot.id);

    const activeIndicator = isActive 
        ? '<span class="bot-status-badge" title="Bot is active"></span>' 
        : '';

    li.innerHTML = `
        <a href="#" class="bot-tab" data-bot-id="${bot.id}">
            ${bot.name}
            ${activeIndicator}
        </a>
    `;

    return li;
}

function renderBotFrame(bot) {
    const iframe = document.createElement('iframe');
    iframe.id = `iframe-${bot.id}`;
    iframe.className = 'bot-frame';
    iframe.dataset.src = bot.url;
    iframe.dataset.botId = bot.id;

    // Security attributes
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    iframe.setAttribute('loading', 'lazy');

    return iframe;
}

function renderAllBots() {
    // Clear existing
    DOM.botTabsList.innerHTML = '';
    DOM.botFramesContainer.innerHTML = '';

    // Render all bots
    state.bots.forEach(bot => {
        // Add tab
        const tabElement = renderBotTab(bot);
        DOM.botTabsList.appendChild(tabElement);
        
        // Add iframe
        const frameElement = renderBotFrame(bot);
        DOM.botFramesContainer.appendChild(frameElement);
    });

    // Attach event listeners to tabs
    attachTabListeners();
}

function attachTabListeners() {
    const tabs = document.querySelectorAll('.bot-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const botId = e.currentTarget.dataset.botId;
            switchBot(botId);
        });
    });
}

// ============================================
// Bot Switching & Loading
// ============================================
function switchBot(botId) {
    if (state.currentBotId === botId) return;

    // Remove active class from all tabs
    document.querySelectorAll('.bot-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Hide all iframes
    document.querySelectorAll('.bot-frame').forEach(frame => {
        frame.classList.remove('active');
    });

    // Activate selected tab
    const selectedTab = document.querySelector(`[data-bot-id="${botId}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Show and load selected iframe
    const selectedFrame = document.getElementById(`iframe-${botId}`);
    if (selectedFrame) {
        showLoading(true);
        selectedFrame.classList.add('loading');
        
        // Load iframe if not already loaded
        if (!selectedFrame.src) {
            selectedFrame.src = selectedFrame.dataset.src;
            
            selectedFrame.onload = () => {
                showLoading(false);
                selectedFrame.classList.remove('loading');
                selectedFrame.classList.add('active');
                
                // Send theme to iframe
                try {
                    selectedFrame.contentWindow?.postMessage({
                        type: 'SET_THEME',
                        theme: state.isDarkMode ? 'dark' : 'light'
                    }, '*');
                } catch (e) {
                    console.warn('Could not send theme to iframe:', e);
                }
            };
            
            selectedFrame.onerror = () => {
                showLoading(false);
                selectedFrame.classList.remove('loading');
                showNotification('Failed to load bot', 'error');
            };
        } else {
            // Already loaded, just show it
            setTimeout(() => {
                showLoading(false);
                selectedFrame.classList.remove('loading');
                selectedFrame.classList.add('active');
            }, 300);
        }
    }

    state.currentBotId = botId;
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_TAB, botId);

    // Mark bot as active
    state.addActiveBot(botId);
    updateActiveBotCount();
}

// ============================================
// Settings Panel
// ============================================
function openSettings() {
    DOM.settingsOverlay.classList.add('show');
    DOM.settingsPanel.classList.add('show');
    renderBotManagementList();
}

function closeSettings() {
    DOM.settingsOverlay.classList.remove('show');
    DOM.settingsPanel.classList.remove('show');
}

function renderBotManagementList() {
    DOM.botsList.innerHTML = '';

    if (state.bots.length === 0) {
        DOM.botsList.innerHTML = '<p class="no-bots">No bots configured</p>';
        return;
    }

    state.bots.forEach(bot => {
        const canDelete = !bot.isDefault;
        const deleteButton = canDelete 
            ? `<button class="btn-delete" data-bot-id="${bot.id}">Delete</button>`
            : '<span style="font-size: 0.85em; color: var(--nav-link);">Default</span>';
        
        const itemHTML = `
            <div class="bot-item">
                <div class="bot-item-info">
                    <div class="bot-item-name">${bot.name}</div>
                    <div class="bot-item-url">${bot.url}</div>
                </div>
                <div class="bot-item-actions">
                    ${deleteButton}
                </div>
            </div>
        `;
        DOM.botsList.insertAdjacentHTML('beforeend', itemHTML);
    });

    // Attach delete listeners
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const botId = e.currentTarget.dataset.botId;
            deleteBot(botId);
        });
    });
}

function addBot(name, url) {
    const sanitizedUrl = sanitizeUrl(url);

    if (!sanitizedUrl) {
        showNotification('Invalid URL format', 'error');
        return false;
    }

    const newBot = {
        id: generateUniqueId(),
        name: name.trim(),
        url: sanitizedUrl,
        isDefault: false
    };

    state.addBot(newBot);
    renderAllBots();
    renderBotManagementList();
    showNotification(`Bot "${name}" added successfully`, 'success');

    return true;
}

function deleteBot(botId) {
    const bot = state.bots.find(b => b.id === botId);

    if (!bot) return;

    if (bot.isDefault) {
        showNotification('Cannot delete default bots', 'error');
        return;
    }

    if (confirm(`Are you sure you want to delete "${bot.name}"?`)) {
        state.removeBot(botId);
        
        // If deleted bot was active, switch to first available bot
        if (state.currentBotId === botId && state.bots.length > 0) {
            switchBot(state.bots[0].id);
        }
        
        renderAllBots();
        renderBotManagementList();
        updateActiveBotCount();
        refreshActiveBotsList();
        showNotification(`Bot "${bot.name}" deleted`, 'success');
    }
}

// ============================================
// Event Listeners
// ============================================
function attachEventListeners() {
    // Theme toggle
    DOM.themeToggle.addEventListener('click', toggleTheme);

    // Settings panel
    DOM.settingsToggle.addEventListener('click', openSettings);
    DOM.closeSettings.addEventListener('click', closeSettings);
    DOM.settingsOverlay.addEventListener('click', closeSettings);

    // Add bot form
    DOM.addBotForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = DOM.botNameInput.value.trim();
        const url = DOM.botUrlInput.value.trim();
        
        if (!name || !url) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        if (addBot(name, url)) {
            DOM.botNameInput.value = '';
            DOM.botUrlInput.value = '';
        }
    });

    // Listen for messages from iframes (bot activity, theme requests, etc.)
    window.addEventListener('message', (event) => {
        // Validate message origin if needed
        // if (!event.origin.includes('trusted-domain.com')) return;
        
        if (event.data && event.data.type) {
            switch (event.data.type) {
                case 'BOT_ACTIVE':
                    if (event.data.botId) {
                        state.addActiveBot(event.data.botId);
                        updateActiveBotCount();
                        refreshActiveBotsList();
                    }
                    break;
                    
                case 'BOT_INACTIVE':
                    if (event.data.botId) {
                        state.removeActiveBot(event.data.botId);
                        updateActiveBotCount();
                        refreshActiveBotsList();
                    }
                    break;
                    
                case 'REQUEST_THEME':
                    // Send current theme to requesting iframe
                    event.source.postMessage({
                        type: 'SET_THEME',
                        theme: state.isDarkMode ? 'dark' : 'light'
                    }, event.origin);
                    break;
            }
        }
    });
}

// ============================================
// Initialization
// ============================================
const state = new AppState();

function hideLoadingOverlay() {
    setTimeout(() => {
        DOM.loadingOverlay.style.opacity = '0';
        DOM.loadingOverlay.style.visibility = 'hidden';
    }, 1500);
}

function init() {
    // Cache DOM elements
    cacheDOMElements();

    // Apply saved theme
    applyTheme(state.isDarkMode);

    // Start live clock
    startClock();

    // Render all bots
    renderAllBots();

    // Attach event listeners
    attachEventListeners();

    // Update active bot indicators
    updateActiveBotCount();
    refreshActiveBotsList();

    // Start monitoring bot activity
    monitorBotActivity();

    // Load last active tab or default to first bot
    const lastActiveTab = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_TAB);
    const initialBotId = lastActiveTab || (state.bots.length > 0 ? state.bots[0].id : null);

    if (initialBotId) {
        switchBot(initialBotId);
    }

    // Hide loading overlay
    hideLoadingOverlay();
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ============================================
// Global Error Handling
// ============================================
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showNotification('An error occurred. Please refresh the page.', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showNotification('An error occurred. Please check console.', 'error');
});
