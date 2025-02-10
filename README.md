
# Currency Exchange Rate Tracker

A Flask web application that provides real-time currency exchange rates and historical rate charts using the ExchangeRate API.

## Features

- Real-time currency conversion
- Historical exchange rate charts
- Quick comparison with major currencies
- Responsive design
- Support for multiple currency pairs

## Technologies

- Python/Flask
- JavaScript/Chart.js
- ExchangeRate API
- HTML/CSS

## Setup

1. Set `EXCHANGERATE_API_KEY` in environment variables
2. Install dependencies: `pip install -r requirements.txt`
3. Run: `python main.py`

## API Endpoints

- `/api/exchange-rate/<from>/<to>/<amount>` - Get current exchange rate
- `/api/historical-rates/<from>/<to>` - Get historical rates
