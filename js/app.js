/**
 * Main Application Logic
 */

const App = {
  watchlist: [],
  quotes: {},
  filter: 'all',
  layout: 'compact', // compact, cards, ticker, dashboard, focus
  selectedItem: null,
  currentIndex: 0, // For card/focus navigation

  /**
   * Initialize the app
   */
  async init() {
    console.log('Initializing Stocks app...');
    
    await this.loadWatchlist();
    await this.loadLayout();
    this.setupEventListeners();
    this.setupHardwareEvents();
    this.setupWakeEvent();
    
    this.renderList();
    await this.refreshData();
    
    console.log('App initialized with', this.watchlist.length, 'items');
  },

  /**
   * Load watchlist from storage
   */
  async loadWatchlist() {
    try {
      if (typeof window.creationStorage !== 'undefined') {
        const stored = await window.creationStorage.plain.getItem(STORAGE_KEY);
        if (stored) {
          this.watchlist = JSON.parse(atob(stored));
          return;
        }
      }
    } catch (e) {
      console.log('No saved watchlist, using defaults');
    }
    this.watchlist = [...DEFAULT_INDICES];
    await this.saveWatchlist();
  },

  /**
   * Save watchlist to storage
   */
  async saveWatchlist() {
    try {
      if (typeof window.creationStorage !== 'undefined') {
        await window.creationStorage.plain.setItem(
          STORAGE_KEY,
          btoa(JSON.stringify(this.watchlist))
        );
      }
    } catch (e) {
      console.error('Failed to save watchlist:', e);
    }
  },

  /**
   * Load layout preference
   */
  async loadLayout() {
    try {
      if (typeof window.creationStorage !== 'undefined') {
        const layout = await window.creationStorage.plain.getItem('stocks_layout');
        if (layout) {
          this.layout = atob(layout);
          this.updateLayoutMenu();
        }
      }
    } catch (e) {}
  },

  /**
   * Save layout preference
   */
  async saveLayout() {
    try {
      if (typeof window.creationStorage !== 'undefined') {
        await window.creationStorage.plain.setItem('stocks_layout', btoa(this.layout));
      }
    } catch (e) {}
  },

  /**
   * Set up DOM event listeners
   */
  setupEventListeners() {
    // Menu
    document.getElementById('menu-btn').addEventListener('click', () => this.toggleMenu());
    document.getElementById('menu-overlay').addEventListener('click', () => this.closeMenu());

    // Menu items
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => this.handleMenuAction(item.dataset.action));
    });

    // Layout options
    document.querySelectorAll('.layout-option').forEach(btn => {
      btn.addEventListener('click', () => this.setLayout(btn.dataset.layout));
    });

    // Action bar
    document.getElementById('refresh-btn').addEventListener('click', () => this.refreshData());
    document.getElementById('add-btn').addEventListener('click', () => this.showAddView());

    // Back buttons
    document.getElementById('back-btn').addEventListener('click', () => this.showListView());
    document.getElementById('add-back-btn').addEventListener('click', () => this.showListView());

    // Stock list clicks (delegated)
    document.getElementById('stock-list').addEventListener('click', (e) => {
      // Card navigation
      const navBtn = e.target.closest('.card-nav-btn');
      if (navBtn && !navBtn.disabled) {
        const dir = parseInt(navBtn.dataset.dir);
        this.navigateCards(dir);
        return;
      }
      
      // Mover item click
      const mover = e.target.closest('.mover-item');
      if (mover) {
        this.showDetail(mover.dataset.symbol);
        return;
      }
      
      // Tile click
      const tile = e.target.closest('.dash-tile');
      if (tile) {
        this.showDetail(tile.dataset.symbol);
        return;
      }
      
      // Regular item click
      const item = e.target.closest('.stock-item, .card-view, .focus-view');
      if (item) {
        this.showDetail(item.dataset.symbol);
      }
    });

    // Detail view delete
    document.getElementById('detail-content').addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn')) {
        this.removeItem(e.target.dataset.symbol);
      }
    });

    // Search
    document.getElementById('search-btn').addEventListener('click', () => this.handleSearch());
    document.getElementById('search-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });

    // Search results
    document.getElementById('search-results').addEventListener('click', (e) => {
      const item = e.target.closest('.search-result-item');
      if (item && !item.classList.contains('disabled')) {
        this.addItem({
          symbol: item.dataset.symbol,
          name: item.dataset.name,
          type: item.dataset.type
        });
      }
    });
  },

  /**
   * Set up R1 hardware events
   */
  setupHardwareEvents() {
    window.addEventListener('scrollUp', () => {
      if (this.layout === 'cards' || this.layout === 'focus') {
        this.navigateCards(-1);
      } else {
        this.navigateList(-1);
      }
    });

    window.addEventListener('scrollDown', () => {
      if (this.layout === 'cards' || this.layout === 'focus') {
        this.navigateCards(1);
      } else {
        this.navigateList(1);
      }
    });

    window.addEventListener('sideClick', () => {
      const currentView = document.querySelector('.view.active').id;
      if (currentView === 'list-view') {
        const items = this.getFilteredItems();
        if (items[this.currentIndex]) {
          this.showDetail(items[this.currentIndex].symbol);
        }
      } else if (currentView === 'detail-view') {
        this.showListView();
      }
    });
  },

  /**
   * Set up wake event
   */
  setupWakeEvent() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.refreshData();
      }
    });
  },

  /**
   * Navigate list (compact layout)
   */
  navigateList(direction) {
    const items = document.querySelectorAll('.stock-item.compact');
    if (items.length === 0) return;

    items.forEach(i => i.classList.remove('selected'));
    
    this.currentIndex += direction;
    if (this.currentIndex < 0) this.currentIndex = 0;
    if (this.currentIndex >= items.length) this.currentIndex = items.length - 1;

    const selected = items[this.currentIndex];
    selected.classList.add('selected');
    selected.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  /**
   * Navigate cards/focus
   */
  navigateCards(direction) {
    const items = this.getFilteredItems();
    this.currentIndex += direction;
    if (this.currentIndex < 0) this.currentIndex = 0;
    if (this.currentIndex >= items.length) this.currentIndex = items.length - 1;
    this.renderList();
  },

  /**
   * Refresh data
   */
  async refreshData() {
    Views.setLoading(true);
    
    try {
      const symbols = this.watchlist.map(i => i.symbol);
      this.quotes = await StockAPI.fetchQuotes(symbols);
      this.renderList();
    } catch (e) {
      console.error('Refresh failed:', e);
    }
    
    Views.setLoading(false);
  },

  /**
   * Get filtered items
   */
  getFilteredItems() {
    let items = this.watchlist;
    if (this.filter === 'indices') {
      items = items.filter(i => i.type === 'index');
    } else if (this.filter === 'stocks') {
      items = items.filter(i => i.type === 'stock');
    }
    return items;
  },

  /**
   * Render list with current layout
   */
  renderList() {
    const container = document.getElementById('stock-list');
    const items = this.getFilteredItems();
    
    if (items.length === 0) {
      container.innerHTML = Layouts.renderEmpty();
      return;
    }

    // Ensure currentIndex is valid
    if (this.currentIndex >= items.length) {
      this.currentIndex = items.length - 1;
    }

    switch (this.layout) {
      case 'compact':
        container.innerHTML = Layouts.renderCompact(items, this.quotes);
        break;
      case 'cards':
        container.innerHTML = Layouts.renderCards(items, this.quotes, this.currentIndex);
        break;
      case 'ticker':
        container.innerHTML = Layouts.renderTicker(items, this.quotes);
        break;
      case 'dashboard':
        container.innerHTML = Layouts.renderDashboard(items, this.quotes);
        break;
      case 'focus':
        container.innerHTML = Layouts.renderFocus(items, this.quotes, this.currentIndex);
        break;
      default:
        container.innerHTML = Layouts.renderCompact(items, this.quotes);
    }
  },

  /**
   * Set layout
   */
  setLayout(layout) {
    this.layout = layout;
    this.currentIndex = 0;
    this.updateLayoutMenu();
    this.renderList();
    this.saveLayout();
    this.closeMenu();
  },

  /**
   * Update layout menu active state
   */
  updateLayoutMenu() {
    document.querySelectorAll('.layout-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layout === this.layout);
    });
  },

  /**
   * Show list view
   */
  showListView() {
    Views.showView('list-view', 'My Stocks');
    this.renderList();
  },

  /**
   * Show detail view
   */
  showDetail(symbol) {
    const item = this.watchlist.find(i => i.symbol === symbol);
    if (!item) return;

    this.selectedItem = item;
    Views.renderDetail(item, this.quotes[symbol]);
    Views.showView('detail-view', item.name);
  },

  /**
   * Show add view
   */
  showAddView() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
    Views.showView('add-view', 'Add Stock');
    document.getElementById('search-input').focus();
  },

  /**
   * Handle search
   */
  async handleSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;

    Views.setLoading(true);
    
    try {
      const results = await StockAPI.search(query);
      const existing = this.watchlist.map(i => i.symbol);
      Views.renderSearchResults(results, existing);
    } catch (e) {
      console.error('Search failed:', e);
    }
    
    Views.setLoading(false);
  },

  /**
   * Add item
   */
  async addItem(item) {
    if (this.watchlist.find(i => i.symbol === item.symbol)) return;

    this.watchlist.push(item);
    await this.saveWatchlist();
    
    Views.setLoading(true);
    const quote = await StockAPI.fetchQuote(item.symbol);
    if (quote) this.quotes[item.symbol] = quote;
    Views.setLoading(false);
    
    this.showListView();
  },

  /**
   * Remove item
   */
  async removeItem(symbol) {
    const confirmed = await Views.showConfirm('Remove from list?');
    if (!confirmed) return;

    this.watchlist = this.watchlist.filter(i => i.symbol !== symbol);
    delete this.quotes[symbol];
    await this.saveWatchlist();
    
    this.showListView();
  },

  /**
   * Toggle menu
   */
  toggleMenu() {
    const drawer = document.getElementById('menu-drawer');
    const overlay = document.getElementById('menu-overlay');
    
    if (drawer.classList.contains('hidden')) {
      drawer.classList.remove('hidden');
      overlay.classList.remove('hidden');
      setTimeout(() => drawer.classList.add('visible'), 10);
    } else {
      this.closeMenu();
    }
  },

  /**
   * Close menu
   */
  closeMenu() {
    const drawer = document.getElementById('menu-drawer');
    const overlay = document.getElementById('menu-overlay');
    
    drawer.classList.remove('visible');
    setTimeout(() => {
      drawer.classList.add('hidden');
      overlay.classList.add('hidden');
    }, 200);
  },

  /**
   * Handle menu action
   */
  async handleMenuAction(action) {
    this.closeMenu();
    
    switch (action) {
      case 'indices':
        this.filter = 'indices';
        document.getElementById('page-title').textContent = 'Indices';
        this.currentIndex = 0;
        this.renderList();
        break;
        
      case 'stocks':
        this.filter = 'stocks';
        document.getElementById('page-title').textContent = 'Stocks';
        this.currentIndex = 0;
        this.renderList();
        break;
        
      case 'all':
        this.filter = 'all';
        document.getElementById('page-title').textContent = 'My Stocks';
        this.currentIndex = 0;
        this.renderList();
        break;
        
      case 'clear':
        const confirmed = await Views.showConfirm('Reset to defaults?');
        if (confirmed) {
          this.watchlist = [...DEFAULT_INDICES];
          this.quotes = {};
          this.currentIndex = 0;
          await this.saveWatchlist();
          StockAPI.clearCache();
          await this.refreshData();
        }
        break;
    }
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => App.init());
