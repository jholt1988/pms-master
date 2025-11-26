import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Button, Card, CardBody, CardHeader, Chip } from '@nextui-org/react';
import { apiFetch } from './services/apiClient';

interface QuickBooksConnection {
  id: number;
  companyId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function QuickBooksPage(): React.ReactElement {
  const { token } = useAuth();
  const [connections, setConnections] = useState<QuickBooksConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConnections = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch('/quickbooks/connections', { token });
        setConnections(data.data || []);
      } catch (err: any) {
        setConnections([]);
        setError(err.message || 'Failed to load QuickBooks connections');
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [token]);

  const handleConnect = () => {
    // Redirect to the QuickBooks OAuth flow
    window.location.href = '/api/quickbooks/auth';
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">QuickBooks Integration</h1>
      {error && <p className="text-danger">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Your Connections</h2>
          </CardHeader>
          <CardBody>
            {connections.length === 0 ? (
              <div className="text-center">
                <p className="mb-4">You have no active QuickBooks connections.</p>
                <Button color="primary" onClick={handleConnect}>
                  Connect to QuickBooks
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {connections.map((connection) => (
                  <Card key={connection.id}>
                    <CardBody>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold">Company ID: {connection.companyId}</p>
                          <p className="text-sm text-gray-500">
                            Connected on {new Date(connection.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Chip color={connection.isActive ? 'success' : 'danger'}>
                          {connection.isActive ? 'Active' : 'Inactive'}
                        </Chip>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
