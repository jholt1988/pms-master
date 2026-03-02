// PMS API Client
const API_BASE_URL = 'http://localhost:3000/api'; // Adjust for production
const API_ROOT = API_BASE_URL.replace(/\/api$/, '');
const DEMO_TENANT_CREDENTIALS = {
    username: 'john_tenant',
    password: 'password123'
};
const DEMO_TENANT_ACCOUNTS = [
    { label: 'Jordan Davis (Unit 4B)', username: 'john_tenant', password: 'password123' },
    { label: 'Sarah Tenant (Unit 2A)', username: 'sarah_tenant', password: 'password123' },
    { label: 'Mike Tenant (Unit 3C)', username: 'mike_tenant', password: 'password123' }
];

class ApiClient {
    static get token() {
        return localStorage.getItem('pms_tenant_token');
    }

    static set token(value) {
        if (value) {
            localStorage.setItem('pms_tenant_token', value);
        } else {
            localStorage.removeItem('pms_tenant_token');
        }
    }

    static async ensureAuth() {
        if (this.token) return this.token;
        const creds = window.TENANT_PORTAL_DEMO_CREDS || DEMO_TENANT_CREDENTIALS;
        if (!creds?.username || !creds?.password) {
            throw new Error('Missing demo credentials for auto-login');
        }

        const response = await fetch(`${API_ROOT}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
        });

        if (!response.ok) {
            throw new Error('Auto-login failed');
        }
        const data = await response.json();
        if (!data?.accessToken && !data?.access_token) {
            throw new Error('Missing access token in auth response');
        }
        this.token = data.accessToken || data.access_token;
        return this.token;
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

        return await response.json();
    }

    static get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    static post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    static put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }
}

// Tenant Portal Logic
const App = {
    state: {
        currentUser: null,
        inspections: [],
        maintenanceRequests: [],
        activeTab: 'dashboard'
    },

    async init() {
        lucide.createIcons();
        this.setupNavigation();
        
        try {
            this.renderDemoAccountSwitcher();
            await ApiClient.ensureAuth();
            await this.loadDashboardData();
        } catch (err) {
            console.error("Failed to initialize dashboard", err);
        }
    },

    setupNavigation() {
        window.showPage = (pageName) => {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const pageEl = document.getElementById('page-' + pageName);
            if (pageEl) pageEl.classList.add('active');
            
            document.querySelectorAll('.nav-item').forEach(n => {
                n.classList.remove('active');
                if(n.getAttribute('onclick')?.includes(pageName)) {
                    n.classList.add('active');
                    n.classList.remove('text-muted-foreground'); // Highlight active
                } else {
                    n.classList.add('text-muted-foreground'); // Dim inactive
                }
            });
            
            this.state.activeTab = pageName;
            
            // Refresh data when switching tabs
            if (pageName === 'inspections') this.loadInspections();
            if (pageName === 'maintenance') this.loadMaintenance();
        };
    },

    async loadDashboardData() {
        // Parallel fetch for dashboard widgets
        try {
            const [user, upcomingInspections, paymentData, recentActivity, maintenance] = await Promise.all([
                ApiClient.get('/tenants/me').catch(() => ({ firstName: 'Tenant', lastName: '', unitNumber: '4B' })),
                ApiClient.get('/inspections?status=scheduled&limit=1').catch(() => ({ data: [] })),
                ApiClient.get('/payments/upcoming').catch(() => ({ amount: 1250.00, dueDate: '2026-03-01' })),
                ApiClient.get('/conversations').catch(() => ({ data: [] })),
                ApiClient.get('/maintenance').catch(() => ({ data: [] }))
            ]);

            this.state.currentUser = user;
            this.updateHeader(user);
            
            // Rent Card
            this.updateRentCard(paymentData);

            // Inspection Alert
            if (upcomingInspections.data && upcomingInspections.data.length > 0) {
                this.updateDashboardInspectionCard(upcomingInspections.data[0]);
            }
            
            // Recent Activity (derived from multiple sources)
            this.updateRecentActivity(maintenance.data, recentActivity.data);
            
        } catch (error) {
            console.error('Dashboard load failed:', error);
        }
    },

    updateRentCard(data) {
        const amountEl = document.querySelector('#dashboard-rent-card .text-3xl');
        const dateEl = document.querySelector('#dashboard-rent-card .text-xs.text-white\\/50');
        const badgeEl = document.querySelector('#dashboard-rent-card .bg-white\\/20');
        
        if (amountEl) amountEl.textContent = `$${data.amount.toFixed(2)}`;
        
        const due = new Date(data.dueDate);
        if (dateEl) dateEl.textContent = due.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
        
        const days = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));
        if (badgeEl) badgeEl.textContent = days > 0 ? `Due in ${days} days` : (days === 0 ? 'Due Today' : 'Overdue');
    },
    
    updateRecentActivity(maintenance, messages) {
        const container = document.querySelector('#page-dashboard .space-y-3'); // Recent Activity list
        if (!container) return;
        
        container.innerHTML = '';
        const activities = [];
        
        // Merge maintenance
        maintenance.slice(0, 2).forEach(m => {
            activities.push({
                type: 'maintenance',
                title: m.title,
                date: new Date(m.createdAt),
                status: m.status,
                details: m.description
            });
        });
        
        // Merge messages
        messages.slice(0, 2).forEach(msg => {
            activities.push({
                type: 'message',
                title: msg.sender,
                date: new Date(msg.timestamp),
                status: 'unread',
                details: msg.lastMessage
            });
        });
        
        // Sort by date desc
        activities.sort((a, b) => b.date - a.date);
        
        activities.forEach(act => {
            let icon, color, badge;
            if (act.type === 'maintenance') {
                icon = 'wrench';
                color = 'blue';
                badge = `<span class="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium capitalize">${act.status.replace('_', ' ')}</span>`;
            } else {
                icon = 'message-square';
                color = 'green';
                badge = `<span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">New</span>`;
            }
            
            const html = `
            <div class="bg-surface rounded-xl p-4 border border-border touch-feedback">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-${color}-100 flex items-center justify-center shrink-0">
                    <i class="w-5 h-5 text-${color}-600" data-lucide="${icon}"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-sm">${act.title}</p>
                  <p class="text-xs text-muted-foreground">${act.date.toLocaleDateString()} • ${act.details}</p>
                </div>
                ${badge}
              </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
        lucide.createIcons();
    },

    renderDemoAccountSwitcher() {
        const header = document.querySelector('header .flex.items-center.justify-between');
        if (!header || header.querySelector('.demo-switcher')) return;

        const current = localStorage.getItem('pms_last_demo_tenant') || DEMO_TENANT_ACCOUNTS[0].username;
        const applyAccount = (username) => {
            const acct = DEMO_TENANT_ACCOUNTS.find(a => a.username === username);
            if (!acct) return;
            window.TENANT_PORTAL_DEMO_CREDS = { username: acct.username, password: acct.password };
            localStorage.setItem('pms_last_demo_tenant', acct.username);
        };
        applyAccount(current);

        const createSelect = () => {
            const select = document.createElement('select');
            select.className = 'text-xs bg-transparent focus:outline-none';
            DEMO_TENANT_ACCOUNTS.forEach((acct) => {
                const option = document.createElement('option');
                option.value = acct.username;
                option.textContent = acct.label;
                select.appendChild(option);
            });
            select.value = localStorage.getItem('pms_last_demo_tenant') || current;
            return select;
        };

        const handleSwitch = (username) => {
            const acct = DEMO_TENANT_ACCOUNTS.find(a => a.username === username);
            if (!acct) return;
            window.TENANT_PORTAL_DEMO_CREDS = { username: acct.username, password: acct.password };
            ApiClient.token = null;
            localStorage.setItem('pms_last_demo_tenant', acct.username);
            window.location.reload();
        };

        // Desktop pill
        const wrapper = document.createElement('div');
        wrapper.className = 'demo-switcher hidden sm:flex items-center gap-2 bg-white/80 border border-border rounded-xl px-2 py-1 shadow-sm';
        const desktopSelect = createSelect();
        const button = document.createElement('button');
        button.textContent = 'Switch';
        button.className = 'text-xs font-semibold text-accent hover:underline';
        button.addEventListener('click', () => handleSwitch(desktopSelect.value));
        wrapper.appendChild(desktopSelect);
        wrapper.appendChild(button);
        header.appendChild(wrapper);

        // Mobile floating card
        const mobilePanel = document.createElement('div');
        mobilePanel.className = 'demo-switcher-mobile sm:hidden fixed bottom-24 right-4 z-40 bg-white/95 border border-border rounded-2xl shadow-lg p-3 flex flex-col gap-2 text-xs';
        const title = document.createElement('span');
        title.className = 'font-semibold text-foreground';
        title.textContent = 'Demo account';
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

    updateHeader(user) {
        const nameEl = document.querySelector('header h1');
        const unitEl = document.querySelector('header p');
        const avatarEl = document.querySelector('header .rounded-full');
        
        if (user.firstName) {
            nameEl.textContent = `Welcome back, ${user.firstName}`;
            avatarEl.textContent = `${user.firstName[0]}${user.lastName[0]}`;
        }
        if (user.unitNumber) {
            unitEl.textContent = `Unit ${user.unitNumber} • ${user.propertyName || 'Riverside Apts'}`;
        }
    },

    updateDashboardInspectionCard(inspection) {
        const container = document.getElementById('dashboard-inspection-alert');
        if (!container) return;

        const date = new Date(inspection.scheduledDate).toLocaleDateString();
        const daysUntil = Math.ceil((new Date(inspection.scheduledDate) - new Date()) / (1000 * 60 * 60 * 24));
        const dueText = daysUntil > 0 ? `Due in ${daysUntil} days` : (daysUntil === 0 ? 'Due Today' : 'Overdue');
        const badgeColor = daysUntil < 3 ? 'red' : 'accent';
        
        container.innerHTML = `
            <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg border border-slate-700">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-${badgeColor}-500/20 backdrop-blur-sm flex items-center justify-center">
                            <i class="w-5 h-5 text-${badgeColor}-500" data-lucide="calendar-check"></i>
                        </div>
                        <div>
                            <h3 class="font-semibold text-sm">Action Required</h3>
                            <p class="text-xs text-white/60">Upcoming Inspection</p>
                        </div>
                    </div>
                    <span class="px-2 py-1 bg-${badgeColor}-500/20 text-${badgeColor}-400 rounded-full text-[10px] font-medium uppercase tracking-wide">${dueText}</span>
                </div>
                <p class="text-sm text-white/90 mb-4 font-medium">${inspection.type || 'Annual'} Inspection scheduled for ${date}</p>
                <button class="w-full py-3 bg-${badgeColor}-600 hover:bg-${badgeColor}-700 text-white rounded-xl font-semibold text-sm touch-feedback flex items-center justify-center gap-2" onclick="App.startInspection(${inspection.id})">
                    <i class="w-4 h-4" data-lucide="clipboard-check"></i> Start Checklist Now
                </button>
            </div>
        `;
        container.classList.remove('hidden');
        lucide.createIcons();
    },

    async loadInspections() {
        const response = await ApiClient.get('/inspections');
        this.state.inspections = response.data || [];
        this.renderInspectionsList();
    },

    renderInspectionsList() {
        const container = document.querySelector('#page-inspections .space-y-3'); // History container
        if (!container) return;

        // Keep the "Upcoming" card separate, just render history list for now
        // Clear existing static history items
        container.innerHTML = '';

        this.state.inspections.forEach(insp => {
            const date = new Date(insp.scheduledDate).toLocaleDateString();
            const statusColor = insp.status === 'completed' ? 'green' : 'amber';
            const statusIcon = insp.status === 'completed' ? 'check' : 'clock';
            
            const html = `
            <div class="bg-surface rounded-xl p-4 border border-border touch-feedback">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-full bg-${statusColor}-100 flex items-center justify-center shrink-0">
                    <i class="w-5 h-5 text-${statusColor}-600" data-lucide="${statusIcon}"></i>
                </div>
                <div class="flex-1">
                  <div class="flex items-start justify-between">
                    <div>
                      <p class="font-medium text-sm">${insp.type} Inspection</p>
                      <p class="text-xs text-muted-foreground">${date}</p>
                    </div>
                    <span class="px-2 py-1 bg-${statusColor}-100 text-${statusColor}-700 text-xs rounded-full font-medium capitalize">${insp.status}</span>
                  </div>
                  ${insp.status === 'scheduled' ? 
                    `<button class="mt-2 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium touch-feedback" onclick="App.startInspection(${insp.id})">Start Checklist</button>` : 
                    `<button class="mt-2 px-3 py-1.5 bg-muted rounded-lg text-xs font-medium touch-feedback">View Report</button>`
                  }
                </div>
              </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
        lucide.createIcons();
    },

