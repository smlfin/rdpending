document.addEventListener('DOMContentLoaded', () => {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTxcZ5BVpz-jvCQze4msaEqv1uSUTS-Z-mulCPYUU9xvh0_8R4aDoMmOIMclJQbIeeVWAtA9qkyJ8Vv/pub?gid=717629748&single=true&output=csv';
    const loginPage = document.getElementById('login-page');
    const resultsPage = document.getElementById('results-page');
    const rdNumberInput = document.getElementById('rd-number-input');
    const viewAccountsBtn = document.getElementById('view-accounts-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const resultsContainer = document.getElementById('results');
    const summaryContainer = document.getElementById('summary-container');
    const loginMessage = document.getElementById('login-message');
    const container = document.querySelector('.container');
    let rdAccounts = [];
    const lastUpdatedDate = '15/08/2025';

    // Add the "Data Updated" message to the home page
    const dateMessage = document.createElement('p');
    dateMessage.classList.add('updated-date-message');
    dateMessage.textContent = `Data Updated up to ${lastUpdatedDate}`;
    container.insertBefore(dateMessage, container.firstChild);

    async function fetchCsvData() {
        try {
            const response = await fetch(csvUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch data from the provided URL.');
            }
            const csvText = await response.text();
            rdAccounts = parseCsv(csvText);
        } catch (error) {
            console.error('Error fetching CSV data:', error);
            loginMessage.textContent = 'Error loading data. Please check the CSV link.';
            loginMessage.classList.add('error-message');
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

        const totalAccounts = data.length;
        const pendingAccounts = data.filter(account => parseFloat(account['Pending Amount'].replace(/,/g, '')) > 0);
        const pendingCases = pendingAccounts.length;

        const totalPendingAmount = pendingAccounts.reduce((sum, account) => {
            const pendingAmt = parseFloat(account['Pending Amount'].replace(/,/g, ''));
            return sum + (isNaN(pendingAmt) ? 0 : pendingAmt);
        }, 0);

        const sortedData = data.sort((a, b) => {
            const dueA = parseInt(a['Due No'], 10) || 0;
            const dueB = parseInt(b['Due No'], 10) || 0;
            return dueB - dueA;
        });

        summaryContainer.innerHTML = `
            <div class="summary-card">
                <h2>Summary for ${agentName}</h2>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="value">${totalAccounts}</span>
                        <span class="label">Total Accounts</span>
                    </div>
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

        sortedData.forEach(account => {
            const card = document.createElement('div');
            card.classList.add('account-card');

            let pendingTag = '';
            if (parseFloat(account['Pending Amount'].replace(/,/g, '')) > 0) {
                card.classList.add('pending-account');
                pendingTag = `<span class="pending-tag">Pending Due</span>`;
            }

            card.innerHTML = `
                ${pendingTag}
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

    function findAndDisplayAgentAccounts() {
        const rdNumber = rdNumberInput.value.trim().toLowerCase();
        loginMessage.textContent = '';
        loginMessage.classList.remove('error-message');

        if (rdNumber === '') {
            loginMessage.textContent = 'Please enter a valid RD Number.';
            loginMessage.classList.add('error-message');
            return;
        }

        const singleAccount = rdAccounts.find(account => account['Deposit No'].toLowerCase() === rdNumber);

        if (singleAccount) {
            const agentName = singleAccount['Agent'];
            const filteredAccounts = rdAccounts.filter(account => account['Agent'] === agentName);
            displayResults(filteredAccounts, agentName);
            loginPage.classList.add('hidden');
            resultsPage.classList.remove('hidden');
        } else {
            loginMessage.textContent = 'RD Number not found. Please try again.';
            loginMessage.classList.add('error-message');
        }
    }

    function handleLogout() {
        rdNumberInput.value = '';
        summaryContainer.innerHTML = '';
        resultsContainer.innerHTML = '';
        loginMessage.textContent = '';

        resultsPage.classList.add('hidden');
        loginPage.classList.remove('hidden');
    }

    viewAccountsBtn.addEventListener('click', findAndDisplayAgentAccounts);
    rdNumberInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            findAndDisplayAgentAccounts();
        }
    });
    logoutBtn.addEventListener('click', handleLogout);

    fetchCsvData();
});
