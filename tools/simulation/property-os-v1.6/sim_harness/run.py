import argparse, json, os
from .sim import run_sim

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=2000)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--ref_dir", default=os.path.join(os.path.dirname(__file__), "..", "..", "property_os_reference_engine_v1_6_r4"))
    args = ap.parse_args()

    ref_dir = os.path.abspath(args.ref_dir)
    sample_request = os.path.join(ref_dir, "sample_request.json")
    ref_engine_path = os.path.join(ref_dir, "ref_engine", "engine.py")
    ledger_extractor_path = os.path.join(ref_dir, "ref_engine", "ledger.py")

    report = run_sim(args.n, args.seed, sample_request, ref_engine_path, ledger_extractor_path)
    out_path = os.path.join(os.getcwd(), f"sim_ledger_report_n{args.n}_seed{args.seed}.json")
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)
    print(out_path)

if __name__ == "__main__":
    main()
