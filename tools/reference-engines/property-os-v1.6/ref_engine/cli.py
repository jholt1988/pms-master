import argparse, json, sys
from .engine import evaluate_unit_cycle

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--request", required=True)
    args = ap.parse_args()
    with open(args.request, "r") as f:
        req = json.load(f)
    out = evaluate_unit_cycle(req)
    json.dump(out, sys.stdout, indent=2); sys.stdout.write("\n")

if __name__ == "__main__":
    main()
