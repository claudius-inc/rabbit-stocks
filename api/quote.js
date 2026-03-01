export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { symbols } = req.query;
  
  if (!symbols) {
    return res.status(400).json({ error: 'Missing symbols parameter' });
  }

  try {
    const symbolList = symbols.split(',');
    const results = [];
    
    // Fetch each symbol using chart endpoint
    for (const symbol of symbolList) {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol.trim())}?interval=1d&range=1d`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const result = data.chart?.result?.[0];
        
        if (result) {
          const meta = result.meta || {};
          const quote = result.indicators?.quote?.[0] || {};
          
          const price = meta.regularMarketPrice;
          const prevClose = meta.chartPreviousClose || meta.previousClose;
          const change = price && prevClose ? price - prevClose : 0;
          const changePercent = prevClose ? (change / prevClose) * 100 : 0;
          
          results.push({
            symbol: meta.symbol || symbol,
            shortName: meta.shortName || meta.longName || symbol,
            longName: meta.longName || meta.shortName || symbol,
            regularMarketPrice: price,
            regularMarketChange: change,
            regularMarketChangePercent: changePercent,
            regularMarketDayHigh: meta.regularMarketDayHigh || quote.high?.[0],
            regularMarketDayLow: meta.regularMarketDayLow || quote.low?.[0],
            regularMarketPreviousClose: prevClose,
            regularMarketOpen: quote.open?.[0],
            regularMarketVolume: meta.regularMarketVolume,
            marketCap: null,
            trailingPE: null,
            fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: meta.fiftyTwoWeekLow
          });
        }
      }
    }
    
    res.status(200).json({ quoteResponse: { result: results } });
  } catch (error) {
    console.error('Quote error:', error);
    res.status(500).json({ error: error.message });
  }
}
