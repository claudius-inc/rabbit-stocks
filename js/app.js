/**
 * Stocks App - Main Application
 * For Rabbit R1 (240x282 screen)
 */

const App = {
  watchlist: [],
  quotes: {},
  currentView: 'home',
  
  // Storage keys
  WATCHLIST_KEY: 'r1stocks_watchlist_v2',
  
  // Auto-refresh
  refreshInterval: null,
  REFRESH_MS: 60000, // 1 minute

  /**
   * Initialize
   */
  async init() {
    console.log('Initializing app...');
    
    // Insert icons
    this.insertIcons();
    
    // Load data
    await this.loadWatchlist();
    
    // Setup
    this.setupEventListeners();
    this.setupHardwareEvents();
    
    // Initial render
    this.showView('home');
    await this.refreshData();
    
    console.log('Initialized with', this.watchlist.length, 'items');
  },

  /**
   * Insert SVG icons into DOM
   */
  insertIcons() {
    document.getElementById('nav-icon-home').innerHTML = Icons.home;
    document.getElementById('nav-icon-add').innerHTML = Icons.plus;
    document.getElementById('nav-icon-refresh').innerHTML = Icons.refresh;
    
    // Back buttons
    document.getElementById('add-back-btn').innerHTML = Icons.back;
    document.getElementById('detail-back-btn').innerHTML = Icons.back;
    
    // Search button
    document.querySelector('.search-icon').innerHTML = Icons.search;
    
    // Dialog buttons
    document.getElementById('confirm-yes').innerHTML = Icons.check + ' Yes';
    document.getElementById('confirm-no').innerHTML = Icons.x + ' No';
  },

  /**
   * Load watchlist from storage
   */
  async loadWatchlist() {
    try {
      // Try R1 creation storage first
      if (typeof window.creationStorage !== 'undefined') {
        const stored = await window.creationStorage.plain.getItem(this.WATCHLIST_KEY);
        if (stored) {
          this.watchlist = JSON.parse(atob(stored));
          console.log('Loaded from creationStorage:', this.watchlist.length);
          return;
        }
      }
    } catch (e) {
      console.log('creationStorage not available');
    }
    
    // Try localStorage as fallback
    try {
      const stored = localStorage.getItem(this.WATCHLIST_KEY);
      if (stored) {
        this.watchlist = JSON.parse(stored);
        console.log('Loaded from localStorage:', this.watchlist.length);
        return;
      }
    } catch (e) {
      console.log('localStorage not available');
    }
    
    // Use defaults
    console.log('Using default watchlist');
    this.watchlist = [...DEFAULT_INDICES];
    await this.saveWatchlist();
  },

  /**
   * Save watchlist to storage
   */
  async saveWatchlist() {
    // Try R1 creation storage
    try {
      if (typeof window.creationStorage !== 'undefined') {
        await window.creationStorage.plain.setItem(
          this.WATCHLIST_KEY,
          btoa(JSON.stringify(this.watchlist))
        );
        console.log('Saved to creationStorage');
      }
    } catch (e) {
      console.log('creationStorage save failed');
    }
    
    // Also save to localStorage as backup
    try {
      localStorage.setItem(this.WATCHLIST_KEY, JSON.stringify(this.watchlist));
      console.log('Saved to localStorage');
    } catch (e) {}
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Bottom nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        const action = btn.dataset.action;
        
        if (action === 'refresh') {
          this.refreshData();
        } else if (view) {
          this.showView(view);
        }
      });
    });

    // Back buttons
    document.getElementById('add-back-btn').addEventListener('click', () => this.showView('home'));
    document.getElementById('detail-back-btn').addEventListener('click', () => this.showView('home'));

    // Search
    document.getElementById('search-btn').addEventListener('click', () => this.handleSearch());
    document.getElementById('search-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });

    // Search results (delegated)
    document.getElementById('search-results').addEventListener('click', (e) => {
      const item = e.target.closest('.search-result');
      if (item && !item.classList.contains('added')) {
        this.addToWatchlist({
          symbol: item.dataset.symbol,
          name: item.dataset.name,
          type: item.dataset.type
        });
      }
    });

    // Watchlist manage (delegated)
    document.getElementById('watchlist-manage').addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.remove-btn');
      if (removeBtn) {
        this.removeFromWatchlist(removeBtn.dataset.symbol);
      }
    });

    // Stock list clicks (delegated)
    document.getElementById('stocks-list').addEventListener('click', (e) => {
      const item = e.target.closest('.stock-item');
      if (item) {
        this.showDetail(item.dataset.symbol);
      }
    });

    // Ticker clicks (delegated)
    document.getElementById('ticker-track').addEventListener('click', (e) => {
      const item = e.target.closest('.ticker-item');
      if (item) {
        this.showDetail(item.dataset.symbol);
      }
    });

    // Pin button (delegated on detail-content)
    document.getElementById('detail-content').addEventListener('click', (e) => {
      const pinBtn = e.target.closest('.pin-btn');
      if (pinBtn) {
        this.togglePin(pinBtn.dataset.symbol);
      }
    });

    // Visibility change - start/stop auto-refresh
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.refreshData();
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    });
    
    // Start auto-refresh on load
    this.startAutoRefresh();
  },
  
  /**
   * Start auto-refresh interval (only when visible)
   */
  startAutoRefresh() {
    this.stopAutoRefresh(); // Clear any existing
    this.refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('Auto-refreshing...');
        this.refreshData();
      }
    }, this.REFRESH_MS);
  },
  
  /**
   * Stop auto-refresh interval
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  },

  /**
   * Setup R1 hardware events
   */
  setupHardwareEvents() {
    window.addEventListener('scrollUp', () => this.handleScroll(-1));
    window.addEventListener('scrollDown', () => this.handleScroll(1));
    window.addEventListener('sideClick', () => this.handleSideClick());
  },

  handleScroll(dir) {
    const stocksList = document.getElementById('stocks-list');
    if (stocksList && this.currentView === 'home') {
      stocksList.scrollBy({ top: dir * 50, behavior: 'smooth' });
    }
  },

  handleSideClick() {
    if (this.currentView !== 'home') {
      this.showView('home');
    }
  },

  /**
   * Show view
   */
  showView(viewId) {
    this.currentView = viewId;
    
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    
    // Show target view
    const view = document.getElementById(viewId + '-view');
    if (view) {
      view.classList.add('active');
    }
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });
    
    // View-specific setup
    if (viewId === 'home') {
      this.renderHome();
    } else if (viewId === 'add') {
      this.renderWatchlistManage();
      document.getElementById('search-input').value = '';
      document.getElementById('search-results').innerHTML = '';
    }
  },

  /**
   * Refresh data
   */
  async refreshData() {
    this.showLoading(true);
    
    try {
      const symbols = this.watchlist.map(i => i.symbol);
      if (symbols.length > 0) {
        this.quotes = await StockAPI.fetchQuotes(symbols);
      }
      this.renderHome();
    } catch (e) {
      console.error('Refresh failed:', e);
    }
    
    this.showLoading(false);
  },

  /**
   * Render home view (ticker + stocks)
   */
  renderHome() {
    const indices = this.watchlist.filter(i => i.type === 'index');
    const stocks = this.watchlist.filter(i => i.type !== 'index');
    
    // Render ticker
    this.renderTicker(indices);
    
    // Render stocks list
    this.renderStocksList(stocks);
  },

  /**
   * Render indices ticker
   */
  renderTicker(indices) {
    const track = document.getElementById('ticker-track');
    
    if (indices.length === 0) {
      track.innerHTML = '<span class="ticker-item"><span class="ticker-symbol">No indices</span></span>';
      return;
    }
    
    const items = indices.map(item => {
      const q = this.quotes[item.symbol] || {};
      const changeClass = this.getChangeClass(q.changePercent);
      const arrow = q.changePercent > 0 ? Icons.trendingUp : 
                    q.changePercent < 0 ? Icons.trendingDown : '';
      
      return `
        <div class="ticker-item" data-symbol="${item.symbol}">
          <span class="ticker-symbol">${this.formatSymbol(item.symbol)}</span>
          <span class="ticker-price">${q.price ? formatNumber(q.price, 0) : '...'}</span>
          <span class="ticker-change ${changeClass}">
            ${arrow}
            ${q.changePercent !== undefined ? (q.changePercent >= 0 ? '+' : '') + q.changePercent.toFixed(1) + '%' : ''}
          </span>
        </div>
      `;
    }).join('');
    
    // Duplicate for seamless scroll
    track.innerHTML = items + items;
  },

  /**
   * Render stocks list
   */
  renderStocksList(stocks) {
    const container = document.getElementById('stocks-list');
    
    if (stocks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${Icons.plus}</div>
          <div class="empty-text">No stocks yet. Tap Add to start.</div>
        </div>
      `;
      return;
    }
    
    // Sort: pinned first, then by original order
    const sorted = [...stocks].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
    
    container.innerHTML = sorted.map(item => {
      const q = this.quotes[item.symbol] || {};
      const changeClass = this.getChangeClass(q.changePercent);
      const arrow = q.changePercent > 0 ? Icons.trendingUp : 
                    q.changePercent < 0 ? Icons.trendingDown : '';
      const pinIcon = item.pinned ? Icons.pinFilled : '';
      
      return `
        <div class="stock-item ${item.pinned ? 'pinned' : ''}" data-symbol="${item.symbol}">
          <div class="stock-left">
            <span class="stock-symbol">${pinIcon}${this.formatSymbol(item.symbol)}</span>
            <span class="stock-name">${item.name}</span>
          </div>
          <div class="stock-right">
            <div class="stock-price">${q.price ? formatNumber(q.price) : '...'}</div>
            <div class="stock-change ${changeClass}">
              ${arrow}
              ${q.changePercent !== undefined ? formatPercent(q.changePercent) : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },
  
  /**
   * Toggle pin status for a stock
   */
  async togglePin(symbol) {
    const item = this.watchlist.find(i => i.symbol === symbol);
    if (item) {
      item.pinned = !item.pinned;
      await this.saveWatchlist();
      this.renderHome();
    }
  },

  /**
   * Handle search
   */
  async handleSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    
    this.showLoading(true);
    
    try {
      const results = await StockAPI.search(query);
      this.renderSearchResults(results);
    } catch (e) {
      console.error('Search failed:', e);
    }
    
    this.showLoading(false);
  },

  /**
   * Render search results
   */
  renderSearchResults(results) {
    const container = document.getElementById('search-results');
    const existingSymbols = this.watchlist.map(i => i.symbol);
    
    if (results.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-text">No results found</div></div>';
      return;
    }
    
    container.innerHTML = results.map(item => {
      const added = existingSymbols.includes(item.symbol);
      return `
        <div class="search-result ${added ? 'added' : ''}" 
             data-symbol="${item.symbol}" 
             data-name="${item.name}"
             data-type="${item.type}">
          <div class="result-info">
            <div class="result-symbol">${item.symbol}</div>
            <div class="result-name">${item.name}</div>
          </div>
          <div class="result-action ${added ? 'added' : ''}">
            ${added ? Icons.check : Icons.plus}
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Render watchlist manage
   */
  renderWatchlistManage() {
    const container = document.getElementById('watchlist-manage');
    
    container.innerHTML = this.watchlist.map(item => `
      <div class="watchlist-item">
        <div class="watchlist-item-info">
          <span class="watchlist-symbol">${this.formatSymbol(item.symbol)}</span>
          <span class="watchlist-name">${item.name}</span>
        </div>
        <button class="remove-btn" data-symbol="${item.symbol}">
          ${Icons.x}
        </button>
      </div>
    `).join('');
  },

  /**
   * Add to watchlist
   */
  async addToWatchlist(item) {
    if (this.watchlist.find(i => i.symbol === item.symbol)) return;
    
    this.watchlist.push(item);
    await this.saveWatchlist();
    
    // Fetch quote for new item
    const quote = await StockAPI.fetchQuote(item.symbol);
    if (quote) this.quotes[item.symbol] = quote;
    
    // Re-render
    this.renderSearchResults(await StockAPI.search(document.getElementById('search-input').value));
    this.renderWatchlistManage();
  },

  /**
   * Remove from watchlist
   */
  async removeFromWatchlist(symbol) {
    this.watchlist = this.watchlist.filter(i => i.symbol !== symbol);
    delete this.quotes[symbol];
    await this.saveWatchlist();
    this.renderWatchlistManage();
  },

  /**
   * Show detail
   */
  showDetail(symbol) {
    const item = this.watchlist.find(i => i.symbol === symbol);
    if (!item) return;
    
    const q = this.quotes[symbol] || {};
    const changeClass = this.getChangeClass(q.changePercent);
    const arrow = q.changePercent > 0 ? Icons.trendingUp : 
                  q.changePercent < 0 ? Icons.trendingDown : '';
    const isPinned = item.pinned;
    
    document.getElementById('detail-title').textContent = this.formatSymbol(symbol);
    
    document.getElementById('detail-content').innerHTML = `
      <div class="detail-header ${changeClass}">
        <div class="detail-left">
          <div class="detail-symbol">${this.formatSymbol(symbol)}</div>
          <div class="detail-name">${item.name}</div>
        </div>
        <div class="detail-right">
          <div class="detail-price">${q.price ? formatNumber(q.price) : '—'}</div>
          <div class="detail-change ${changeClass}">
            ${arrow}
            ${q.changePercent !== undefined ? formatPercent(q.changePercent) : '—'}
          </div>
        </div>
      </div>
      
      <button class="pin-btn ${isPinned ? 'pinned' : ''}" data-symbol="${symbol}">
        ${isPinned ? Icons.pinFilled : Icons.pin}
        <span>${isPinned ? 'Unpin' : 'Pin to Top'}</span>
      </button>
      
      <div class="detail-price-row">
        <div class="detail-price-cell">
          <div class="label">Open</div>
          <div class="value">${formatNumber(q.open)}</div>
        </div>
        <div class="detail-price-cell">
          <div class="label">High</div>
          <div class="value">${formatNumber(q.dayHigh)}</div>
        </div>
        <div class="detail-price-cell">
          <div class="label">Low</div>
          <div class="value">${formatNumber(q.dayLow)}</div>
        </div>
        <div class="detail-price-cell">
          <div class="label">Close</div>
          <div class="value">${formatNumber(q.previousClose)}</div>
        </div>
      </div>
      
      <div class="detail-grid">
        <div class="detail-cell">
          <div class="detail-label">52W Low</div>
          <div class="detail-value">${formatNumber(q.fiftyTwoWeekLow)}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Volume</div>
          <div class="detail-value">${formatVolume(q.volume)}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Mkt Cap</div>
          <div class="detail-value">${formatMarketCap(q.marketCap)}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">P/E</div>
          <div class="detail-value">${q.peRatio ? formatNumber(q.peRatio, 1) : '—'}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">P/B</div>
          <div class="detail-value">${q.priceToBook ? formatNumber(q.priceToBook, 1) : '—'}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">ROIC</div>
          <div class="detail-value">${q.roic ? formatPercent(q.roic) : '—'}</div>
        </div>
      </div>
    `;
    
    this.showView('detail');
  },

  /**
   * Reset to defaults
   */
  async resetToDefaults() {
    const confirmed = await this.showConfirm('Reset to default indices?');
    if (!confirmed) return;
    
    this.watchlist = [...DEFAULT_INDICES];
    this.quotes = {};
    await this.saveWatchlist();
    await this.refreshData();
    this.showView('home');
  },

  /**
   * Show confirm dialog
   */
  showConfirm(message) {
    return new Promise(resolve => {
      const dialog = document.getElementById('confirm-dialog');
      document.getElementById('confirm-message').textContent = message;
      dialog.classList.remove('hidden');
      
      const yes = document.getElementById('confirm-yes');
      const no = document.getElementById('confirm-no');
      
      const cleanup = (result) => {
        dialog.classList.add('hidden');
        yes.onclick = null;
        no.onclick = null;
        resolve(result);
      };
      
      yes.onclick = () => cleanup(true);
      no.onclick = () => cleanup(false);
    });
  },

  /**
   * Show/hide loading
   */
  showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
  },

  /**
   * Helpers
   */
  formatSymbol(symbol) {
    return symbol.startsWith('^') ? symbol.substring(1) : symbol;
  },
  
  getChangeClass(change) {
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return 'neutral';
  }
};

// Start
document.addEventListener('DOMContentLoaded', () => App.init());
