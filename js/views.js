/**
 * View Rendering Functions
 */

const Views = {
  /**
   * Render the main stock list
   */
  renderList(items, quotes) {
    const container = document.getElementById('stock-list');
    
    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-text">No items yet.<br>Tap "+ Add" to get started.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => {
      const quote = quotes[item.symbol] || {};
      const price = quote.price;
      const change = quote.changePercent;
      const changeClass = getChangeClass(change);
      
      return `
        <div class="stock-item" data-symbol="${item.symbol}">
          <div class="stock-row">
            <div>
              <span class="stock-symbol">${this.formatSymbol(item.symbol)}</span>
              <span class="type-badge ${item.type}">${item.type === 'index' ? 'IDX' : 'STK'}</span>
            </div>
            <div class="stock-price">${price ? formatNumber(price) : '...'}</div>
          </div>
          <div class="stock-row">
            <div class="stock-name">${item.name}</div>
            <div class="stock-change ${changeClass}">${change !== undefined ? formatPercent(change) : '...'}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Render detail view for a stock/index
   */
  renderDetail(item, quote) {
    const container = document.getElementById('detail-content');
    const changeClass = getChangeClass(quote?.changePercent);
    
    if (item.type === 'index') {
      container.innerHTML = this.renderIndexDetail(item, quote, changeClass);
    } else {
      container.innerHTML = this.renderStockDetail(item, quote, changeClass);
    }
  },

  /**
   * Render index detail
   */
  renderIndexDetail(item, quote, changeClass) {
    return `
      <div class="detail-header">
        <div class="detail-symbol">${this.formatSymbol(item.symbol)} <span class="type-badge index">INDEX</span></div>
        <div class="detail-name">${item.name}</div>
      </div>
      
      <div class="detail-price-row">
        <span class="detail-price">${quote?.price ? formatNumber(quote.price) : '—'}</span>
        <span class="detail-change ${changeClass}">${quote?.changePercent !== undefined ? formatPercent(quote.changePercent) : '—'}</span>
      </div>
      
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Day High</div>
          <div class="detail-value">${formatNumber(quote?.dayHigh)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Day Low</div>
          <div class="detail-value">${formatNumber(quote?.dayLow)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Open</div>
          <div class="detail-value">${formatNumber(quote?.open)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Prev Close</div>
          <div class="detail-value">${formatNumber(quote?.previousClose)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">52W High</div>
          <div class="detail-value">${formatNumber(quote?.fiftyTwoWeekHigh)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">52W Low</div>
          <div class="detail-value">${formatNumber(quote?.fiftyTwoWeekLow)}</div>
        </div>
        <div class="detail-item" style="grid-column: span 2;">
          <div class="detail-label">YTD Return</div>
          <div class="detail-value ${getChangeClass(quote?.ytdReturn)}">${quote?.ytdReturn !== undefined ? formatPercent(quote.ytdReturn) : '—'}</div>
        </div>
      </div>
      
      <button class="delete-btn" data-symbol="${item.symbol}">🗑️ Remove from list</button>
    `;
  },

  /**
   * Render stock detail
   */
  renderStockDetail(item, quote, changeClass) {
    return `
      <div class="detail-header">
        <div class="detail-symbol">${this.formatSymbol(item.symbol)} <span class="type-badge stock">STOCK</span></div>
        <div class="detail-name">${item.name}</div>
      </div>
      
      <div class="detail-price-row">
        <span class="detail-price">${quote?.price ? formatNumber(quote.price) : '—'}</span>
        <span class="detail-change ${changeClass}">${quote?.changePercent !== undefined ? formatPercent(quote.changePercent) : '—'}</span>
      </div>
      
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Market Cap</div>
          <div class="detail-value">${formatMarketCap(quote?.marketCap)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">P/E Ratio</div>
          <div class="detail-value">${quote?.peRatio ? formatNumber(quote.peRatio, 1) : '—'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">52W High</div>
          <div class="detail-value">${formatNumber(quote?.fiftyTwoWeekHigh)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">52W Low</div>
          <div class="detail-value">${formatNumber(quote?.fiftyTwoWeekLow)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Volume</div>
          <div class="detail-value">${formatVolume(quote?.volume)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">ROIC</div>
          <div class="detail-value">${quote?.roic ? formatPercent(quote.roic) : '—'}</div>
        </div>
        <div class="detail-item" style="grid-column: span 2;">
          <div class="detail-label">Next Dividend</div>
          <div class="detail-value">${formatDate(quote?.dividendDate)}</div>
        </div>
      </div>
      
      <button class="delete-btn" data-symbol="${item.symbol}">🗑️ Remove from list</button>
    `;
  },

  /**
   * Render search results
   */
  renderSearchResults(results, existingSymbols) {
    const container = document.getElementById('search-results');
    
    if (!results || results.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-text">No results found.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = results.map(item => {
      const alreadyAdded = existingSymbols.includes(item.symbol);
      return `
        <div class="search-result-item ${alreadyAdded ? 'disabled' : ''}" 
             data-symbol="${item.symbol}" 
             data-name="${item.name}"
             data-type="${item.type || 'stock'}">
          <div class="search-result-symbol">
            ${item.symbol}
            ${alreadyAdded ? '<span style="color:#888;font-size:11px;"> (added)</span>' : ''}
          </div>
          <div class="search-result-name">${item.name} · ${item.exchange || ''}</div>
        </div>
      `;
    }).join('');
  },

  /**
   * Format symbol for display (remove ^ prefix for indices)
   */
  formatSymbol(symbol) {
    return symbol.startsWith('^') ? symbol.substring(1) : symbol;
  },

  /**
   * Show a view
   */
  showView(viewId, title) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    document.getElementById('page-title').textContent = title || 'My Stocks';
    
    // Show/hide action bar
    const actionBar = document.getElementById('action-bar');
    if (viewId === 'list-view') {
      actionBar.classList.remove('hidden');
    } else {
      actionBar.classList.add('hidden');
    }
  },

  /**
   * Show/hide loading
   */
  setLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
      loading.classList.remove('hidden');
    } else {
      loading.classList.add('hidden');
    }
  },

  /**
   * Show confirm dialog
   */
  showConfirm(message) {
    return new Promise(resolve => {
      const dialog = document.getElementById('confirm-dialog');
      document.getElementById('confirm-message').textContent = message;
      dialog.classList.remove('hidden');

      const yesBtn = document.getElementById('confirm-yes');
      const noBtn = document.getElementById('confirm-no');

      const cleanup = (result) => {
        dialog.classList.add('hidden');
        yesBtn.onclick = null;
        noBtn.onclick = null;
        resolve(result);
      };

      yesBtn.onclick = () => cleanup(true);
      noBtn.onclick = () => cleanup(false);
    });
  }
};
