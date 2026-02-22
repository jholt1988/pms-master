import React from 'react';
import { Link } from 'react-router-dom';

export const LegalLayout = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link to="/" className="text-sm text-blue-600 hover:text-blue-700">← Back to dashboard</Link>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-600">Placeholder for demo and UX flows.</p>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4 text-gray-700">
          {children}
        </div>
      </main>
    </div>
  );
};