    async startInspection(id) {
        console.log('Starting inspection', id);
        // Fetch full inspection details with checklist
        try {
            const inspection = await ApiClient.get(`/inspections/${id}`);
            this.renderInspectionModal(inspection);
            document.getElementById('inspection-modal').classList.remove('hidden');
        } catch (e) {
            alert('Failed to load inspection details');
        }
    },

    renderInspectionModal(inspection) {
        const container = document.querySelector('#inspection-modal .space-y-3');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Handle checklist items (mock data structure: inspection.items)
        const items = inspection.items || inspection.checklist || [];
        
        if (items.length === 0) {
            container.innerHTML = '<p class="text-center text-muted-foreground p-4">No checklist items found.</p>';
            return;
        }

        items.forEach(item => {
            const html = `
            <div class="p-4 border border-border rounded-xl bg-background" data-item-id="${item.id}">
              <div class="flex items-start justify-between mb-2">
                <span class="font-medium text-sm">${item.text || item.description}</span>
                <div class="flex gap-2">
                  <button class="w-8 h-8 rounded-lg ${item.status === 'pass' ? 'ring-2 ring-primary' : ''} bg-green-100 flex items-center justify-center touch-feedback" onclick="markItem(this, 'pass')">
                    <i class="w-4 h-4 text-green-600" data-lucide="check"></i>
                  </button>
                  <button class="w-8 h-8 rounded-lg ${item.status === 'fail' ? 'ring-2 ring-primary' : ''} bg-red-100 flex items-center justify-center touch-feedback" onclick="markItem(this, 'fail')">
                    <i class="w-4 h-4 text-red-600" data-lucide="x"></i>
                  </button>
                </div>
              </div>
              <label class="flex items-center gap-2 mb-2 cursor-pointer">
                <input class="w-4 h-4 rounded border-border text-accent" type="checkbox" ${item.requiresAction ? 'checked' : ''}/>
                <span class="text-xs text-muted-foreground">Requires action</span>
              </label>
              <textarea class="w-full p-3 bg-surface border border-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary" placeholder="Notes (optional)" rows="2">${item.notes || ''}</textarea>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
        
        // Update progress initially
        const marked = items.filter(i => i.status).length;
        const progress = (marked / items.length * 100);
        document.getElementById('progress-bar').style.width = progress + '%';
        
        lucide.createIcons();
    },

    async loadMaintenance() {
        try {
            const maintenance = await ApiClient.get('/maintenance');
            this.state.maintenanceRequests = maintenance.data || [];
            this.renderMaintenanceList();
        } catch (error) {
            console.error('Failed to load maintenance requests:', error);
        }
    },

    renderMaintenanceList() {
        const container = document.querySelector('#page-maintenance .space-y-3');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.state.maintenanceRequests.length === 0) {
            container.innerHTML = '<p class="text-center text-muted-foreground p-4">No active maintenance requests.</p>';
            return;
        }

        this.state.maintenanceRequests.forEach(req => {
            const date = new Date(req.createdAt).toLocaleDateString();
            const statusColor = req.status === 'in_progress' ? 'amber' : (req.status === 'completed' ? 'green' : 'blue');
            const statusIcon = req.status === 'in_progress' ? 'wrench' : (req.status === 'completed' ? 'check' : 'clipboard-list');
            
            const html = `
            <div class="bg-surface rounded-xl p-4 border border-border">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-full bg-${statusColor}-100 flex items-center justify-center shrink-0">
                    <i class="w-5 h-5 text-${statusColor}-600" data-lucide="${statusIcon}"></i>
                </div>
                <div class="flex-1">
                  <div class="flex items-start justify-between">
                    <p class="font-medium text-sm">${req.title}</p>
                    <span class="px-2 py-1 bg-${statusColor}-100 text-${statusColor}-700 text-xs rounded-full font-medium capitalize">${req.status.replace('_', ' ')}</span>
                  </div>
                  <p class="text-xs text-muted-foreground mt-1">Submitted ${date}</p>
                  <p class="text-xs text-muted-foreground mt-2">${req.description}</p>
                </div>
              </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
        lucide.createIcons();
    }
};

// Global helpers for UI interactions
window.initiatePayment = async () => {
    const btn = document.querySelector('#dashboard-rent-card button');
    const btnText = document.getElementById('pay-btn-text');
    
    // Simple lock
    if (btn.disabled) return;
    
    // Loading state
    btn.disabled = true;
    const originalText = btnText.textContent;
    btnText.textContent = 'Processing...';
    
    try {
        await ApiClient.post('/payments', { amount: 1250.00 });
        
        // Success feedback
        btnText.textContent = 'Payment Successful!';
        btn.classList.remove('bg-accent');
        btn.classList.add('bg-green-600');
        
        // Update balance card to show $0.00
        const amountEl = document.querySelector('#dashboard-rent-card .text-3xl');
        if (amountEl) amountEl.textContent = '$0.00';
        
        const badgeEl = document.querySelector('#dashboard-rent-card .bg-white\\/20');
        if (badgeEl) {
            badgeEl.textContent = 'Paid';
            badgeEl.classList.add('bg-green-500/20');
        }

        setTimeout(() => {
            // Reset button state after delay
            btn.disabled = false;
            btnText.textContent = originalText;
            btn.classList.remove('bg-green-600');
            btn.classList.add('bg-accent');
        }, 3000);
        
    } catch (error) {
        alert('Payment failed. Please try again.');
        btn.disabled = false;
        btnText.textContent = originalText;
    }
};

window.openMaintenanceModal = () => {
    document.getElementById('maintenance-modal').classList.remove('hidden');
};

window.closeMaintenanceModal = () => {
    document.getElementById('maintenance-modal').classList.add('hidden');
};

window.submitMaintenance = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = {
        title: formData.get('category'),
        description: formData.get('description'),
        priority: formData.get('priority')
    };

    try {
        await ApiClient.post('/maintenance', data);
        window.closeMaintenanceModal();
        // Reset form
        event.target.reset();
        // Show success
        alert('Request submitted successfully!'); 
        App.loadMaintenance(); // Refresh list
    } catch (error) {
        alert('Failed to submit request.');
    }
};

// Global helpers for UI interactions
window.closeModal = () => {
    document.getElementById('inspection-modal').classList.add('hidden');
};

window.closeSuccess = () => {
    document.getElementById('success-modal').classList.add('hidden');
};

window.markItem = (btn, status) => {
    const parent = btn.parentElement;
    parent.querySelectorAll('button').forEach(b => {
        b.classList.remove('ring-2', 'ring-primary');
    });
    btn.classList.add('ring-2', 'ring-primary');
    
    // Update progress
    const items = document.querySelectorAll('#inspection-modal .space-y-3 > div');
    const marked = document.querySelectorAll('#inspection-modal button.ring-primary').length;
    const progress = (marked / items.length * 100);
    document.getElementById('progress-bar').style.width = progress + '%';
    
    // Save state (in a real app, update the model)
    const itemId = parent.closest('[data-item-id]')?.dataset.itemId;
    if (itemId) {
        // App.updateChecklistItem(itemId, status);
    }
};

window.saveDraft = () => {
    window.closeModal();
    // TODO: Implement API call
    console.log("Draft saved locally");
};

window.submitInspection = () => {
    window.closeModal();
    document.getElementById('success-modal').classList.remove('hidden');
    // TODO: Implement API call
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    
    // Modal background click close
    document.getElementById('inspection-modal').addEventListener('click', (e) => {
        if(e.target === e.currentTarget) window.closeModal();
    });
    
    document.getElementById('maintenance-modal').addEventListener('click', (e) => {
        if(e.target === e.currentTarget) window.closeMaintenanceModal();
    });
});
