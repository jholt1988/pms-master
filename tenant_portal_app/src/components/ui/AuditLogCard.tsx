// Components/AuditLogCard.tsx
export const AuditLogCard = () => (
    <div className="card">
        <div className="card-title">Audit Log</div>
        <div className="list">
            <div className="list-row">
                <div><strong>Login Success</strong> • manager@acme.co</div>
                <div className="badge">Just now</div>
            </div>
            <div className="list-row">
                <div><strong>Lease Updated</strong> • Unit 4D</div>
                <div className="badge">2h ago</div>
            </div>
            <div className="list-row">
                <div><strong>Application Reviewed</strong> • Riley Park</div>
                <div className="badge">Yesterday</div>
            </div>
        </div>
    </div>
);
