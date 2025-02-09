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
        # Get rates for the last 7 days
        dates = []
        rates = []
        current_date = datetime.now()

        # ExchangeRate API provides daily historical data
        response = requests.get(f"{API_BASE_URL}/latest/{from_currency}")
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch exchange rates"}), 500

        data = response.json()
        if 'conversion_rates' not in data or to_currency not in data['conversion_rates']:
            return jsonify({"error": "Invalid currency code"}), 400

        rate = data['conversion_rates'][to_currency]

        # Add current rate
        dates.append(current_date.strftime('%Y-%m-%d'))
        rates.append(rate)

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