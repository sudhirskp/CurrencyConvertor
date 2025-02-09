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
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(91, 192, 222, 0.3)');
        gradient.addColorStop(1, 'rgba(91, 192, 222, 0)');

        rateChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: [{
                    label: `${fromCurrency} to ${toCurrency} Exchange Rate`,
                    data: data.rates,
                    borderColor: '#5bc0de',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#5bc0de',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Exchange Rate Trend',
                        align: 'start',
                        font: {
                            size: 16,
                            weight: 'normal'
                        },
                        padding: {
                            bottom: 30
                        },
                        color: '#e9ecef'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(33, 37, 41, 0.9)',
                        titleColor: '#e9ecef',
                        bodyColor: '#e9ecef',
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                let value = context.parsed.y;
                                let prevValue = context.parsed.y;
                                if (context.dataIndex > 0) {
                                    prevValue = context.dataset.data[context.dataIndex - 1];
                                }
                                let change = ((value - prevValue) / prevValue * 100).toFixed(2);
                                let sign = change > 0 ? '+' : '';
                                return `${value.toFixed(4)} (${sign}${change}%)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            maxRotation: 0,
                            color: '#6c757d',
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        position: 'right',
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#6c757d',
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return value.toFixed(4);
                            }
                        }
                    }
                }
            }
        });

        // Add percentage change to the graph title
        const firstRate = data.rates[0];
        const lastRate = data.rates[data.rates.length - 1];
        const percentageChange = ((lastRate - firstRate) / firstRate * 100).toFixed(2);
        const sign = percentageChange > 0 ? '+' : '';

        rateChart.options.plugins.title.text = [
            'Exchange Rate Trend',
            `${sign}${percentageChange}%`
        ];
        rateChart.update();
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