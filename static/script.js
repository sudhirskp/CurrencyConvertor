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
async function updateRateChart(period = '1D') {
    try {
        const fromCurrency = fromCurr.value;
        const toCurrency = toCurr.value;

        document.querySelector('.chart-container').style.opacity = '0.5';

        const response = await fetch(`/api/historical-rates/${fromCurrency}/${toCurrency}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Failed to fetch rates');
        if (!data.rates || !data.dates) throw new Error('Invalid data format');

        document.querySelector('.chart-container').style.opacity = '1';

        // Destroy existing chart
        if (rateChart) rateChart.destroy();

        const ctx = document.getElementById('rateChart').getContext('2d');
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(91, 192, 222, 0.2)');
        gradient.addColorStop(1, 'rgba(91, 192, 222, 0)');

        rateChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: [{
                    label: `Exchange Rate`,
                    data: data.rates,
                    backgroundColor: gradient,
                    borderColor: '#5bc0de',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(33, 37, 41, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            label: function(context) {
                                return `Rate: ${context.parsed.y.toFixed(4)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#6c757d'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#6c757d',
                            callback: function(value) {
                                return value.toFixed(4);
                            }
                        }
                    }
                }
            }
        });

        // Update quick compare
        updateQuickCompare(fromCurrency);
        
    } catch (error) {
        console.error("Error updating rate chart:", error);
        document.querySelector('.chart-container').style.opacity = '1';
    }
}

// Add quick compare functionality
async function updateQuickCompare(baseCurrency) {
    const compareContainer = document.getElementById('quickCompare');
    const commonPairs = ['EUR', 'JPY', 'GBP', 'CAD'];

    try {
        const pairPromises = commonPairs.map(async (currency) => {
            if (currency === baseCurrency) return null;
            const response = await fetch(`/api/exchange-rate/${baseCurrency}/${currency}/1`);
            if (!response.ok) return null;
            const data = await response.json();
            return { currency, rate: data.rate, change: ((data.rate - 1) * 100).toFixed(2) };
        });

        const pairs = (await Promise.all(pairPromises)).filter(pair => pair !== null);

        const pairElements = pairs.map(pair => {
            const isPositive = parseFloat(pair.change) >= 0;
            return `
                <div class="quick-compare-item">
                    <div class="pair">${baseCurrency}${pair.currency}</div>
                    <div class="rate">${pair.rate.toFixed(4)}</div>
                    <div class="change ${isPositive ? 'positive' : 'negative'}">
                        ${isPositive ? '+' : ''}${pair.change}%
                    </div>
                </div>
            `;
        });

        compareContainer.innerHTML = pairElements.join('');
    } catch (error) {
        console.error("Error updating quick compare:", error);
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

// Handle time period selection
function handleTimePeriodClick(period) {
    // Remove active class from all buttons
    document.querySelectorAll('.time-period-selector .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Update chart with new period
    updateRateChart(period);
}

// Event Listeners
form.addEventListener("submit", (evt) => {
    evt.preventDefault();
    updateExchangeRate();
});

// Add event listeners to time period buttons
document.querySelectorAll('.time-period-selector .btn').forEach(button => {
    button.addEventListener('click', (event) => {
        handleTimePeriodClick(event.target.dataset.period);
    });
});

// Initialize everything when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Initializing currency converter...");
    initializeDropdowns();
    await updateExchangeRate();
    await updateRateChart('1D');
    // Set 1D as active by default
    document.querySelector('[data-period="1D"]').classList.add('active');
});