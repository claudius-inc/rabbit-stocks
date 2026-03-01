export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { symbols } = req.query;
  
  if (!symbols) {
    return res.status(400).json({ error: 'Missing symbols parameter' });
  }

  try {
    // Step 1: Get cookies from Yahoo
    const cookieResponse = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const cookies = cookieResponse.headers.get('set-cookie') || '';
    
    // Step 2: Get crumb
    const crumbResponse = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookies
      }
    });
    const crumb = await crumbResponse.text();
    
    // Step 3: Fetch quotes with crumb
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&crumb=${encodeURIComponent(crumb)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookies
      }
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status}`);
    }
    
    const data = await response.json();
    const quotes = data.quoteResponse?.result || [];
    
    // Map to our format
    const results = quotes.map(q => ({
      symbol: q.symbol,
      shortName: q.shortName || q.longName || q.symbol,
      longName: q.longName || q.shortName || q.symbol,
      regularMarketPrice: q.regularMarketPrice,
      regularMarketChange: q.regularMarketChange,
      regularMarketChangePercent: q.regularMarketChangePercent,
      regularMarketDayHigh: q.regularMarketDayHigh,
      regularMarketDayLow: q.regularMarketDayLow,
      regularMarketPreviousClose: q.regularMarketPreviousClose,
      regularMarketOpen: q.regularMarketOpen,
      regularMarketVolume: q.regularMarketVolume,
      marketCap: q.marketCap,
      trailingPE: q.trailingPE,
      priceToBook: q.priceToBook,
      returnOnEquity: q.returnOnEquity, // May not always be available
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow
    }));
    
    res.status(200).json({ quoteResponse: { result: results } });
  } catch (error) {
    console.error('Quote error:', error);
    res.status(500).json({ error: error.message });
  }
}
