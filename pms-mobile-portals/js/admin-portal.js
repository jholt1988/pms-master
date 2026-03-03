// PMS Admin Client
const API_BASE_URL = 'http://localhost:3000/api';
const API_ROOT = API_BASE_URL.replace(/\/api$/, '');
const DEMO_ADMIN_CREDENTIALS = {
    username: 'admin_pm',
    password: 'password123'
};
const DEMO_ADMIN_ACCOUNTS = [
    { label: 'Admin PM', username: 'admin_pm', password: 'password123' },
    { label: 'System Admin', username: 'admin', password: 'Admin123!@#' }
];

// Simplified ApiClient reuse
class ApiClient {
    static get token() {
        return localStorage.getItem('pms_admin_token');
    }

    static set token(value) {
        if (value) {
            localStorage.setItem('pms_admin_token', value);
        } else {
            localStorage.removeItem('pms_admin_token');
        }
    }

    static async ensureAuth() {
        if (this.token) return this.token;
        const creds = window.ADMIN_PORTAL_DEMO_CREDS || DEMO_ADMIN_CREDENTIALS;
        const response = await fetch(`${API_ROOT}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
        });
        if (!response.ok) {
            throw new Error('Admin auto-login failed');
        }
        const data = await response.json();
        const token = data.accessToken || data.access_token;
        if (!token) throw new Error('Missing access token');
        this.token = token;
        return token;
    }

    static async request(endpoint, options = {}, retry = true) {
        await this.ensureAuth();
        const headers = {
            'Content-Type': 'application/json',
            ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
            ...options.headers
        };
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });
        if (response.status === 401 && retry) {
            this.token = null;
            return this.request(endpoint, options, false);
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Request failed: ${response.status}`);
        }
        return response.json();
    }

    static get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }
}

