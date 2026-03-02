import React from 'react';
import { LegalLayout } from './LegalLayout';

export default function PrivacyPage(): React.ReactElement {
  return (
    <LegalLayout title="Privacy Policy">
      <div>
        <p className="text-sm text-gray-600">Version: <span className="font-semibold">0.1</span></p>
        <p className="text-sm text-gray-600">Effective: <span className="font-semibold">2026-02-22</span></p>
      </div>
      <p>
        This is a placeholder Privacy Policy used for demo flows. Replace with the
        finalized policy before launch.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>We collect account and usage data to operate the service.</li>
        <li>We do not sell personal data in the demo environment.</li>
        <li>Users can request deletion of demo data.</li>
      </ul>
      <p className="text-sm text-gray-500">
        Acceptance is recorded with a timestamp and version at the time of submission.
      </p>
    </LegalLayout>
  );
}
