// Components/RentalApplicationsCard.tsx
export const RentalApplicationsCard = () => (
    <div className="card">
        <div className="card-title">Rental Applications</div>
        <table className="table">
            <thead>
                <tr>
                    <th>Applicant</th>
                    <th>Unit</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Riley Park</td>
                    <td>2A</td>
                    <td>726</td>
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
                    <td>Taylor Kim</td>
                    <td>5B</td>
                    <td>688</td>
                    <td><span className="pill">Pending</span></td>
                    <td>
                        <div className="section-actions">
                            <div className="btn" data-media-type="banani-button">Approve</div>
                            <div className="btn" data-media-type="banani-button">Reject</div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        <div className="helper">Prospective tenants submit applications. Managers review and screen.</div>
    </div>
);
