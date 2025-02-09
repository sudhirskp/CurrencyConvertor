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
        
        // Add period parameter to API call
        const periodParam = period || '1D';

        // Show loading state
        document.querySelector('.chart-container').style.opacity = '0.5';

        const response = await fetch(`/api/historical-rates/${fromCurrency}/${toCurrency}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch historical rates');
        }

        const data = await response.json();
        document.querySelector('.chart-container').style.opacity = '1';

        // Calculate percentage change
        const firstRate = data.rates[0];
        const lastRate = data.rates[data.rates.length - 1];
        const percentageChange = ((lastRate - firstRate) / firstRate * 100).toFixed(2);
        const isPositive = percentageChange >= 0;
        const changeColor = isPositive ? '#22c55e' : '#ef4444';

        // Add quick compare section
        updateQuickCompare(fromCurrency);

        // Destroy existing chart if it exists
        if (rateChart) {
            rateChart.destroy();
        }

        // Create new chart
        const ctx = document.getElementById('rateChart').getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        rateChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.dates,
                datasets: [{
                    label: `${fromCurrency}/${toCurrency}`,
                    data: data.rates,
                    backgroundColor: changeColor,
                    borderColor: changeColor,
                    borderWidth: 1,
                    borderRadius: 4,
                    maxBarThickness: 15,
                    minBarLength: 2,
                    categoryPercentage: 0.9,
                    barPercentage: 0.9
                }]
            },
            options: {
                layout: {
                    padding: {
                        right: 20
                    }
                },
                animation: {
                    duration: 0
                },
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index',
                    axis: 'x'
                },
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: [
                            `${fromCurrency}/${toCurrency}`,
                            `${isPositive ? '+' : ''}${percentageChange}%`
                        ],
                        align: 'start',
                        font: {
                            size: 16,
                            weight: 'normal'
                        },
                        color: [
                            '#e9ecef',
                            changeColor
                        ],
                        padding: {
                            bottom: 30
                        }
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
                                return [
                                    `Rate: ${value.toFixed(4)}`,
                                    `Change: ${sign}${change}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            maxRotation: 0,
                            color: '#6c757d',
                            font: {
                                size: 10,
                                family: 'monospace'
                            },
                            maxTicksLimit: 8
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
                                size: 10,
                                family: 'monospace'
                            },
                            callback: function(value) {
                                return value.toFixed(4);
                            },
                            count: 8
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
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
document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing currency converter...");
    initializeDropdowns();
    // Update exchange rate and chart for initial values
    updateExchangeRate();
    updateRateChart();
});