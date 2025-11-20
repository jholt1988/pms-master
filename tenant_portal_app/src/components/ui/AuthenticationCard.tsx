// Components/AuthenticationCard.tsx
export const AuthenticationCard = () => (
    <div className="card">
        <div className="card-title">Authentication</div>
        <div className="grid">
            <div className="card" style={{ padding: '12px' }}>
                <div className="card-title">Login</div>
                <div className="form">
                    <div className="field">
                        <div className="label">Email</div>
                        <div className="input">name@example.com</div>
                    </div>
                    <div className="field">
                        <div className="label">Password</div>
                        <div className="input">••••••••</div>
                    </div>
                    <div className="section-actions">
                        <div className="btn primary" data-media-type="banani-button">Sign In</div>
                        <div className="btn" data-media-type="banani-button">Forgot Password</div>
                    </div>
                </div>
            </div>
            <div className="card" style={{ padding: '12px' }}>
                <div className="card-title">Sign Up</div>
                <div className="form">
                    <div className="field">
                        <div className="label">Full Name</div>
                        <div className="input">Jane Doe</div>
                    </div>
                    <div className="field">
                        <div className="label">Email</div>
                        <div className="input">jane@example.com</div>
                    </div>
                    <div className="field">
                        <div className="label">Password</div>
                        <div className="input">Create a strong password</div>
                    </div>
                    <div className="section-actions">
                        <div className="btn primary" data-media-type="banani-button">Create Account</div>
                    </div>
                </div>
            </div>
        </div>
        <div className="helper">Public: Login and Sign Up. Rental Application submission is also public.</div>
    </div>
);
