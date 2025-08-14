# Beta Visualization Dashboard

A comprehensive web application for analyzing and visualizing factor beta values over time. This dashboard allows users to upload CSV data containing beta values, visualize trends across different factor groups, and integrate S&P 500 price data for comparative analysis.

## Features

### Data Management
- **CSV Data Upload**: Upload CSV files containing date, sector, sector weight, and 88 individual beta values
- **Data Processing**: Automatic aggregation of S&P weighted beta values and sector-specific breakdowns
- **Weekly Averaging**: All data is processed into weekly averages for smoother trend visualization

### Factor Analysis
- **Factor Grouping**: 88 individual beta values are organized into 8 predefined categories:
  - **Value**: Value-oriented factors and strategies (13 betas)
  - **Growth**: Growth-focused investment factors (6 betas)
  - **Volatility**: Volatility and risk-related measures (19 betas)
  - **Commodities**: Commodity and natural resource exposure (8 betas)
  - **Fixed Income**: Bond and fixed income factors (13 betas)
  - **Index**: Broad market index exposures (11 betas)
  - **Macro**: Macroeconomic factors and indicators (7 betas)
  - **Sector**: Sector-specific exposures (10 betas)

### Visualization
- **Interactive Line Chart**: Responsive charts with hover tooltips and detailed data points
- **Multiple View Modes**:
  - Total S&P (Weighted): Overall S&P 500 beta values weighted by sector contribution
  - Sector Breakdown: Individual sector analysis with optional S&P weighting
- **Fullscreen Mode**: Expandable chart view for detailed analysis
- **Date Range Filtering**: Predefined ranges (6M, 1Y, 2Y, 3Y) or custom date selection

### Market Data Integration
- **S&P 500 Price Data**: Fetch and display historical S&P 500 closing prices
- **Normalized Comparison**: Price data is standardized to fit beta value scales
- **Real-time Integration**: Combine beta and price data for comparative analysis

### Analytics & Export
- **Statistics Panel**: Top 10 individual beta changes over the last 4 weeks
- **CSV Export**: Export filtered data with descriptive filenames
- **Change Analysis**: Percentage change calculations with category breakdowns

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

## Local Development

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd beta-visualization-dashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### 5. Preview Production Build

```bash
npm run preview
```

## CSV Data Format

Your CSV file should have the following structure:

```csv
Date,Sector,Sector_Weight,Beta1,Beta2,Beta3,...,Beta88
2024-01-01,Technology,0.25,0.123,0.456,0.789,...,0.321
2024-01-02,Healthcare,0.15,0.234,0.567,0.890,...,0.432
```

- **Date**: Date in YYYY-MM-DD format
- **Sector**: Sector name (e.g., Technology, Healthcare, Finance)
- **Sector_Weight**: Decimal weight of the sector in the S&P 500 (e.g., 0.25 for 25%)
- **Beta1-Beta88**: 88 individual beta values as decimal numbers

## Deployment

### Netlify Deployment

This application is configured for deployment on Netlify with the following features:

1. **Automatic Builds**: Connect your GitHub repository to Netlify for automatic deployments
2. **API Proxying**: The `public/_redirects` file configures Netlify to proxy Yahoo Finance API requests
3. **SPA Support**: Single Page Application routing is handled automatically

#### Deploy to Netlify from GitHub:

1. Push your code to a GitHub repository
2. Log in to [Netlify](https://netlify.com)
3. Click "New site from Git"
4. Connect your GitHub account and select your repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Click "Deploy site"

#### Manual Deployment:

```bash
# Build the project
npm run build

# Deploy the dist folder to Netlify
# You can drag and drop the dist folder to Netlify's deploy interface
```

### Environment Variables

No environment variables are required for basic functionality. The application uses:
- Yahoo Finance public API (via proxy)
- Client-side data processing
- Local file uploads

## Project Structure

```
src/
├── components/          # React components
│   ├── LineChart.tsx   # Main chart component
│   ├── GroupSelector.tsx # Factor group selection
│   ├── ViewModeSelector.tsx # View mode controls
│   ├── StatisticsPanel.tsx # Analytics display
│   └── DataUploader.tsx # File upload component
├── services/           # External API services
│   └── yahooFinance.ts # S&P 500 price fetching
├── types/              # TypeScript type definitions
│   └── beta.ts         # Data structure definitions
├── utils/              # Utility functions
│   ├── dataProcessor.ts # Data aggregation and processing
│   └── csvExporter.ts  # Export functionality
├── App.tsx             # Main application component
├── main.tsx           # Application entry point
└── index.css          # Global styles

public/
├── _redirects         # Netlify proxy configuration
└── index.html         # HTML template
```

## API Configuration

The application uses a proxy configuration to access Yahoo Finance data:

- **Development**: Vite proxy in `vite.config.ts`
- **Production**: Netlify redirects in `public/_redirects`

The proxy routes `/api/yahoo/*` requests to `https://query1.finance.yahoo.com/`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### S&P 500 Data Loading Issues

If S&P 500 price data fails to load:
1. Check browser console for network errors
2. Verify the `_redirects` file is properly configured
3. Ensure your deployment platform supports proxy redirects

### CSV Upload Issues

If CSV upload fails:
1. Verify your CSV has exactly 91 columns (Date + Sector + Sector_Weight + 88 betas)
2. Check that dates are in YYYY-MM-DD format
3. Ensure all beta values are numeric

### Chart Display Issues

If charts don't display properly:
1. Ensure at least one factor group is selected
2. Check that your data contains valid numeric values
3. Verify the date range includes available data

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Ensure your CSV data matches the expected format
4. Verify all dependencies are properly installed