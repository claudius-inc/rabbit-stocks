/**
 * Yahoo Finance API Module
 * Uses our Vercel serverless proxy to avoid CORS issues
 */

const StockAPI = {
  // Use relative URLs - works on same domain
  baseUrl: '',
  
  // Cache to reduce API calls
  cache: {},
  cacheTimeout: 60000, // 1 minute

  /**
   * Fetch multiple quotes at once
   */
  async fetchQuotes(symbols) {
    const results = {};
    
    try {
      const symbolList = symbols.join(',');
      const url = `${this.baseUrl}/api/quote?symbols=${encodeURIComponent(symbolList)}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      
      const json = await response.json();
      const quotes = json.quoteResponse?.result || [];
      
      quotes.forEach(q => {
        const change = q.regularMarketChange || 0;
        const changePercent = q.regularMarketChangePercent || 0;
        
        results[q.symbol] = {
          symbol: q.symbol,
          name: q.shortName || q.longName || q.symbol,
          price: q.regularMarketPrice,
          change: change,
          changePercent: changePercent,
          dayHigh: q.regularMarketDayHigh,
          dayLow: q.regularMarketDayLow,
          previousClose: q.regularMarketPreviousClose,
          open: q.regularMarketOpen,
          volume: q.regularMarketVolume,
          marketCap: q.marketCap,
          peRatio: q.trailingPE,
          priceToBook: q.priceToBook,
          roic: q.returnOnEquity, // Use ROE as proxy
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow,
          ytdReturn: q.ytdReturn,
          dividendDate: q.dividendDate ? new Date(q.dividendDate * 1000).toISOString().split('T')[0] : null
        };
        
        // Cache
        this.cache[q.symbol] = {
          data: results[q.symbol],
          timestamp: Date.now()
        };
      });
      
      return results;
    } catch (error) {
      console.error('Batch fetch failed:', error);
      return results;
    }
  },

  /**
   * Fetch quote data for a single symbol
   */
  async fetchQuote(symbol) {
    // Check cache
    const cached = this.cache[symbol];
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const results = await this.fetchQuotes([symbol]);
    return results[symbol] || null;
  },

  /**
   * Search for stocks/indices
   */
  async search(query) {
    try {
      const url = `${this.baseUrl}/api/search?q=${encodeURIComponent(query)}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Search failed');
      
      const json = await response.json();
      const quotes = json.quotes || [];
      
      return quotes
        .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'INDEX' || q.quoteType === 'ETF')
        .slice(0, 5)
        .map(q => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          type: q.quoteType === 'INDEX' ? 'index' : 'stock',
          exchange: q.exchange || q.exchDisp || ''
        }));
    } catch (error) {
      console.error('Error searching:', error);
      return [];
    }
  },

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = {};
  }
};
