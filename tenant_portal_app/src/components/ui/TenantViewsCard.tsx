// Components/TenantViewsCard.tsx
export const TenantViewsCard = () => (
    <div className="card">
        <div className="card-title">Tenant Views</div>
        <div className="grid">
            <div className="card" style={{ padding: '12px' }}>
                <div className="card-title">Submit Maintenance Request</div>
                <div className="form">
                    <div className="field">
                        <div className="label">Property</div>
                        <div className="input">Maple St</div>
                    </div>
                    <div className="field">
                        <div className="label">Unit</div>
                        <div className="input">2B</div>
                    </div>
                    <div className="field">
                        <div className="label">Issue</div>
                        <div className="textarea">Describe the issue...</div>
                    </div>
                    <div className="field">
                        <div className="label">Preferred Time</div>
                        <div className="input">Tomorrow, 9am - 12pm</div>
                    </div>
                    <div className="section-actions">
                        <div className="btn primary" data-media-type="banani-button">Submit Request</div>
                    </div>
                </div>
            </div>
            <div className="card" style={{ padding: '12px' }}>
                <div className="card-title">My Lease</div>
                <div className="list">
                    <div className="list-row">
                        <div><strong>Property</strong>: Maple St</div>
                        <div className="badge">Active</div>
                    </div>
                    <div className="list-row">
                        <div><strong>Unit</strong>: 2B</div>
                        <div>Ends: Sep 1, 2026</div>
                    </div>
                    <div className="list-row">
                        <div><strong>Rent</strong>: $1,150 / mo</div>
                        <div>Due: 1st</div>
                    </div>
                </div>
            </div>
            <div className="card" style={{ padding: '12px' }}>
                <div className="card-title">Invoices & Payments</div>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Invoice</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Nov 1</td>
                            <td>#INV-2054</td>
                            <td>$1,150</td>
                            <td><span className="pill">Unpaid</span></td>
                        </tr>
                        <tr>
                            <td>Oct 1</td>
                            <td>#INV-2013</td>
                            <td>$1,150</td>
                            <td><span className="pill">Paid</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);
