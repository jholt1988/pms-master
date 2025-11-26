
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';

/**
 * The expense tracker page.
 * It allows property managers to track expenses for their properties.
 */
const ExpenseTrackerPage = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterProperty, setFilterProperty] = useState<string>('');
  const [filterUnit, setFilterUnit] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [addingExpense, setAddingExpense] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { token } = useAuth();

  const expenseCategories = ['MAINTENANCE', 'UTILITIES', 'TAXES', 'INSURANCE', 'REPAIRS', 'OTHER'];

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const [expensesData, propertiesData] = await Promise.all([
          apiFetch('/expenses', { token }),
          apiFetch('/properties', { token }),
        ]);

        setExpenses(expensesData);
        setProperties(propertiesData);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Please sign in to log expenses.');
      return;
    }
    setAddingExpense(true);
    setError(null);

    try {
      const newExpense = await apiFetch('/expenses', {
        token,
        method: 'POST',
        body: {
          propertyId: Number(selectedProperty),
          unitId: selectedUnit ? Number(selectedUnit) : undefined,
          description,
          amount: parseFloat(amount),
          date: new Date(date).toISOString(),
          category,
        },
      });
      setExpenses((prevExpenses) => [...prevExpenses, newExpense]);
      // Clear form
      setSelectedProperty('');
      setSelectedUnit('');
      setDescription('');
      setAmount('');
      setDate('');
      setCategory('');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setAddingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!token) {
      setError('Please sign in to remove expenses.');
      return;
    }
    setDeletingId(id);
    try {
      await apiFetch(`/expenses/${id}`, {
        token,
        method: 'DELETE',
      });
      setExpenses((prevExpenses) => prevExpenses.filter((expense) => expense.id !== id));
    } catch (error: any) {
      setError(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const formUnits = useMemo(() => {
    if (!selectedProperty) {
      return [];
    }
    const property = properties.find((p) => p.id === Number(selectedProperty));
    return property?.units ?? [];
  }, [properties, selectedProperty]);

  const filterUnitsOptions = useMemo(() => {
    if (!filterProperty) {
      return [];
    }
    const property = properties.find((p) => p.id === Number(filterProperty));
    return property?.units ?? [];
  }, [properties, filterProperty]);

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const matchesProperty = filterProperty ? expense.propertyId === Number(filterProperty) : true;
        const matchesUnit = filterUnit ? expense.unitId === Number(filterUnit) : true;
        const matchesCategory = filterCategory ? expense.category === filterCategory : true;
        return matchesProperty && matchesUnit && matchesCategory;
      }),
    [expenses, filterProperty, filterUnit, filterCategory],
  );

  const totals = useMemo(() => {
    const overall = expenses.reduce((sum, expense) => sum + (Number.isFinite(expense.amount) ? expense.amount : 0), 0);
    const recent = expenses
      .filter((expense) => {
        if (!expense.date) {
          return false;
        }
        const expenseDate = new Date(expense.date);
        const now = new Date();
        return (
          expenseDate.getFullYear() === now.getFullYear() && expenseDate.getMonth() === now.getMonth()
        );
      })
      .reduce((sum, expense) => sum + (Number.isFinite(expense.amount) ? expense.amount : 0), 0);
    const categoryBreakdown = expenses.reduce<Record<string, number>>((acc, expense) => {
      if (!Number.isFinite(expense.amount)) {
        return acc;
      }
      const key = expense.category ?? 'OTHER';
      acc[key] = (acc[key] ?? 0) + expense.amount;
      return acc;
    }, {});
    return { overall, recent, categoryBreakdown };
  }, [expenses]);

  const formatCurrency = (value?: number): string =>
    value ? value.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : '$0';

  const formatDate = (value?: string): string => {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }
    return parsed.toLocaleDateString();
  };

  const topCategory = useMemo(() => {
    const entries = Object.entries(totals.categoryBreakdown);
    if (entries.length === 0) {
      return null;
    }
    return entries.reduce<[string, number]>((acc, entry) => (entry[1] > acc[1] ? entry : acc), entries[0]);
  }, [totals]);

  const formatCategory = (value?: string): string => {
    if (!value) {
      return 'Other';
    }
    return value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (match) => match.toUpperCase());
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Loading expense data…</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Expense tracking</h1>
        <p className="text-sm text-gray-600">
          Monitor property operating costs, slice spend by category, and log reimbursable items.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total spend</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(totals.overall)}</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">This month</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{formatCurrency(totals.recent)}</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Top category</p>
          <p className="mt-2 text-2xl font-semibold text-indigo-600">
            {topCategory ? formatCurrency(topCategory[1]) : '$0'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {topCategory ? formatCategory(topCategory[0]) : 'No expenses yet'}
          </p>
        </article>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Filter ledger</h2>
            <p className="mt-1 text-sm text-gray-500">Narrow results by property, unit, or category.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-700">
            <label className="flex flex-col">
              Property
              <select
                value={filterProperty}
                onChange={(event) => {
                  setFilterProperty(event.target.value);
                  setFilterUnit('');
                }}
                className="mt-1 w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col">
              Unit
              <select
                value={filterUnit}
                onChange={(event) => setFilterUnit(event.target.value)}
                disabled={filterUnitsOptions.length === 0}
                className="mt-1 w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">All</option>
                {filterUnitsOptions.map((unit: any) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col">
              Category
              <select
                value={filterCategory}
                onChange={(event) => setFilterCategory(event.target.value)}
                className="mt-1 w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All</option>
                {expenseCategories.map((item) => (
                  <option key={item} value={item}>
                    {formatCategory(item)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setFilterProperty('');
                setFilterUnit('');
                setFilterCategory('');
              }}
              className="self-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-lg font-semibold text-gray-900">Expense ledger</h2>
            <p className="text-sm text-gray-500">
              {filteredExpenses.length} record{filteredExpenses.length === 1 ? '' : 's'} selected.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Description</th>
                  <th scope="col" className="px-4 py-3">Property / Unit</th>
                  <th scope="col" className="px-4 py-3">Category</th>
                  <th scope="col" className="px-4 py-3">Date</th>
                  <th scope="col" className="px-4 py-3">Amount</th>
                  <th scope="col" className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                      No expenses match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((expense) => {
                      const propertyName =
                        expense.property?.name ??
                        properties.find((property) => property.id === expense.propertyId)?.name ??
                        `Property #${expense.propertyId}`;
                      const unitName =
                        expense.unit?.name ??
                        filterUnitsOptions.find((unit: any) => unit.id === expense.unitId)?.name ??
                        properties
                          .find((property) => property.id === expense.propertyId)?.units?.find((unit: any) => unit.id === expense.unitId)?.name ??
                        (expense.unitId ? `Unit #${expense.unitId}` : '—');

                      return (
                        <tr key={expense.id} className="align-top">
                          <td className="px-4 py-3 text-gray-700">
                            <div className="font-semibold text-gray-900">{expense.description}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <div>{propertyName}</div>
                            <div className="text-xs text-gray-500">{unitName}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatCategory(expense.category)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(expense.date)}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(expense.amount)}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(expense.id)}
                              disabled={deletingId === expense.id}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-500 disabled:cursor-not-allowed disabled:text-rose-300"
                            >
                              {deletingId === expense.id ? 'Removing…' : 'Remove'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Add expense</h2>
            <p className="mt-1 text-sm text-gray-500">Log maintenance, utilities, and other operating costs.</p>
            <form className="mt-4 space-y-4 text-sm text-gray-700" onSubmit={handleAddExpense}>
              <label className="block text-xs font-medium text-gray-700">
                Property
                <select
                  value={selectedProperty}
                  onChange={(event) => {
                    setSelectedProperty(event.target.value);
                    setSelectedUnit('');
                  }}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-medium text-gray-700">
                Unit (optional)
                <select
                  value={selectedUnit}
                  onChange={(event) => setSelectedUnit(event.target.value)}
                  disabled={formUnits.length === 0}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">—</option>
                  {formUnits.map((unit: any) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-medium text-gray-700">
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select category</option>
                  {expenseCategories.map((item) => (
                    <option key={item} value={item}>
                      {formatCategory(item)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-medium text-gray-700">
                Description
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. HVAC repair invoice"
                />
              </label>

              <label className="block text-xs font-medium text-gray-700">
                Amount
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>

              <label className="block text-xs font-medium text-gray-700">
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>

              <button
                type="submit"
                disabled={addingExpense}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                aria-label={addingExpense ? 'Saving expense' : 'Log expense'}
              >
                {addingExpense ? 'Saving…' : 'Log expense'}
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ExpenseTrackerPage;
