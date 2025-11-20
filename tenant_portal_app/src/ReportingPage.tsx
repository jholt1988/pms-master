import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface RentRollItem {
  property: string;
  unit: string;
  tenant: string;
  rentAmount: number;
  status: string;
  currentBalance: number;
  unpaidInvoices: number;
  totalUnpaid: number;
  startDate: string;
  endDate: string;
}

interface ProfitLossItem {
  property: string;
  income: number;
  expenses: number;
  netIncome: number;
  margin: number;
}

interface MaintenanceAnalytics {
  totalCompleted: number;
  averageResolutionTimeHours: number;
  averageResolutionTimeDays: number;
  byPriority: {
    EMERGENCY: { count: number; averageHours: number };
    HIGH: { count: number; averageHours: number };
    MEDIUM: { count: number; averageHours: number };
    LOW: { count: number; averageHours: number };
  };
}

interface VacancyRateItem {
  property: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  vacancyRate: string;
}

type ReportType = 'rent-roll' | 'profit-loss' | 'maintenance-analytics' | 'vacancy-rate' | 'payment-history';

export default function ReportingPage(): React.ReactElement {
  const { token } = useAuth();
  const [reportType, setReportType] = useState<ReportType>('rent-roll');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [filters, setFilters] = useState({
    propertyId: '',
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (reportType) {
      fetchReport();
    }
  }, [reportType, filters]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.propertyId) params.append('propertyId', filters.propertyId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/reporting/${reportType}?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const reportData = await response.json();
      setData(reportData);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) => headers.map((header) => JSON.stringify(row[header] || '')).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const renderRentRoll = () => {
    const items = data as RentRollItem[];
    if (!items || items.length === 0) return <div>No data available</div>;

    return (
      <div>
        <div className="mb-4">
          <button
            onClick={() => exportToCSV(items, 'rent-roll')}
            className="bg-green-500 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Export to CSV
          </button>
        </div>
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="border px-4 py-2">Property</th>
              <th className="border px-4 py-2">Unit</th>
              <th className="border px-4 py-2">Tenant</th>
              <th className="border px-4 py-2">Rent Amount</th>
              <th className="border px-4 py-2">Status</th>
              <th className="border px-4 py-2">Current Balance</th>
              <th className="border px-4 py-2">Unpaid Invoices</th>
              <th className="border px-4 py-2">Total Unpaid</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="border px-4 py-2">{item.property}</td>
                <td className="border px-4 py-2">{item.unit}</td>
                <td className="border px-4 py-2">{item.tenant}</td>
                <td className="border px-4 py-2">${item.rentAmount.toFixed(2)}</td>
                <td className="border px-4 py-2">{item.status}</td>
                <td className="border px-4 py-2">${item.currentBalance.toFixed(2)}</td>
                <td className="border px-4 py-2">{item.unpaidInvoices}</td>
                <td className="border px-4 py-2">${item.totalUnpaid.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderProfitLoss = () => {
    const items = data as ProfitLossItem[];
    if (!items || items.length === 0) return <div>No data available</div>;

    return (
      <div>
        <div className="mb-4">
          <button
            onClick={() => exportToCSV(items, 'profit-loss')}
            className="bg-green-500 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Export to CSV
          </button>
        </div>
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="border px-4 py-2">Property</th>
              <th className="border px-4 py-2">Income</th>
              <th className="border px-4 py-2">Expenses</th>
              <th className="border px-4 py-2">Net Income</th>
              <th className="border px-4 py-2">Margin %</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="border px-4 py-2">{item.property}</td>
                <td className="border px-4 py-2">${item.income.toFixed(2)}</td>
                <td className="border px-4 py-2">${item.expenses.toFixed(2)}</td>
                <td className="border px-4 py-2">${item.netIncome.toFixed(2)}</td>
                <td className="border px-4 py-2">{item.margin.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMaintenanceAnalytics = () => {
    const analytics = data as MaintenanceAnalytics;
    if (!analytics) return <div>No data available</div>;

    return (
      <div>
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-bold">Total Completed</h3>
            <p className="text-2xl">{analytics.totalCompleted}</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <h3 className="font-bold">Average Resolution Time</h3>
            <p className="text-2xl">{analytics.averageResolutionTimeDays.toFixed(1)} days</p>
            <p className="text-sm text-gray-600">({analytics.averageResolutionTimeHours.toFixed(1)} hours)</p>
          </div>
        </div>
        <h3 className="font-bold mb-4">By Priority</h3>
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="border px-4 py-2">Priority</th>
              <th className="border px-4 py-2">Count</th>
              <th className="border px-4 py-2">Average Hours</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(analytics.byPriority).map(([priority, stats]) => (
              <tr key={priority}>
                <td className="border px-4 py-2">{priority}</td>
                <td className="border px-4 py-2">{stats.count}</td>
                <td className="border px-4 py-2">{stats.averageHours.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderVacancyRate = () => {
    const items = data as VacancyRateItem[];
    if (!items || items.length === 0) return <div>No data available</div>;

    return (
      <div>
        <div className="mb-4">
          <button
            onClick={() => exportToCSV(items, 'vacancy-rate')}
            className="bg-green-500 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Export to CSV
          </button>
        </div>
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="border px-4 py-2">Property</th>
              <th className="border px-4 py-2">Total Units</th>
              <th className="border px-4 py-2">Occupied</th>
              <th className="border px-4 py-2">Vacant</th>
              <th className="border px-4 py-2">Vacancy Rate %</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="border px-4 py-2">{item.property}</td>
                <td className="border px-4 py-2">{item.totalUnits}</td>
                <td className="border px-4 py-2">{item.occupiedUnits}</td>
                <td className="border px-4 py-2">{item.vacantUnits}</td>
                <td className="border px-4 py-2">{item.vacancyRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>

      <div className="mb-6 flex gap-4">
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as ReportType)}
          className="border rounded px-4 py-2"
        >
          <option value="rent-roll">Rent Roll</option>
          <option value="profit-loss">Profit & Loss</option>
          <option value="maintenance-analytics">Maintenance Analytics</option>
          <option value="vacancy-rate">Vacancy Rate</option>
          <option value="payment-history">Payment History</option>
        </select>

        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className="border rounded px-4 py-2"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="border rounded px-4 py-2"
        />
        <input
          type="text"
          placeholder="Property ID (optional)"
          value={filters.propertyId}
          onChange={(e) => setFilters({ ...filters, propertyId: e.target.value })}
          className="border rounded px-4 py-2"
        />
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {reportType === 'rent-roll' && renderRentRoll()}
          {reportType === 'profit-loss' && renderProfitLoss()}
          {reportType === 'maintenance-analytics' && renderMaintenanceAnalytics()}
          {reportType === 'vacancy-rate' && renderVacancyRate()}
          {reportType === 'payment-history' && (
            <div>
              <button
                onClick={() => exportToCSV(data || [], 'payment-history')}
                className="bg-green-500 hover:bg-green-700 text-white px-4 py-2 rounded mb-4"
              >
                Export to CSV
              </button>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

