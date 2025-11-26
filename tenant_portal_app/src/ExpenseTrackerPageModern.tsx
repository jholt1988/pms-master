import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';
import { StatsCard, FilterBar, DataTable, PageHeader } from './components/ui';
import { Card, CardBody, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Select, SelectItem, useDisclosure } from '@nextui-org/react';

interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
  category: string;
  property?: {
    id: number;
    name: string;
  };
  unit?: {
    id: number;
    name: string;
  };
}

interface Property {
  id: number;
  name: string;
  units: Array<{
    id: number;
    name: string;
  }>;
}

const expenseCategories = ['MAINTENANCE', 'UTILITIES', 'TAXES', 'INSURANCE', 'REPAIRS', 'OTHER'];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatCategory = (category: string): string => {
  return category.toLowerCase().replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const ExpenseTrackerPageModern = () => {
  const { token } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingExpense, setAddingExpense] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Filters
  const [filterProperty, setFilterProperty] = useState<string>('');
  const [filterUnit, setFilterUnit] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');

  // Add expense form
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Calculate totals
  const totals = useMemo(() => {
    const overall = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const recent = expenses
      .filter(exp => new Date(exp.date) >= thisMonth)
      .reduce((sum, exp) => sum + exp.amount, 0);

    return { overall, recent };
  }, [expenses]);

  // Top category
  const topCategory = useMemo(() => {
    const categoryTotals = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    const entries = Object.entries(categoryTotals);
    return entries.length > 0 ? entries.reduce((max, curr) => curr[1] > max[1] ? curr : max) : null;
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      if (filterProperty && expense.property?.id !== Number(filterProperty)) return false;
      if (filterUnit && expense.unit?.id !== Number(filterUnit)) return false;
      if (filterCategory && expense.category !== filterCategory) return false;
      return true;
    });
  }, [expenses, filterProperty, filterUnit, filterCategory]);

  // Filter units based on selected property
  const filterUnits = useMemo(() => {
    if (!filterProperty) return [];
    const property = properties.find(p => p.id === Number(filterProperty));
    return property?.units || [];
  }, [filterProperty, properties]);

  // Available units for selected property in add form
  const availableUnits = useMemo(() => {
    if (!selectedProperty) return [];
    const property = properties.find(p => p.id === Number(selectedProperty));
    return property?.units || [];
  }, [selectedProperty, properties]);

  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const [expensesData, propertiesData] = await Promise.all([
        apiFetch('/expenses', { token }),
        apiFetch('/properties', { token }),
      ]);

      setExpenses(expensesData);
      setProperties(propertiesData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = event.target;
    if (name === 'property') {
      setFilterProperty(value);
      setFilterUnit(''); // Reset unit filter when property changes
    } else if (name === 'unit') {
      setFilterUnit(value);
    } else if (name === 'category') {
      setFilterCategory(value);
    }
  };

  const resetFilters = () => {
    setFilterProperty('');
    setFilterUnit('');
    setFilterCategory('');
  };

  const handleAddExpense = async () => {
    if (!token || addingExpense) return;

    try {
      setAddingExpense(true);
      setError(null);

      await apiFetch('/expenses', {
        token,
        method: 'POST',
        body: {
          description,
          amount: parseFloat(amount),
          date,
          category,
          propertyId: selectedProperty ? Number(selectedProperty) : undefined,
          unitId: selectedUnit ? Number(selectedUnit) : undefined,
        },
      });

      // Reset form
      setDescription('');
      setAmount('');
      setDate('');
      setCategory('');
      setSelectedProperty('');
      setSelectedUnit('');
      
      await fetchData();
      onOpenChange();
    } catch (err) {
      console.error('Error adding expense:', err);
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setAddingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!token || deletingId) return;

    try {
      setDeletingId(id);
      setError(null);

      await apiFetch(`/expenses/${id}`, {
        token,
        method: 'DELETE',
      });

      await fetchData();
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
    } finally {
      setDeletingId(null);
    }
  };

  if (!token) {
    return (
      <div className="p-4">
        <Card>
          <CardBody className="text-center">
            Please sign in to view expense tracking.
          </CardBody>
        </Card>
      </div>
    );
  }

  const breadcrumbs = [
    { label: 'Dashboard', href: '/' },
    { label: 'Expense Tracking' }
  ];

  const filterConfigs = [
    {
      name: 'property',
      label: 'Property',
      value: filterProperty,
      options: properties.map(p => ({ value: String(p.id), label: p.name })),
      onChange: handleFilterChange,
    },
    {
      name: 'unit',
      label: 'Unit',
      value: filterUnit,
      options: filterUnits.map(u => ({ value: String(u.id), label: u.name })),
      disabled: filterUnits.length === 0,
      onChange: handleFilterChange,
    },
    {
      name: 'category',
      label: 'Category',
      value: filterCategory,
      options: expenseCategories.map(c => ({ value: c, label: formatCategory(c) })),
      onChange: handleFilterChange,
    },
  ];

  const expenseColumns = [
    {
      key: 'description',
      label: 'Description',
      render: (expense: Expense) => expense.description,
    },
    {
      key: 'property',
      label: 'Property / Unit',
      render: (expense: Expense) => (
        <div>
          <div className="font-medium">{expense.property?.name || 'No property'}</div>
          {expense.unit && <div className="text-sm text-foreground-500">{expense.unit.name}</div>}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (expense: Expense) => formatCategory(expense.category),
    },
    {
      key: 'date',
      label: 'Date',
      render: (expense: Expense) => new Date(expense.date).toLocaleDateString(),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (expense: Expense) => formatCurrency(expense.amount),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (expense: Expense) => (
        <Button
          color="danger"
          size="sm"
          variant="flat"
          isLoading={deletingId === expense.id}
          onClick={() => handleDeleteExpense(expense.id)}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Expense Tracking"
        subtitle="Monitor property operating costs, slice spend by category, and log reimbursable items."
        breadcrumbs={breadcrumbs}
        actions={
          <Button color="primary" onPress={onOpen}>
            Add Expense
          </Button>
        }
      />

      {error && (
        <Card className="border-danger-200 bg-danger-50">
          <CardBody>
            <p className="text-sm text-danger-700">{error}</p>
          </CardBody>
        </Card>
      )}

      {/* Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total Spend"
          value={formatCurrency(totals.overall)}
          valueColor="default"
        />
        <StatsCard
          title="This Month"
          value={formatCurrency(totals.recent)}
          valueColor="warning"
        />
        <StatsCard
          title="Top Category"
          value={topCategory ? formatCurrency(topCategory[1]) : '$0'}
          valueColor="primary"
          subtitle={topCategory ? formatCategory(topCategory[0]) : 'No expenses yet'}
        />
      </section>

      {/* Filter Bar */}
      <FilterBar
        title="Filter Ledger"
        description="Narrow results by property, unit, or category."
        filters={filterConfigs}
      />
      <div className="flex justify-end">
        <Button variant="flat" onClick={resetFilters} size="sm">
          Reset Filters
        </Button>
      </div>

      {/* Expense Table */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section>
          <DataTable
            title="Expense Ledger"
            subtitle={`${filteredExpenses.length} record${filteredExpenses.length === 1 ? '' : 's'} selected.`}
            columns={expenseColumns}
            data={filteredExpenses}
            loading={loading}
            emptyContent="No expenses found."
          />
        </section>

        {/* Sidebar for additional info */}
        <aside className="space-y-4">
          <Card>
            <CardBody>
              <h3 className="font-semibold text-foreground mb-2">Expense Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Expenses:</span>
                  <span className="font-medium">{expenses.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Filtered Results:</span>
                  <span className="font-medium">{filteredExpenses.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Amount:</span>
                  <span className="font-medium">
                    {filteredExpenses.length > 0 
                      ? formatCurrency(filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0) / filteredExpenses.length)
                      : '$0'
                    }
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>

      {/* Add Expense Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Add New Expense</ModalHeader>
              <ModalBody>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter expense description"
                    isRequired
                  />
                  <Input
                    label="Amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    startContent="$"
                    isRequired
                  />
                  <Input
                    label="Date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    isRequired
                  />
                  <Select
                    label="Category"
                    selectedKeys={category ? [category] : []}
                    onChange={(e) => setCategory(e.target.value)}
                    isRequired
                  >
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {formatCategory(cat)}
                      </SelectItem>
                    ))}
                  </Select>
                  <Select
                    label="Property"
                    selectedKeys={selectedProperty ? [selectedProperty] : []}
                    onChange={(e) => {
                      setSelectedProperty(e.target.value);
                      setSelectedUnit('');
                    }}
                  >
                    {[{ id: '', name: 'No property' }, ...properties].map((prop) => (
                      <SelectItem key={prop.id || 'none'} value={String(prop.id)}>
                        {prop.name}
                      </SelectItem>
                    ))}
                  </Select>
                  <Select
                    label="Unit"
                    selectedKeys={selectedUnit ? [selectedUnit] : []}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    isDisabled={!selectedProperty || availableUnits.length === 0}
                  >
                    {[{ id: '', name: 'No unit' }, ...availableUnits].map((unit) => (
                      <SelectItem key={unit.id || 'none'} value={String(unit.id)}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleAddExpense}
                  isLoading={addingExpense}
                  isDisabled={!description || !amount || !date || !category}
                >
                  Add Expense
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default ExpenseTrackerPageModern;