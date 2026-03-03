import argparse, json, sys
from .ledger import extract_milestone_transitions

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ledger", required=True)
    ap.add_argument("--expected_rent", required=True, type=float)
    ap.add_argument("--due_date", required=True)
    ap.add_argument("--cycle_horizon_days", type=float, default=30.0)
    args = ap.parse_args()
    with open(args.ledger, "r") as f:
        ledger = json.load(f)
    out = extract_milestone_transitions(ledger["events"], args.expected_rent, args.due_date, args.cycle_horizon_days)
    json.dump(out, sys.stdout, indent=2); sys.stdout.write("\n")

if __name__ == "__main__":
    main()
