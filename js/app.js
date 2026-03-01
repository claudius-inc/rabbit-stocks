/**
 * Main Application Logic
 */

const App = {
  watchlist: [],
  quotes: {},
  filter: 'all', // 'all', 'indices', 'stocks'
  selectedItem: null,
  selectedIndex: 0, // For scroll wheel navigation

  /**
   * Initialize the app
   */
  async init() {
    console.log('Initializing Stocks app...');
    
    // Load saved watchlist or use defaults
    await this.loadWatchlist();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up R1 hardware events
    this.setupHardwareEvents();
    
    // Set up wake event
    this.setupWakeEvent();
    
    // Initial render and data fetch
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
    
    // Use defaults if nothing saved
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
   * Set up DOM event listeners
   */
  setupEventListeners() {
    // Menu button
    document.getElementById('menu-btn').addEventListener('click', () => this.toggleMenu());
    document.getElementById('menu-overlay').addEventListener('click', () => this.closeMenu());

    // Menu items
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => this.handleMenuAction(item.dataset.action));
    });

    // Action bar buttons
    document.getElementById('refresh-btn').addEventListener('click', () => this.refreshData());
    document.getElementById('add-btn').addEventListener('click', () => this.showAddView());

    // Back buttons
    document.getElementById('back-btn').addEventListener('click', () => this.showListView());
    document.getElementById('add-back-btn').addEventListener('click', () => this.showListView());

    // Stock list click
    document.getElementById('stock-list').addEventListener('click', (e) => {
      const item = e.target.closest('.stock-item');
      if (item) {
        this.showDetail(item.dataset.symbol);
      }
    });

    // Detail view delete button
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

    // Search results click
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
   * Set up R1 hardware events (scroll wheel, side button)
   */
  setupHardwareEvents() {
    // Scroll up - previous item
    window.addEventListener('scrollUp', () => {
      this.navigateList(-1);
    });

    // Scroll down - next item
    window.addEventListener('scrollDown', () => {
      this.navigateList(1);
    });

    // Side button click - select/expand current item
    window.addEventListener('sideClick', () => {
      const currentView = document.querySelector('.view.active').id;
      if (currentView === 'list-view') {
        const items = document.querySelectorAll('.stock-item');
        if (items[this.selectedIndex]) {
          this.showDetail(items[this.selectedIndex].dataset.symbol);
        }
      } else if (currentView === 'detail-view') {
        this.showListView();
      }
    });
  },

  /**
   * Set up wake event for auto-refresh
   */
  setupWakeEvent() {
    // R1 visibility change (wake from sleep)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('Device woke up, refreshing data...');
        this.refreshData();
      }
    });
  },

  /**
   * Navigate list with scroll wheel
   */
  navigateList(direction) {
    const items = document.querySelectorAll('.stock-item');
    if (items.length === 0) return;

    // Remove previous selection
    items.forEach(i => i.classList.remove('selected'));

    // Update index
    this.selectedIndex += direction;
    if (this.selectedIndex < 0) this.selectedIndex = 0;
    if (this.selectedIndex >= items.length) this.selectedIndex = items.length - 1;

    // Select new item
    const selected = items[this.selectedIndex];
    selected.classList.add('selected');
    selected.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  /**
   * Refresh data from API
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
   * Render list based on current filter
   */
  renderList() {
    let items = this.watchlist;
    
    if (this.filter === 'indices') {
      items = items.filter(i => i.type === 'index');
    } else if (this.filter === 'stocks') {
      items = items.filter(i => i.type === 'stock');
    }
    
    Views.renderList(items, this.quotes);
    this.selectedIndex = 0;
  },

  /**
   * Show list view
   */
  showListView() {
    Views.showView('list-view', 'My Stocks');
    this.renderList();
  },

  /**
   * Show detail view for a symbol
   */
  showDetail(symbol) {
    const item = this.watchlist.find(i => i.symbol === symbol);
    if (!item) return;

    this.selectedItem = item;
    const quote = this.quotes[symbol];
    
    Views.renderDetail(item, quote);
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
      const existingSymbols = this.watchlist.map(i => i.symbol);
      Views.renderSearchResults(results, existingSymbols);
    } catch (e) {
      console.error('Search failed:', e);
    }
    
    Views.setLoading(false);
  },

  /**
   * Add item to watchlist
   */
  async addItem(item) {
    // Check if already exists
    if (this.watchlist.find(i => i.symbol === item.symbol)) {
      return;
    }

    this.watchlist.push(item);
    await this.saveWatchlist();
    
    // Fetch data for new item
    Views.setLoading(true);
    const quote = await StockAPI.fetchQuote(item.symbol);
    if (quote) {
      this.quotes[item.symbol] = quote;
    }
    Views.setLoading(false);
    
    // Go back to list
    this.showListView();
  },

  /**
   * Remove item from watchlist
   */
  async removeItem(symbol) {
    const confirmed = await Views.showConfirm('Remove this from your list?');
    if (!confirmed) return;

    this.watchlist = this.watchlist.filter(i => i.symbol !== symbol);
    delete this.quotes[symbol];
    await this.saveWatchlist();
    
    this.showListView();
  },

  /**
   * Toggle menu drawer
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
   * Close menu drawer
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
        this.renderList();
        break;
        
      case 'stocks':
        this.filter = 'stocks';
        document.getElementById('page-title').textContent = 'Stocks';
        this.renderList();
        break;
        
      case 'all':
        this.filter = 'all';
        document.getElementById('page-title').textContent = 'My Stocks';
        this.renderList();
        break;
        
      case 'clear':
        const confirmed = await Views.showConfirm('Remove all items and reset to defaults?');
        if (confirmed) {
          this.watchlist = [...DEFAULT_INDICES];
          this.quotes = {};
          await this.saveWatchlist();
          StockAPI.clearCache();
          await this.refreshData();
        }
        break;
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
