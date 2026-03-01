/**
 * Yahoo Finance API Module
 * Direct fetch to Yahoo Finance endpoints
 */

const StockAPI = {
  // Cache to reduce API calls
  cache: {},
  cacheTimeout: 60000, // 1 minute

  /**
   * Fetch quote data for a symbol
   */
  async fetchQuote(symbol) {
    // Check cache
    const cached = this.cache[symbol];
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // Yahoo Finance chart endpoint
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      
      const json = await response.json();
      const result = json.chart?.result?.[0];
      
      if (!result) return null;

      const meta = result.meta || {};
      const quote = result.indicators?.quote?.[0] || {};
      
      const price = meta.regularMarketPrice || meta.previousClose;
      const prevClose = meta.chartPreviousClose || meta.previousClose;
      const change = price - prevClose;
      const changePercent = prevClose ? (change / prevClose) * 100 : 0;

      const data = {
        symbol: symbol,
        name: meta.shortName || meta.symbol || symbol,
        price: price,
        change: change,
        changePercent: changePercent,
        dayHigh: meta.regularMarketDayHigh || quote.high?.[0],
        dayLow: meta.regularMarketDayLow || quote.low?.[0],
        previousClose: prevClose,
        open: quote.open?.[0] || meta.regularMarketOpen,
        volume: meta.regularMarketVolume,
        marketCap: null, // Need separate call for this
        peRatio: null,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
        ytdReturn: null,
        roic: null,
        dividendDate: null
      };

      // Cache the result
      this.cache[symbol] = {
        data: data,
        timestamp: Date.now()
      };

      return data;
    } catch (error) {
      console.error('Error fetching quote for', symbol, error);
      return null;
    }
  },

  /**
   * Fetch additional quote details (market cap, P/E, etc.)
   */
  async fetchQuoteDetails(symbol) {
    try {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      
      const json = await response.json();
      const quote = json.quoteResponse?.result?.[0];
      
      if (!quote) return null;

      return {
        marketCap: quote.marketCap,
        peRatio: quote.trailingPE,
        forwardPE: quote.forwardPE,
        dividendDate: quote.dividendDate ? new Date(quote.dividendDate * 1000).toISOString().split('T')[0] : null,
        dividendYield: quote.dividendYield,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
        volume: quote.regularMarketVolume
      };
    } catch (error) {
      console.error('Error fetching quote details:', error);
      return null;
    }
  },

  /**
   * Fetch multiple quotes at once
   */
  async fetchQuotes(symbols) {
    const results = {};
    
    // Try batch endpoint first
    try {
      const symbolList = symbols.join(',');
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolList)}`;
      
      const response = await fetch(url);
      if (response.ok) {
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
            fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: q.fiftyTwoWeekLow,
            ytdReturn: q.ytdReturn,
            roic: null, // Not available in quote endpoint
            dividendDate: q.dividendDate ? new Date(q.dividendDate * 1000).toISOString().split('T')[0] : null
          };
          
          // Cache
          this.cache[q.symbol] = {
            data: results[q.symbol],
            timestamp: Date.now()
          };
        });
        
        return results;
      }
    } catch (error) {
      console.error('Batch fetch failed, falling back to individual:', error);
    }
    
    // Fallback: fetch individually
    for (const symbol of symbols) {
      const quote = await this.fetchQuote(symbol);
      if (quote) {
        results[symbol] = quote;
      }
    }
    
    return results;
  },

  /**
   * Search for stocks/indices
   */
  async search(query) {
    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=6&newsCount=0&listsCount=0`;
      
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
