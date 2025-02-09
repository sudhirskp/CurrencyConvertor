const dropdowns = document.querySelectorAll(".dropdown select");
const btn = document.querySelector("form button");
const fromCurr = document.querySelector(".from select");
const toCurr = document.querySelector(".to select");
const msg = document.querySelector(".exchangerate");
const form = document.querySelector(".converter-form");

// Chart configuration
let rateChart = null;

// Initialize dropdowns with currency options
function initializeDropdowns() {
    if (typeof countryList === 'undefined') {
        console.error('countryList is not defined. Make sure countries.js is loaded.');
        return;
    }

    dropdowns.forEach(select => {
        for (const currCode in countryList) {
            const option = document.createElement("option");
            option.value = currCode;
            option.textContent = `${currCode}`;

            // Set default selections
            if (select.name === "from" && currCode === "USD") {
                option.selected = true;
            } else if (select.name === "to" && currCode === "INR") {
                option.selected = true;
            }

            select.appendChild(option);
        }

        // Add change event listener
        select.addEventListener("change", (evt) => {
            updateFlag(evt.target);
            updateExchangeRate();
            updateRateChart();
        });
    });
}

// Update flag based on selected currency
function updateFlag(element) {
    const currCode = element.value;
    const countryCode = countryList[currCode];

    if (!countryCode) {
        console.error(`Country code not found for currency: ${currCode}`);
        return;
    }

    const img = element.parentElement.querySelector("img");
    if (img) {
        img.src = `https://flagsapi.com/${countryCode}/flat/64.png`;
        img.alt = `${countryCode} flag`;
    } else {
        console.error("Flag image not found in the dropdown");
    }
}

// Initialize and update the exchange rate chart
async function updateRateChart() {
    try {
        const fromCurrency = fromCurr.value;
        const toCurrency = toCurr.value;

        const response = await fetch(`/api/historical-rates/${fromCurrency}/${toCurrency}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch historical rates');
        }

        const data = await response.json();

        // Destroy existing chart if it exists
        if (rateChart) {
            rateChart.destroy();
        }

        // Create new chart
        const ctx = document.getElementById('rateChart').getContext('2d');
        rateChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: [{
                    label: `${fromCurrency} to ${toCurrency} Exchange Rate`,
                    data: data.rates,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Exchange Rate Trend'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error updating rate chart:", error);
    }
}

// Fetch and calculate exchange rate
async function updateExchangeRate() {
    const amount = document.querySelector("#amount");
    let amountValue = parseFloat(amount.value) || 1;

    if (amountValue < 1) {
        amountValue = 1;
        amount.value = 1;
    }

    try {
        msg.textContent = "Fetching exchange rate...";
        const fromCurrency = fromCurr.value;
        const toCurrency = toCurr.value;

        // Call our backend API
        const response = await fetch(`/api/exchange-rate/${fromCurrency}/${toCurrency}/${amountValue}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch exchange rate');
        }

        const data = await response.json();
        msg.textContent = `${data.amount} ${data.from} = ${data.converted_amount} ${data.to}`;
    } catch (error) {
        console.error("Error updating exchange rate:", error);
        msg.textContent = "Error fetching exchange rate. Please try again.";
    }
}

// Event Listeners
form.addEventListener("submit", (evt) => {
    evt.preventDefault();
    updateExchangeRate();
});

// Initialize everything when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing currency converter...");
    initializeDropdowns();
    // Update exchange rate and chart for initial values
    updateExchangeRate();
    updateRateChart();
});