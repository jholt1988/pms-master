// Components/ExpenseTrackerCard.tsx
export const ExpenseTrackerCard = () => (
    <div className="card">
        <div className="card-title">Expense Tracker</div>
        <div className="form">
            <div className="field">
                <div className="label">Property</div>
                <div className="input">Maple St</div>
            </div>
            <div className="field">
                <div className="label">Category</div>
                <div className="input">Repairs</div>
            </div>
            <div className="field">
                <div className="label">Amount</div>
                <div className="input">$240.00</div>
            </div>
            <div className="field">
                <div className="label">Notes</div>
                <div className="textarea">Replaced hallway lights on 3rd floor</div>
            </div>
            <div className="section-actions">
                <div className="btn primary" data-media-type="banani-button">Add Expense</div>
            </div>
        </div>
    </div>
);
