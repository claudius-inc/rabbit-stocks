# Rabbit R1 Stock Tracker

A simple, senior-friendly stock and index tracker for the Rabbit R1 device.

## Features

- **Track Indices**: S&P 500, Dow Jones, STI, KOSPI, Nikkei 225 (pre-loaded)
- **Track Stocks**: Add any stock from global exchanges via ticker or name search
- **Real-time Data**: Prices, changes, and key metrics from Yahoo Finance
- **Easy Navigation**: Scroll wheel or touch to browse, tap to expand details
- **Light Mode**: High contrast, large text, designed for readability
- **Persistent Storage**: Your watchlist is saved on the device

## Screen Size

Optimized for R1's 240×282 pixel display.

## Navigation

### Scroll Wheel
- **Scroll Up/Down**: Navigate through list items
- **Side Button Click**: Expand selected item / Go back

### Touch
- **Tap item**: View details
- **Tap "← Back"**: Return to list
- **Tap "+ Add"**: Add new stock/index
- **Tap "🔄 Refresh"**: Refresh prices
- **Tap "☰"**: Open menu

## Data Displayed

### For Indices
- Price & daily change %
- Day high / low
- Open / Previous close
- 52-week high / low
- YTD return

### For Stocks
- Price & daily change %
- Market cap
- P/E ratio
- 52-week high / low
- Volume
- ROIC (Return on Invested Capital)
- Next dividend date

## Menu Options

- **📊 Indices**: Show only indices
- **📈 Stocks**: Show only stocks  
- **📋 All**: Show everything
- **🗑️ Clear All**: Reset to default indices

## Technical Details

### Files
```
rabbit-stocks/
├── index.html          # Main HTML
├── css/
│   └── styles.css      # Light theme styles
├── js/
│   ├── data.js         # Constants & defaults
│   ├── api.js          # Yahoo Finance via LLM
│   ├── views.js        # UI rendering
│   └── app.js          # Main logic
└── README.md
```

### Storage
Uses R1 Creations SDK `window.creationStorage.plain` for persistent watchlist storage.

### Data Fetching
Uses R1 LLM bridge (`PluginMessageHandler.postMessage` with `useLLM: true`) to fetch Yahoo Finance data, avoiding CORS issues.

## Deployment

1. Host the files on any static web server
2. Create a QR code pointing to the URL using the R1 QR generator
3. Scan with your R1 to add as a Creation

## Design Considerations

Built for users in their 60s:
- Large, readable text (14-24px)
- High contrast colors
- Big touch targets (min 40px)
- Clear visual feedback
- Confirmation dialogs for destructive actions
- Simple, uncluttered interface
- Light mode only (easier on the eyes)

## License

MIT