const AdminApp = {
    state: {
        property: null,
        stats: null,
        units: [],
        tasks: []
    },

    async init() {
        // Initialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }

        this.setupNavigation();
        
        try {
            this.renderDemoAccountSwitcher();
            await ApiClient.ensureAuth();
            await this.loadDashboard();

            // --- DEMO: Show the new estimate page on load ---
            const mockEstimate = await window.MockApi.getEstimateDetail();
            this.renderEstimateDetail(mockEstimate);
            // --- END DEMO ---

        } catch (e) {
            console.error("Admin load failed", e);
        }
    },

    setupNavigation() {
        // Expose showPage globally for HTML onclick handlers
        window.showPage = (pageName) => {
            // Hide all pages
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            // Show selected
            document.getElementById('page-' + pageName).classList.add('active');
            
            // Update nav state
            document.querySelectorAll('.nav-item').forEach(n => {
                n.classList.remove('active');
                n.classList.add('text-muted-foreground'); // Reset all to inactive color
                
                // If this nav item targets the current page
                if(n.getAttribute('onclick')?.includes(`'${pageName}'`)) {
                    n.classList.add('active');
                    n.classList.remove('text-muted-foreground'); // Highlight active
                }
            });

            // Lazy load data for specific pages
            if (pageName === 'units') this.loadUnits();
        };
    },

    async loadDashboard() {
        const [prop, stats, tasks] = await Promise.all([
            ApiClient.get('/properties/current'),
            ApiClient.get('/properties/stats'),
            ApiClient.get('/tasks/priority')
        ]);

        this.state.property = prop;
        this.state.stats = stats;
        this.state.tasks = tasks.data;

        this.renderPropertyHeader(prop);
        this.renderStats(stats);
        this.renderTasks(tasks.data);
    },

    renderDemoAccountSwitcher() {
        const header = document.querySelector('header .flex.items-center.gap-3')?.parentElement;
        if (!header || header.querySelector('.demo-switcher')) return;

        const current = localStorage.getItem('pms_last_demo_admin') || DEMO_ADMIN_ACCOUNTS[0].username;
        const setAccount = (username) => {
            const acct = DEMO_ADMIN_ACCOUNTS.find(a => a.username === username);
            if (!acct) return;
            window.ADMIN_PORTAL_DEMO_CREDS = { username: acct.username, password: acct.password };
            localStorage.setItem('pms_last_demo_admin', acct.username);
        };
        setAccount(current);

        const createSelect = () => {
            const select = document.createElement('select');
            select.className = 'text-xs bg-transparent focus:outline-none';
            DEMO_ADMIN_ACCOUNTS.forEach(acct => {
                const option = document.createElement('option');
                option.value = acct.username;
                option.textContent = acct.label;
                select.appendChild(option);
            });
            select.value = localStorage.getItem('pms_last_demo_admin') || current;
            return select;
        };

        const handleSwitch = (username) => {
            const acct = DEMO_ADMIN_ACCOUNTS.find(a => a.username === username);
            if (!acct) return;
            window.ADMIN_PORTAL_DEMO_CREDS = { username: acct.username, password: acct.password };
            ApiClient.token = null;
            localStorage.setItem('pms_last_demo_admin', acct.username);
            window.location.reload();
        };

        const panel = document.createElement('div');
        panel.className = 'demo-switcher hidden sm:flex items-center gap-2 bg-white/80 border border-border rounded-xl px-2 py-1 shadow-sm';
        const desktopSelect = createSelect();
        const button = document.createElement('button');
        button.textContent = 'Switch';
        button.className = 'text-xs font-semibold text-accent hover:underline';
        button.addEventListener('click', () => handleSwitch(desktopSelect.value));
        panel.appendChild(desktopSelect);
        panel.appendChild(button);
        header.appendChild(panel);

        const mobilePanel = document.createElement('div');
        mobilePanel.className = 'demo-switcher-mobile sm:hidden fixed bottom-24 right-4 z-40 bg-white/95 border border-border rounded-2xl shadow-lg p-3 flex flex-col gap-2 text-xs';
        const title = document.createElement('span');
        title.className = 'font-semibold text-foreground';
        title.textContent = 'Demo admin';
        const mobileSelect = createSelect();
        mobileSelect.className = 'bg-muted/50 rounded-lg px-2 py-1 text-xs';
        const mobileButton = document.createElement('button');
        mobileButton.textContent = 'Switch account';
        mobileButton.className = 'w-full bg-accent text-white rounded-lg py-1 font-semibold';
        mobileButton.addEventListener('click', () => handleSwitch(mobileSelect.value));
        mobilePanel.appendChild(title);
        mobilePanel.appendChild(mobileSelect);
        mobilePanel.appendChild(mobileButton);
        document.body.appendChild(mobilePanel);
    },

    renderPropertyHeader(prop) {
        // Update the big property switcher button text
        const container = document.querySelector('#page-dashboard button .text-left');
        if (container) {
            container.innerHTML = `
                <p class="font-medium text-sm">${prop.name}</p>
                <p class="text-xs text-muted-foreground">${prop.unitsCount} units • ${prop.location}</p>
            `;
        }
    },

    renderStats(stats) {
        // Main stats cards (Occupancy, Rent)
        // We select by context to be safe
        const dashboard = document.getElementById('page-dashboard');
        const largeStats = dashboard.querySelectorAll('.text-2xl.font-bold');
        
        if (largeStats[0]) largeStats[0].textContent = `${stats.occupancy.value}%`;
        if (largeStats[1]) largeStats[1].textContent = `$${(stats.rentCollected.value / 1000).toFixed(1)}K`;

        // Small stats row (Late Rent, Maint, Vacant)
        const smallStats = dashboard.querySelectorAll('.grid.grid-cols-3 .text-lg');
        if (smallStats[0]) smallStats[0].textContent = stats.lateRentCount;
        if (smallStats[1]) smallStats[1].textContent = stats.openMaintenanceCount;
        if (smallStats[2]) smallStats[2].textContent = stats.vacantUnitsCount;
    },

    renderTasks(tasks) {
        // Find the "Priority Tasks" container
        // It's under the h2 "Priority Tasks"
        const header = Array.from(document.querySelectorAll('h2')).find(h => h.textContent === 'Priority Tasks');
        const container = header?.nextElementSibling?.nextElementSibling || header?.parentElement?.querySelector('.space-y-3');

        if (!container) return;
        
        container.innerHTML = ''; // Clear static HTML

        tasks.forEach(task => {
            let icon = 'alert-circle', color = 'blue', badgeColor = 'blue';

            // Map task types to visual styles
            if (task.type === 'maintenance_approval') { 
                icon = 'alert-triangle'; 
                color = 'red'; 
                badgeColor = 'red';
            } else if (task.type === 'lease_renewal') { 
                icon = 'file-signature'; 
                color = 'blue'; 
                badgeColor = 'amber';
            } else if (task.type === 'inspection_due') { 
                icon = 'clipboard-check'; 
                color = 'purple'; 
                badgeColor = 'purple';
            }

            // Generate Action Buttons
            const buttonsHtml = task.actions.map((action, i) => {
                const isPrimary = i === 0;
                const bgClass = isPrimary ? `bg-${badgeColor}-600 text-white` : 'border border-border bg-transparent';
                return `<button class="px-4 py-2 ${bgClass} rounded-xl text-xs font-semibold touch-feedback">${action}</button>`;
            }).join('');

            const html = `
            <div class="bg-surface rounded-xl p-4 border border-border card-hover">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-full bg-${badgeColor}-100 flex items-center justify-center shrink-0">
                  <i data-lucide="${icon}" class="w-5 h-5 text-${badgeColor}-600"></i>
                </div>
                <div class="flex-1">
                  <div class="flex items-start justify-between">
                    <div>
                      <p class="font-medium text-sm">${task.title}</p>
                      <p class="text-xs text-muted-foreground">${task.subtitle}</p>
                    </div>
                    <span class="px-2 py-1 bg-${badgeColor}-100 text-${badgeColor}-700 text-xs rounded-full font-medium">${task.badge}</span>
                  </div>
                  <p class="text-xs text-foreground mt-2">${task.meta}</p>
                  <div class="mt-3 flex items-center gap-2">
                    ${buttonsHtml}
                  </div>
                </div>
              </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
        
        if (window.lucide) lucide.createIcons();
    },

    async loadUnits() {
        const res = await ApiClient.get('/units');
        this.state.units = res.data;
        this.renderUnitsList();
    },

    renderUnitsList() {
        const container = document.querySelector('#page-units .space-y-3');
        if (!container) return;
        
        container.innerHTML = '';

        this.state.units.forEach(unit => {
            let statusBadge = '';
            let borderColor = 'border-border';
            let iconBg = 'bg-primary';
            let iconText = 'text-white';
            
            if (unit.status === 'occupied') {
                statusBadge = '<span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Current</span>';
            } else if (unit.status === 'late_rent') {
                statusBadge = '<span class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Late</span>';
                iconBg = 'bg-red-500';
            } else if (unit.status === 'vacant') {
                statusBadge = '<span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">Available</span>';
                iconBg = 'bg-slate-200';
                iconText = 'text-slate-600';
                borderColor = 'border-dashed border-border';
            }

            const html = `
            <div class="bg-surface rounded-xl p-4 border ${borderColor} card-hover">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <span class="w-12 h-12 rounded-xl ${iconBg} ${iconText} flex items-center justify-center font-bold text-lg">${unit.number}</span>
                  <div>
                    <p class="font-semibold text-sm ${unit.status === 'vacant' ? 'text-muted-foreground' : ''}">${unit.tenant || 'Vacant'}</p>
                    <p class="text-xs text-muted-foreground">${unit.status === 'vacant' ? 'Market: ' : ''}$${unit.rent || unit.marketRent}/mo</p>
                  </div>
                </div>
                ${statusBadge}
              </div>
              
               <div class="flex items-center gap-2 pt-2 border-t border-border ${unit.status === 'vacant' ? 'border-dashed' : ''}">
                <button class="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-medium touch-feedback">
                  Details
                </button>
                <button class="flex-1 py-2 border border-border rounded-lg text-xs font-medium touch-feedback">
                  Contact
                </button>
              </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
        
        if (window.lucide) lucide.createIcons();
    },

    renderEstimateDetail(estimate) {
        const container = document.getElementById('page-estimate-detail');
        if (!container) return;

        // Helper to format currency
        const formatCurrency = (amount) => amount ? `$${amount.toFixed(2)}` : 'N/A';

        // Helper for the new Property OS card
        const renderPropertyOsCard = (propertyOs) => {
            if (!propertyOs) return '';

            const formatPercent = (val) => `${(val * 100).toFixed(1)}%`;

            // Render milestones
            const milestonesHtml = Object.entries(propertyOs.milestones || {}).map(([key, value]) => `
                <div class="flex items-center justify-between text-xs">
                    <span class="text-muted-foreground">${key.replace(/_/g, ' ')}</span>
                    <span class="font-medium">${formatPercent(value.probability)}</span>
                </div>
            `).join('');

            return `
                <div class="mt-6">
                    <h3 class="font-semibold text-sm mb-3">Property OS Analysis</h3>
                    <div class="bg-surface rounded-xl p-4 border border-border">
                        <div class="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p class="text-lg font-bold text-blue-600">${formatPercent(propertyOs.confidence)}</p>
                                <p class="text-[10px] text-muted-foreground">Confidence</p>
                            </div>
                            <div>
                                <p class="text-lg font-bold text-orange-600">${formatPercent(propertyOs.reversal_adjustment)}</p>
                                <p class="text-[10px] text-muted-foreground">Reversal Adj.</p>
                            </div>
                            <div>
                                <p class="text-lg font-bold text-green-600">${formatPercent(propertyOs.es15_mae)}</p>
                                <p class="text-[10px] text-muted-foreground">ES15 MAE</p>
                            </div>
                        </div>
                        <div class="mt-4 pt-4 border-t border-border space-y-2">
                            <h4 class="text-xs font-medium text-muted-foreground mb-1">Milestone Probabilities</h4>
                            ${milestonesHtml}
                        </div>
                    </div>
                </div>
            `;
        };
        
        // Main estimate details
        const lineItemsHtml = (estimate.lineItems || []).map(item => `
            <div class="border-b border-border last:border-b-0 py-3">
                <div class="flex justify-between items-start">
                    <p class="font-medium text-sm">${item.itemDescription}</p>
                    <p class="font-bold text-sm">${formatCurrency(item.totalCost)}</p>
                </div>
                <p class="text-xs text-muted-foreground">${item.location} • ${item.category}</p>
            </div>
        `).join('');

        const html = `
            <div class="mt-4" style="animation: slideUp 0.4s ease-out;">
                <!-- Header -->
                <div class="flex items-center gap-3 mb-4">
                    <button class="p-2 rounded-full hover:bg-muted" onclick="showPage('dashboard')">
                        <i data-lucide="arrow-left" class="w-5 h-5"></i>
                    </button>
                    <div>
                        <h2 class="font-semibold text-lg">Repair Estimate</h2>
                        <p class="text-xs text-muted-foreground">Inspection #${estimate.inspectionId}</p>
                    </div>
                </div>

                <!-- Summary Card -->
                <div class="bg-primary text-white rounded-2xl p-5 shadow-lg">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-sm text-white/70">Total Estimated Cost</span>
                        <span class="px-2 py-1 bg-${estimate.status === 'APPROVED' ? 'green' : 'amber'}-500/80 text-white text-xs rounded-full font-medium">${estimate.status}</span>
                    </div>
                    <p class="text-4xl font-bold">${formatCurrency(estimate.totalProjectCost)}</p>
                    <div class="mt-2 text-sm text-white/70">
                        Bid Range: ${formatCurrency(estimate.bidLowTotal)} - ${formatCurrency(estimate.bidHighTotal)}
                    </div>
                </div>

                <!-- Confidence Section -->
                <div class="mt-4 bg-surface rounded-xl p-4 border border-border">
                    <p class="text-sm font-medium mb-1">${estimate.confidenceLevel}</p>
                    <p class="text-xs text-muted-foreground">${estimate.confidenceReason}</p>
                </div>

                <!-- Property OS Card -->
                ${renderPropertyOsCard(estimate.propertyOs)}

                <!-- Line Items -->
                <div class="mt-6">
                    <h3 class="font-semibold text-sm mb-2">Line Items (${estimate.lineItems?.length || 0})</h3>
                    <div class="bg-surface rounded-xl p-4 border border-border">
                        ${lineItemsHtml}
                    </div>
                </div>

                <!-- Actions -->
                <div class="mt-6 flex items-center gap-3">
                    <button class="flex-1 py-3 bg-accent text-white rounded-xl text-sm font-semibold touch-feedback">Approve Estimate</button>
                    <button class="flex-1 py-3 bg-muted text-muted-foreground rounded-xl text-sm font-semibold touch-feedback">Request Revision</button>
                </div>
            </div>
        `;

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
        showPage('estimate-detail');
    },

    async loadSecurityPage() {
        try {
            const status = await window.MockApi.getMilStatus();
            this.renderSecurityStatus(status);
        } catch (e) {
            console.error("Failed to load MIL security status", e);
            const container = document.getElementById('page-security');
            if (container) {
                container.innerHTML = '<p class="p-4 text-red-600">Could not load security status.</p>';
            }
        }
    },

    renderSecurityStatus(status) {
        const container = document.getElementById('page-security');
        if (!container) return;

        const jobHtml = status.recent_rekey_jobs.map(job => {
            let bgColor = 'bg-blue-100';
            let textColor = 'text-blue-700';
            let icon = 'loader-2';

            if (job.status === 'COMPLETED') {
                bgColor = 'bg-green-100';
                textColor = 'text-green-700';
                icon = 'check-circle';
            } else if (job.status === 'FAILED') {
                bgColor = 'bg-red-100';
                textColor = 'text-red-700';
                icon = 'x-circle';
            }

            return `
                <div class="bg-surface rounded-xl p-4 border border-border">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 rounded-full ${bgColor} flex items-center justify-center shrink-0">
                            <i data-lucide="${icon}" class="w-5 h-5 ${textColor} ${job.status === 'RUNNING' ? 'animate-spin' : ''}"></i>
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center justify-between">
                                <p class="font-medium text-sm">Tenant Rekey Job</p>
                                <span class="px-2 py-1 ${bgColor} ${textColor} text-xs rounded-full font-medium">${job.status}</span>
                            </div>
                            <p class="text-xs text-muted-foreground mt-1">Tenant ID: ${job.tenant_id}</p>
                            <p class="text-xs text-muted-foreground">${new Date(job.updated_at).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const html = `
            <div class="mt-4" style="animation: slideUp 0.4s ease-out;">
                <div class="flex items-center gap-3 mb-4">
                    <button class="p-2 rounded-full hover:bg-muted" onclick="showPage('more')">
                        <i data-lucide="arrow-left" class="w-5 h-5"></i>
                    </button>
                    <h2 class="font-semibold text-lg">MIL Security Status</h2>
                </div>

                <div class="bg-surface rounded-xl p-4 border border-border mb-6">
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-muted-foreground">Service Status</span>
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full bg-green-500"></div>
                            <span class="text-sm font-semibold text-green-700">${status.service_status}</span>
                        </div>
                    </div>
                </div>

                <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Rekey Jobs</h3>
                <div class="space-y-3">
                    ${jobHtml}
                </div>
            </div>
        `;

        container.innerHTML = html;
        if (window.lucide) lucide.createIcons();
        showPage('security');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});
