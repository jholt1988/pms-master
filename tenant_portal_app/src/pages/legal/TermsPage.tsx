import React from 'react';
import { LegalLayout } from './LegalLayout';

export default function TermsPage(): React.ReactElement {
  return (
    <LegalLayout title="Terms of Service">
      <div>
        <p className="text-sm text-gray-600">Version: <span className="font-semibold">0.1</span></p>
        <p className="text-sm text-gray-600">Effective: <span className="font-semibold">2026-02-22</span></p>
      </div>
      <p>
        This is a placeholder Terms of Service document used for demo flows. Replace with
        finalized legal terms before launch.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Users must comply with all applicable laws.</li>
        <li>Accounts may be suspended for misuse.</li>
        <li>The service is provided “as‑is” in the demo environment.</li>
      </ul>
      <p className="text-sm text-gray-500">
        Acceptance is recorded with a timestamp and version at the time of submission.
      </p>
    </LegalLayout>
  );
}
