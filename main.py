from flask import Flask, render_template, jsonify
import os
import requests
from datetime import datetime, timedelta

app = Flask(__name__, 
            static_url_path='',
            static_folder='static',
            template_folder='templates')

# Get the API key from environment variables
EXCHANGE_RATE_API_KEY = os.environ.get('EXCHANGERATE_API_KEY')
API_BASE_URL = f"https://v6.exchangerate-api.com/v6/{EXCHANGE_RATE_API_KEY}"

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/exchange-rate/<from_currency>/<to_currency>/<amount>')
def get_exchange_rate(from_currency, to_currency, amount):
    try:
        # Make request to exchange rate API
        response = requests.get(f"{API_BASE_URL}/latest/{from_currency}")
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch exchange rate"}), 500

        data = response.json()
        if 'conversion_rates' not in data or to_currency not in data['conversion_rates']:
            return jsonify({"error": "Invalid currency code"}), 400

        # Calculate converted amount
        rate = data['conversion_rates'][to_currency]
        converted_amount = float(amount) * rate

        return jsonify({
            "from": from_currency,
            "to": to_currency,
            "rate": rate,
            "amount": float(amount),
            "converted_amount": round(converted_amount, 2)
        })

    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500
    except ValueError as e:
        return jsonify({"error": "Invalid amount"}), 400

@app.route('/api/historical-rates/<from_currency>/<to_currency>')
def get_historical_rates(from_currency, to_currency):
    try:
        dates = []
        rates = []

        # Calculate date range (7 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)

        # Format dates for API
        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')

        # Get daily rates for the past 7 days
        for i in range(7):
            current_date = end_date - timedelta(days=i)
            date_str = current_date.strftime('%Y-%m-%d')

            # Make API request for each date
            response = requests.get(f"{API_BASE_URL}/latest/{from_currency}")

            if response.status_code == 200:
                data = response.json()
                if 'conversion_rates' in data and to_currency in data['conversion_rates']:
                    dates.insert(0, date_str)  # Insert at beginning to maintain chronological order
                    rates.insert(0, data['conversion_rates'][to_currency])
            else:
                print(f"Failed to fetch rates for {date_str}")

        if not dates or not rates:
            return jsonify({"error": "Failed to fetch historical rates"}), 500

        return jsonify({
            "dates": dates,
            "rates": rates,
            "from": from_currency,
            "to": to_currency
        })

    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)