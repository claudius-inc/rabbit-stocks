/**
 * Default Data & Constants
 */

const DEFAULT_INDICES = [
  { symbol: '^GSPC', name: 'S&P 500', type: 'index' },
  { symbol: '^DJI', name: 'Dow Jones', type: 'index' },
  { symbol: '^STI', name: 'Straits Times Index', type: 'index' },
  { symbol: '^KS11', name: 'KOSPI', type: 'index' },
  { symbol: '^N225', name: 'Nikkei 225', type: 'index' }
];

const STORAGE_KEY = 'rabbit_stocks_watchlist';

// Yahoo Finance base URLs
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';
const YAHOO_QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';

// Format helpers
function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatPercent(num) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  const sign = num >= 0 ? '+' : '';
  return sign + num.toFixed(2) + '%';
}

function formatMarketCap(num) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  return formatNumber(num, 0);
}

function formatVolume(num) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return formatNumber(num, 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

function getChangeClass(change) {
  if (change > 0) return 'positive';
  if (change < 0) return 'negative';
  return 'neutral';
}
