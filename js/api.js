/**
 * Yahoo Finance API Module
 * Uses R1 Creations SDK LLM for data fetching (avoids CORS issues)
 */

const StockAPI = {
  // Cache to reduce API calls
  cache: {},
  cacheTimeout: 60000, // 1 minute

  /**
   * Fetch quote data for a symbol using LLM bridge
   */
  async fetchQuote(symbol) {
    // Check cache
    const cached = this.cache[symbol];
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // Use R1 LLM to fetch data (handles CORS)
      const response = await this.llmFetch(`
        Fetch the current stock/index data for ${symbol} from Yahoo Finance.
        Return ONLY valid JSON in this exact format:
        {
          "symbol": "${symbol}",
          "name": "Company/Index Name",
          "price": 123.45,
          "change": 1.23,
          "changePercent": 0.95,
          "dayHigh": 125.00,
          "dayLow": 122.00,
          "previousClose": 122.22,
          "open": 122.50,
          "volume": 12345678,
          "marketCap": 1234567890,
          "peRatio": 25.5,
          "fiftyTwoWeekHigh": 150.00,
          "fiftyTwoWeekLow": 100.00,
          "ytdReturn": 12.5,
          "roic": 15.2,
          "dividendDate": "2026-03-15"
        }
        For indices, marketCap, peRatio, roic, and dividendDate should be null.
        Use null for any unavailable data.
      `);

      if (response) {
        // Cache the result
        this.cache[symbol] = {
          data: response,
          timestamp: Date.now()
        };
        return response;
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
    }

    return null;
  },

  /**
   * Fetch multiple quotes at once
   */
  async fetchQuotes(symbols) {
    const results = {};
    
    // Batch into groups of 5 to avoid overloading
    const batches = [];
    for (let i = 0; i < symbols.length; i += 5) {
      batches.push(symbols.slice(i, i + 5));
    }

    for (const batch of batches) {
      const promises = batch.map(s => this.fetchQuote(s));
      const batchResults = await Promise.all(promises);
      batch.forEach((symbol, idx) => {
        if (batchResults[idx]) {
          results[symbol] = batchResults[idx];
        }
      });
    }

    return results;
  },

  /**
   * Search for stocks/indices
   */
  async search(query) {
    try {
      const response = await this.llmFetch(`
        Search Yahoo Finance for stocks or indices matching "${query}".
        Return ONLY valid JSON array with up to 5 results:
        [
          {
            "symbol": "AAPL",
            "name": "Apple Inc.",
            "type": "stock",
            "exchange": "NASDAQ"
          }
        ]
        Include both stocks and indices. For indices, type should be "index".
      `);

      return response || [];
    } catch (error) {
      console.error('Error searching:', error);
      return [];
    }
  },

  /**
   * LLM fetch helper - uses R1 Creations SDK
   */
  llmFetch(prompt) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 15000);

      // Set up response handler
      const originalHandler = window.onPluginMessage;
      window.onPluginMessage = function(data) {
        clearTimeout(timeout);
        window.onPluginMessage = originalHandler;

        try {
          let responseData = null;
          
          // Response can be in data.data or data.message
          if (data.data) {
            responseData = typeof data.data === 'string' 
              ? JSON.parse(data.data) 
              : data.data;
          } else if (data.message) {
            // Try to extract JSON from message
            const jsonMatch = data.message.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
            if (jsonMatch) {
              responseData = JSON.parse(jsonMatch[0]);
            }
          }
          
          resolve(responseData);
        } catch (e) {
          console.error('Parse error:', e, data);
          resolve(null);
        }
      };

      // Send request via SDK
      if (typeof PluginMessageHandler !== 'undefined') {
        PluginMessageHandler.postMessage(JSON.stringify({
          message: prompt,
          useLLM: true
        }));
      } else {
        // Fallback for testing outside R1
        clearTimeout(timeout);
        window.onPluginMessage = originalHandler;
        resolve(this.getMockData(prompt));
      }
    });
  },

  /**
   * Mock data for testing outside R1
   */
  getMockData(prompt) {
    if (prompt.includes('Search')) {
      return [
        { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ' }
      ];
    }
    
    // Extract symbol from prompt
    const symbolMatch = prompt.match(/for ([A-Z^0-9.]+)/);
    const symbol = symbolMatch ? symbolMatch[1] : 'UNKNOWN';
    
    return {
      symbol: symbol,
      name: symbol.startsWith('^') ? 'Index' : 'Company',
      price: 100 + Math.random() * 50,
      change: (Math.random() - 0.5) * 5,
      changePercent: (Math.random() - 0.5) * 3,
      dayHigh: 155,
      dayLow: 145,
      previousClose: 150,
      open: 151,
      volume: 50000000,
      marketCap: symbol.startsWith('^') ? null : 2500000000000,
      peRatio: symbol.startsWith('^') ? null : 28.5,
      fiftyTwoWeekHigh: 180,
      fiftyTwoWeekLow: 120,
      ytdReturn: 8.5,
      roic: symbol.startsWith('^') ? null : 25.3,
      dividendDate: symbol.startsWith('^') ? null : '2026-03-15'
    };
  },

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = {};
  }
};
