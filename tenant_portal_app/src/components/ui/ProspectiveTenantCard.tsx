// Components/ProspectiveTenantCard.tsx
export const ProspectiveTenantCard = () => (
    <div className="card">
        <div className="card-title">Prospective Tenant</div>
        <div className="split">
            <div className="card" style={{ padding: '12px' }}>
                <div className="card-title">Rental Application</div>
                <div className="form">
                    <div className="field">
                        <div className="label">Property</div>
                        <div className="input">Select a property</div>
                    </div>
                    <div className="field">
                        <div className="label">Unit</div>
                        <div className="input">Select unit</div>
                    </div>
                    <div className="field">
                        <div className="label">Full Name</div>
                        <div className="input">Your name</div>
                    </div>
                    <div className="field">
                        <div className="label">Email</div>
                        <div className="input">you@example.com</div>
                    </div>
                    <div className="field">
                        <div className="label">Income (Monthly)</div>
                        <div className="input">$</div>
                    </div>
                    <div className="field">
                        <div className="label">Notes</div>
                        <div className="textarea">Anything we should know?</div>
                    </div>
                    <div className="section-actions">
                        <div className="btn primary" data-media-type="banani-button">Submit Application</div>
                    </div>
                </div>
            </div>
            <div className="card" style={{ padding: '12px' }}>
                <div className="card-title">Applications Dashboard (Manager)</div>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Applicant</th>
                            <th>Property</th>
                            <th>Unit</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Avery Doe</td>
                            <td>Maple St</td>
                            <td>1B</td>
                            <td><span className="pill">Under Review</span></td>
                            <td>
                                <div className="section-actions">
                                    <div className="btn" data-media-type="banani-button">Approve</div>
                                    <div className="btn" data-media-type="banani-button">Reject</div>
                                    <div className="btn" data-media-type="banani-button">Screen</div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Jordan Qi</td>
                            <td>Oak Ave</td>
                            <td>3A</td>
                            <td><span className="pill">Rejected</span></td>
                            <td>
                                <div className="section-actions">
                                    <div className="btn" data-media-type="banani-button">Details</div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);
