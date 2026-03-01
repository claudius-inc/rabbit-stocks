/**
 * Layout Renderers for Different Views
 * Designed for 240x282 pixel R1 screen
 */

const Layouts = {
  current: 'compact', // compact, cards, ticker, dashboard

  /**
   * COMPACT LIST - Multiple items, minimal info each
   * Best for: Quick scanning of many stocks
   */
  renderCompact(items, quotes) {
    return items.map(item => {
      const q = quotes[item.symbol] || {};
      const changeClass = getChangeClass(q.changePercent);
      const arrow = q.changePercent > 0 ? '▲' : q.changePercent < 0 ? '▼' : '•';
      
      return `
        <div class="stock-item compact" data-symbol="${item.symbol}">
          <div class="compact-left">
            <span class="compact-symbol">${this.formatSymbol(item.symbol)}</span>
            <span class="compact-name">${item.name.substring(0, 15)}</span>
          </div>
          <div class="compact-right ${changeClass}">
            <span class="compact-price">${q.price ? formatNumber(q.price) : '...'}</span>
            <span class="compact-change">${arrow} ${q.changePercent !== undefined ? Math.abs(q.changePercent).toFixed(1) + '%' : ''}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * CARD VIEW - One stock at a time, large display
   * Best for: Detailed focus, senior-friendly
   */
  renderCards(items, quotes, currentIndex = 0) {
    if (items.length === 0) return this.renderEmpty();
    
    const item = items[currentIndex];
    const q = quotes[item.symbol] || {};
    const changeClass = getChangeClass(q.changePercent);
    const arrow = q.changePercent > 0 ? '▲' : q.changePercent < 0 ? '▼' : '';
    
    return `
      <div class="card-view" data-symbol="${item.symbol}" data-index="${currentIndex}">
        <div class="card-nav">
          <button class="card-nav-btn" data-dir="-1" ${currentIndex === 0 ? 'disabled' : ''}>◀</button>
          <span class="card-counter">${currentIndex + 1} / ${items.length}</span>
          <button class="card-nav-btn" data-dir="1" ${currentIndex === items.length - 1 ? 'disabled' : ''}>▶</button>
        </div>
        
        <div class="card-header">
          <div class="card-symbol">${this.formatSymbol(item.symbol)}</div>
          <div class="card-name">${item.name}</div>
        </div>
        
        <div class="card-price-section ${changeClass}">
          <div class="card-price">${q.price ? formatNumber(q.price) : '—'}</div>
          <div class="card-change">
            ${arrow} ${q.change !== undefined ? formatNumber(Math.abs(q.change)) : ''} 
            (${q.changePercent !== undefined ? formatPercent(q.changePercent) : '—'})
          </div>
        </div>
        
        <div class="card-details">
          <div class="card-detail-row">
            <span>Day Range</span>
            <span>${formatNumber(q.dayLow)} — ${formatNumber(q.dayHigh)}</span>
          </div>
          <div class="card-detail-row">
            <span>52W Range</span>
            <span>${formatNumber(q.fiftyTwoWeekLow)} — ${formatNumber(q.fiftyTwoWeekHigh)}</span>
          </div>
          <div class="card-detail-row">
            <span>Volume</span>
            <span>${formatVolume(q.volume)}</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * TICKER TAPE - Horizontal scrolling marquee
   * Best for: At-a-glance monitoring, ambient display
   */
  renderTicker(items, quotes) {
    const tickerItems = items.map(item => {
      const q = quotes[item.symbol] || {};
      const changeClass = getChangeClass(q.changePercent);
      const arrow = q.changePercent > 0 ? '▲' : q.changePercent < 0 ? '▼' : '';
      
      return `
        <span class="ticker-item ${changeClass}">
          <strong>${this.formatSymbol(item.symbol)}</strong>
          ${q.price ? formatNumber(q.price) : '...'} 
          ${arrow}${q.changePercent !== undefined ? Math.abs(q.changePercent).toFixed(1) + '%' : ''}
        </span>
      `;
    }).join('<span class="ticker-sep">•</span>');

    // Show top movers below ticker
    const sorted = [...items]
      .filter(i => quotes[i.symbol]?.changePercent !== undefined)
      .sort((a, b) => Math.abs(quotes[b.symbol].changePercent) - Math.abs(quotes[a.symbol].changePercent))
      .slice(0, 4);

    const movers = sorted.map(item => {
      const q = quotes[item.symbol];
      const changeClass = getChangeClass(q.changePercent);
      return `
        <div class="mover-item ${changeClass}" data-symbol="${item.symbol}">
          <div class="mover-symbol">${this.formatSymbol(item.symbol)}</div>
          <div class="mover-price">${formatNumber(q.price)}</div>
          <div class="mover-change">${formatPercent(q.changePercent)}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="ticker-container">
        <div class="ticker-tape">
          <div class="ticker-content">${tickerItems}${tickerItems}</div>
        </div>
      </div>
      <div class="ticker-label">TOP MOVERS</div>
      <div class="movers-grid">${movers}</div>
    `;
  },

  /**
   * DASHBOARD - Grid overview with visual indicators
   * Best for: Quick portfolio health check
   */
  renderDashboard(items, quotes) {
    // Calculate summary stats
    let gainers = 0, losers = 0, unchanged = 0;
    let totalChange = 0;
    
    items.forEach(item => {
      const q = quotes[item.symbol];
      if (q?.changePercent > 0) gainers++;
      else if (q?.changePercent < 0) losers++;
      else unchanged++;
      if (q?.changePercent) totalChange += q.changePercent;
    });

    const avgChange = items.length ? totalChange / items.length : 0;
    const avgChangeClass = getChangeClass(avgChange);

    // Top 6 items as tiles
    const tiles = items.slice(0, 6).map(item => {
      const q = quotes[item.symbol] || {};
      const changeClass = getChangeClass(q.changePercent);
      const bgClass = q.changePercent > 0 ? 'tile-green' : q.changePercent < 0 ? 'tile-red' : 'tile-gray';
      
      return `
        <div class="dash-tile ${bgClass}" data-symbol="${item.symbol}">
          <div class="tile-symbol">${this.formatSymbol(item.symbol)}</div>
          <div class="tile-price">${q.price ? formatNumber(q.price, 0) : '—'}</div>
          <div class="tile-change ${changeClass}">${q.changePercent !== undefined ? formatPercent(q.changePercent) : ''}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="dashboard">
        <div class="dash-summary">
          <div class="dash-stat">
            <span class="stat-value positive">${gainers}</span>
            <span class="stat-label">▲ Up</span>
          </div>
          <div class="dash-stat">
            <span class="stat-value negative">${losers}</span>
            <span class="stat-label">▼ Down</span>
          </div>
          <div class="dash-stat">
            <span class="stat-value ${avgChangeClass}">${formatPercent(avgChange)}</span>
            <span class="stat-label">Avg</span>
          </div>
        </div>
        <div class="dash-grid">${tiles}</div>
      </div>
    `;
  },

  /**
   * FOCUS MODE - Single item, maximum readability
   * Best for: Low vision, quick glance
   */
  renderFocus(items, quotes, currentIndex = 0) {
    if (items.length === 0) return this.renderEmpty();
    
    const item = items[currentIndex];
    const q = quotes[item.symbol] || {};
    const changeClass = getChangeClass(q.changePercent);
    const arrow = q.changePercent > 0 ? '▲' : q.changePercent < 0 ? '▼' : '';
    const bgClass = q.changePercent > 0 ? 'focus-bg-green' : q.changePercent < 0 ? 'focus-bg-red' : '';

    return `
      <div class="focus-view ${bgClass}" data-symbol="${item.symbol}" data-index="${currentIndex}">
        <div class="focus-nav">
          <span class="focus-counter">${currentIndex + 1}/${items.length}</span>
          <span class="focus-hint">Scroll to change</span>
        </div>
        
        <div class="focus-symbol">${this.formatSymbol(item.symbol)}</div>
        
        <div class="focus-price">${q.price ? formatNumber(q.price) : '—'}</div>
        
        <div class="focus-change ${changeClass}">
          ${arrow} ${q.changePercent !== undefined ? formatPercent(q.changePercent) : '—'}
        </div>
        
        <div class="focus-name">${item.name}</div>
      </div>
    `;
  },

  /**
   * Helper: Format symbol
   */
  formatSymbol(symbol) {
    return symbol.startsWith('^') ? symbol.substring(1) : symbol;
  },

  /**
   * Helper: Empty state
   */
  renderEmpty() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-text">No items yet.<br>Tap "+ Add" to start.</div>
      </div>
    `;
  },

  /**
   * Get layout display name
   */
  getLayoutName(layout) {
    const names = {
      compact: 'Compact List',
      cards: 'Card View',
      ticker: 'Ticker Tape',
      dashboard: 'Dashboard',
      focus: 'Focus Mode'
    };
    return names[layout] || layout;
  }
};
