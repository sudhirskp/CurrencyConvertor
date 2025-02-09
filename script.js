const BASE_URL = "https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies";

// DOM Elements
const dropdowns = document.querySelectorAll(".dropdown select");
const btn = document.querySelector("form button");
const fromCurr = document.querySelector(".from select");
const toCurr = document.querySelector(".to select");
const msg = document.querySelector(".exchangerate");
const form = document.querySelector(".converter-form");

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
            option.textContent = currCode;

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

    // Find the closest parent dropdown div and then find the img within it
    const dropdown = element.closest('.dropdown');
    const flagImg = dropdown.querySelector('img');

    if (flagImg) {
        flagImg.src = `https://flagsapi.com/${countryCode}/flat/64.png`;
        flagImg.alt = `${countryCode} flag`;
    } else {
        console.error("Flag image not found in the dropdown");
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

    const fromCurrency = fromCurr.value.toLowerCase();
    const toCurrency = toCurr.value.toLowerCase();

    try {
        msg.textContent = "Fetching exchange rate...";

        const response = await fetch(`${BASE_URL}/${fromCurrency}/${toCurrency}.json`);
        if (!response.ok) {
            throw new Error("Failed to fetch exchange rate");
        }

        const data = await response.json();
        const rate = data[toCurrency];

        if (!rate) {
            throw new Error("Invalid exchange rate received");
        }

        const finalAmount = (amountValue * rate).toFixed(2);
        msg.textContent = `${amountValue} ${fromCurr.value} = ${finalAmount} ${toCurr.value}`;
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
    console.log("Initializing dropdowns...");
    initializeDropdowns();
    // Update flags for initial selected values
    updateFlag(fromCurr);
    updateFlag(toCurr);
    updateExchangeRate();
});