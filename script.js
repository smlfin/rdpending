document.addEventListener('DOMContentLoaded', () => {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/18K6X1q30z7zvi6zrOrrSWZSJpPULhP4INiMnknyVC9A/export?format=csv&gid=717629748';
    const PASSWORD = 'mf01868';

    // Page elements
    const loginPage = document.getElementById('login-page');
    const passwordPage = document.getElementById('password-page');
    const resultsPage = document.getElementById('results-page');
    const reportsPage = document.getElementById('reports-page');

    // Login page elements
    const rdNumberInput = document.getElementById('rd-number-input');
    const viewAccountsBtn = document.getElementById('view-accounts-btn');
    const reportsBtn = document.getElementById('reports-btn');
    const loginMessage = document.getElementById('login-message');
    const container = document.querySelector('.container');

    // Password page elements
    const passwordInput = document.getElementById('password-input');
    const passwordSubmitBtn = document.getElementById('password-submit-btn');
    const passwordBackBtn = document.getElementById('password-back-btn');
    const passwordMessage = document.getElementById('password-message');

    // Results page elements
    const logoutBtn = document.getElementById('logout-btn');
    const resultsContainer = document.getElementById('results');
    const summaryContainer = document.getElementById('summary-container');

    // Reports page elements
    const homeFromReportsBtn = document.getElementById('home-from-reports-btn');
    const overallReportContainer = document.getElementById('overall-report-container');
    const recentReportContainer = document.getElementById('recent-report-container');
    const companyReportContainer = document.getElementById('company-report-container');
    const companySelect = document.getElementById('company-select');
    const filterSinceAprilCheckbox = document.getElementById('filter-since-april');

    let rdAccounts = [];
    let uniqueCompanies = [];
    const lastUpdatedDate = '31/12/2025';
    // Define the start date string for easy comparison
    const recentDateString = '2025-04-01';

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
            uniqueCompanies = [...new Set(rdAccounts.map(account => account['company']))].sort();
            populateCompanySelect();
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

    function calculateReportStats(data) {
        const totalAccounts = data.length;

        // Corrected calculation for Total Value
        const totalValue = data.reduce((sum, account) => {
            const paidAmt = parseFloat((account['Paid Amt'] || '0').replace(/,/g, ''));
            const pendingAmt = parseFloat((account['Pending Amount'] || '0').replace(/,/g, ''));
            return sum + (isNaN(paidAmt) ? 0 : paidAmt) + (isNaN(pendingAmt) ? 0 : pendingAmt);
        }, 0);

        const noDueAccounts = data.filter(account => parseFloat(account['Due No']) === 0);
        const noDueCount = noDueAccounts.length;
        // Corrected calculation for Value of No Due Accounts
        const noDueValue = noDueAccounts.reduce((sum, account) => {
            const paidAmt = parseFloat((account['Paid Amt'] || '0').replace(/,/g, ''));
            return sum + (isNaN(paidAmt) ? 0 : paidAmt);
        }, 0);

        const pendingAccounts = data.filter(account => {
            const pendingStr = account['Pending Amount'] || '0';
            return parseFloat(pendingStr.replace(/,/g, '')) > 0;
        });
        const pendingCount = pendingAccounts.length;
        // Calculation for Value of Pending Cases is already correct
        const pendingValue = pendingAccounts.reduce((sum, account) => {
            const valueStr = account['Pending Amount'] || '0';
            const value = parseFloat(valueStr.replace(/,/g, ''));
            return sum + (isNaN(value) ? 0 : value);
        }, 0);

        const noDuePercentage = totalAccounts > 0 ? ((noDueCount / totalAccounts) * 100).toFixed(2) : 0;
        const pendingPercentage = totalAccounts > 0 ? ((pendingCount / totalAccounts) * 100).toFixed(2) : 0;

        return {
            totalAccounts,
            totalValue,
            noDueCount,
            noDueValue,
            pendingCount,
            pendingValue,
            noDuePercentage,
            pendingPercentage
        };
    }

    function displayReport(container, stats) {
        container.innerHTML = `
            <div class="report-stat-item">
                <span class="report-label">Total Accounts</span>
                <span class="report-value">${stats.totalAccounts}</span>
            </div>
            <div class="report-stat-item">
                <span class="report-label">Total Value</span>
                <span class="report-value">₹${stats.totalValue.toLocaleString('en-IN')}</span>
            </div>
            <div class="report-stat-item">
                <span class="report-label">Accounts with No Due</span>
                <span class="report-value">${stats.noDueCount} (${stats.noDuePercentage}%)</span>
            </div>
            <div class="report-stat-item">
                <span class="report-label">Value of No Due Accounts</span>
                <span class="report-value">₹${stats.noDueValue.toLocaleString('en-IN')}</span>
            </div>
            <div class="report-stat-item">
                <span class="report-label">Total Pending Cases</span>
                <span class="report-value">${stats.pendingCount} (${stats.pendingPercentage}%)</span>
            </div>
            <div class="report-stat-item">
                <span class="report-label">Value of Pending Cases</span>
                <span class="report-value">₹${stats.pendingValue.toLocaleString('en-IN')}</span>
            </div>
        `;
    }

    function displayResults(data, agentName) {
        summaryContainer.innerHTML = '';
        resultsContainer.innerHTML = '';

        if (data.length === 0) {
            resultsContainer.innerHTML = `<p class="no-results">No accounts found for ${agentName}.</p>`;
            return;
        }

        const totalAccounts = data.length;
        const pendingAccounts = data.filter(account => {
            const pendingStr = account['Pending Amount'] || '0';
            return parseFloat(pendingStr.replace(/,/g, '')) > 0;
        });
        const pendingCases = pendingAccounts.length;

        const totalPendingAmount = pendingAccounts.reduce((sum, account) => {
            const pendingStr = account['Pending Amount'] || '0';
            const pendingAmt = parseFloat(pendingStr.replace(/,/g, ''));
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
            const pendingStr = account['Pending Amount'] || '0';
            if (parseFloat(pendingStr.replace(/,/g, '')) > 0) {
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

    function populateCompanySelect() {
        companySelect.innerHTML = '<option value="all">All Companies</option>';
        uniqueCompanies.forEach(company => {
            const option = document.createElement('option');
            option.value = company;
            option.textContent = company;
            companySelect.appendChild(option);
        });
    }

    function generateReports() {
        const overallStats = calculateReportStats(rdAccounts);
        displayReport(overallReportContainer, overallStats);

        const recentAccounts = rdAccounts.filter(account => {
            const dateParts = (account['Deposit Date'] || '').split('-');
            if (dateParts.length === 3) {
                // Ensure day and month are two digits for correct string comparison
                const day = dateParts[0].padStart(2, '0');
                const month = dateParts[1].padStart(2, '0');
                const year = dateParts[2];
                const formattedDate = `${year}-${month}-${day}`;
                return formattedDate >= recentDateString;
            }
            return false;
        });

        const recentStats = calculateReportStats(recentAccounts);
        displayReport(recentReportContainer, recentStats);

        displayCompanyReport();
    }

    function displayCompanyReport() {
        const selectedCompany = companySelect.value;
        const filterSinceApril = filterSinceAprilCheckbox.checked;

        let filteredAccounts = rdAccounts;

        if (selectedCompany !== 'all') {
            filteredAccounts = filteredAccounts.filter(account => account['company'] === selectedCompany);
        }

        if (filterSinceApril) {
            filteredAccounts = filteredAccounts.filter(account => {
                const dateParts = (account['Deposit Date'] || '').split('-');
                if (dateParts.length === 3) {
                    const day = dateParts[0].padStart(2, '0');
                    const month = dateParts[1].padStart(2, '0');
                    const year = dateParts[2];
                    const formattedDate = `${year}-${month}-${day}`;
                    return formattedDate >= recentDateString;
                }
                return false;
            });
        }

        const companyStats = calculateReportStats(filteredAccounts);
        companyReportContainer.innerHTML = `
            <div class="report-stat-item">
                <span class="report-label">Total Accounts</span>
                <span class="report-value">${companyStats.totalAccounts}</span>
            </div>
            <div class="report-stat-item">
                <span class="report-label">Total Value</span>
                <span class="report-value">₹${companyStats.totalValue.toLocaleString('en-IN')}</span>
            </div>
            <div class="report-stat-item">
                <span class="report-label">Accounts with No Due</span>
                <span class="report-value">${companyStats.noDueCount} (${companyStats.noDuePercentage}%)</span>
            </div>
            <div class="report-stat-item">
                <span class="report-label">Value of No Due Accounts</span>
                <span class="report-value">₹${companyStats.noDueValue.toLocaleString('en-IN')}</span>
            </div>
            <div class="report-stat-item">
                <span class="report-label">Total Pending Cases</span>
                <span class="report-value">${companyStats.pendingCount} (${companyStats.pendingPercentage}%)</span>
            </div>
            <div class="report-stat-item">
                <span class="report-label">Value of Pending Cases</span>
                <span class="report-value">₹${companyStats.pendingValue.toLocaleString('en-IN')}</span>
            </div>
        `;
    }

    // --- Event Listeners and Page Navigation ---

    function showPage(page) {
        loginPage.classList.add('hidden');
        passwordPage.classList.add('hidden');
        resultsPage.classList.add('hidden');
        reportsPage.classList.add('hidden');
        page.classList.remove('hidden');
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

        const singleAccount = rdAccounts.find(account => account['Deposit No'] && account['Deposit No'].toLowerCase() === rdNumber);

        if (singleAccount) {
            const agentName = singleAccount['Agent'];
            const filteredAccounts = rdAccounts.filter(account => account['Agent'] === agentName);

            // Filter for unique RD Numbers to prevent duplicates
            const uniqueRdNumbers = new Set();
            const uniqueFilteredAccounts = filteredAccounts.filter(account => {
                if (uniqueRdNumbers.has(account['Deposit No'])) {
                    return false;
                } else {
                    uniqueRdNumbers.add(account['Deposit No']);
                    return true;
                }
            });

            displayResults(uniqueFilteredAccounts, agentName);
            showPage(resultsPage);
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
        showPage(loginPage);
    }

    function handlePasswordCheck() {
        passwordMessage.textContent = '';
        passwordMessage.classList.remove('error-message');
        if (passwordInput.value === PASSWORD) {
            generateReports();
            showPage(reportsPage);
            passwordInput.value = '';
        } else {
            passwordMessage.textContent = 'Incorrect password. Please try again.';
            passwordMessage.classList.add('error-message');
        }
    }

    // Wire up event listeners
    viewAccountsBtn.addEventListener('click', findAndDisplayAgentAccounts);
    rdNumberInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            findAndDisplayAgentAccounts();
        }
    });
    logoutBtn.addEventListener('click', handleLogout);
    reportsBtn.addEventListener('click', () => showPage(passwordPage));
    passwordSubmitBtn.addEventListener('click', handlePasswordCheck);
    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handlePasswordCheck();
        }
    });
    passwordBackBtn.addEventListener('click', () => showPage(loginPage));
    homeFromReportsBtn.addEventListener('click', () => showPage(loginPage));
    companySelect.addEventListener('change', displayCompanyReport);
    filterSinceAprilCheckbox.addEventListener('change', displayCompanyReport);

    fetchCsvData();
});




