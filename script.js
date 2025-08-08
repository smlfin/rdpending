document.addEventListener('DOMContentLoaded', () => {
    // Replace with your Google Sheet CSV URL
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTxcZ5BVpz-jvCQze4msaEqv1uSUTS-Z-mulCPYUU9xvh0_8R4aDoMmOIMclJQbIeeVWAtA9qkyJ8Vv/pub?gid=717629748&single=true&output=csv';
    const searchInput = document.getElementById('agent-search');
    const suggestionsContainer = document.getElementById('autocomplete-suggestions');
    const resultsContainer = document.getElementById('results');
    const summaryContainer = document.getElementById('summary-container');
    let rdAccounts = [];
    let uniqueAgents = [];

    // Function to calculate if an account is due
    function isDue(account) {
        const startDate = new Date(account['Deposit Date']);
        const installmentAmount = parseFloat(account['Installment'].replace(/,/g, ''));
        const totalPaid = parseFloat(account['Paid Amt'].replace(/,/g, ''));

        if (isNaN(startDate) || isNaN(installmentAmount) || isNaN(totalPaid) || installmentAmount === 0) {
            return false;
        }

        const paidInstallments = Math.floor(totalPaid / installmentAmount);
        const nextDueDate = new Date(startDate);
        nextDueDate.setMonth(startDate.getMonth() + paidInstallments + 1);

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to the beginning of the day

        return today >= nextDueDate;
    }

    async function fetchCsvData() {
        try {
            const response = await fetch(csvUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch data from the provided URL.');
            }
            const csvText = await response.text();
            rdAccounts = parseCsv(csvText);
            uniqueAgents = [...new Set(rdAccounts.map(account => account['Agent']))].sort();
        } catch (error) {
            console.error('Error fetching CSV data:', error);
            resultsContainer.innerHTML = `<p class="error-message">Error loading data. Please check the CSV link.</p>`;
        }
    }

    function parseCsv(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(header => header.replace(/^"|"$/g, '').trim());
        const data = lines.slice(1).map(line => {
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const entry = {};
            headers.forEach((header, i) => {
                entry[header] = values[i] ? values[i].replace(/^"|"$/g, '').trim() : '';
            });
            return entry;
        });
        return data;
    }

    function displayResults(data, agentName) {
        summaryContainer.innerHTML = '';
        resultsContainer.innerHTML = '';

        if (data.length === 0) {
            resultsContainer.innerHTML = `<p class="no-results">No accounts found for ${agentName}.</p>`;
            return;
        }

        // Calculate summary based on the new isDue logic
        const pendingCases = data.filter(isDue).length;
        const totalPendingAmount = data.reduce((sum, account) => {
            if (isDue(account)) {
                const pendingAmt = parseFloat(account['Pending Amount'].replace(/,/g, ''));
                return sum + (isNaN(pendingAmt) ? 0 : pendingAmt);
            }
            return sum;
        }, 0);

        // Sort data by "Due No" in descending order (highest due number first)
        const sortedData = data.sort((a, b) => {
            const dueA = parseInt(a['Due No'], 10) || 0;
            const dueB = parseInt(b['Due No'], 10) || 0;
            return dueB - dueA;
        });

        // Display summary
        summaryContainer.innerHTML = `
            <div class="summary-card">
                <h2>Summary for ${agentName}</h2>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="value">${pendingCases}</span>
                        <span class="label">Pending Cases</span>
                    </div>
                    <div class="stat-item">
                        <span class="value">₹${totalPendingAmount.toLocaleString('en-IN')}</span>
                        <span class="label">Total Pending Amount</span>
                    </div>
                </div>
            </div>
        `;

        // Display individual account tiles
        sortedData.forEach(account => {
            const card = document.createElement('div');
            card.classList.add('account-card');
            card.innerHTML = `
                <h3>${account['Customer Name']}</h3>
                <p><strong>Start Date (Deposit Date):</strong> ${account['Deposit Date']}</p>
                <p><strong>Installment:</strong> ₹${account['Installment']}</p>
                <p><strong>Last Paid Date:</strong> ${account['Last Paid Date']}</p>
                <p><strong>Total Amount Paid:</strong> ₹${account['Paid Amt']}</p>
                <p><strong>Due Number:</strong> ${account['Due No']}</p>
                <p><strong>Pending Amount:</strong> ₹${account['Pending Amount']}</p>
            `;
            resultsContainer.appendChild(card);
        });
    }
    
    // ... [Rest of the JavaScript code for autocomplete and event listeners remains unchanged] ...
    
    let currentFocus = -1;

    function showSuggestions(searchTerm) {
        suggestionsContainer.innerHTML = '';
        currentFocus = -1;
        if (!searchTerm) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        const filteredAgents = uniqueAgents.filter(agent =>
            agent.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredAgents.length > 0) {
            suggestionsContainer.style.display = 'block';
            filteredAgents.forEach(agent => {
                const suggestionItem = document.createElement('div');
                suggestionItem.innerHTML = agent.replace(new RegExp(searchTerm, 'i'), `<strong>$&</strong>`);
                suggestionItem.addEventListener('click', () => {
                    searchInput.value = agent;
                    suggestionsContainer.style.display = 'none';
                    filterAndDisplayAccounts(agent);
                });
                suggestionsContainer.appendChild(suggestionItem);
            });
        } else {
            suggestionsContainer.style.display = 'none';
        }
    }

    function filterAndDisplayAccounts(name) {
        const filteredAccounts = rdAccounts.filter(account =>
            account['Agent'].toLowerCase() === name.toLowerCase()
        );
        displayResults(filteredAccounts, name);
    }
    
    // Event listeners
    searchInput.addEventListener('input', (e) => {
        showSuggestions(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
        const suggestionItems = suggestionsContainer.getElementsByTagName('div');
        if (e.key === 'ArrowDown') {
            currentFocus++;
            addActive(suggestionItems);
        } else if (e.key === 'ArrowUp') {
            currentFocus--;
            addActive(suggestionItems);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentFocus > -1) {
                if (suggestionItems[currentFocus]) {
                    suggestionItems[currentFocus].click();
                }
            } else {
                 filterAndDisplayAccounts(searchInput.value);
                 suggestionsContainer.style.display = 'none';
            }
        }
    });

    function addActive(items) {
        if (!items) return false;
        removeActive(items);
        if (currentFocus >= items.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (items.length - 1);
        if (items[currentFocus]) {
            items[currentFocus].classList.add('autocomplete-active');
        }
    }

    function removeActive(items) {
        for (let i = 0; i < items.length; i++) {
            items[i].classList.remove('autocomplete-active');
        }
    }

    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    });

    fetchCsvData();
});
