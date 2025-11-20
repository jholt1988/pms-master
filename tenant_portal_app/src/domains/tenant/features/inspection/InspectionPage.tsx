import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../AuthContext';

interface Inspection {
  id: number;
  type: string;
  status: string;
  scheduledDate: string;
  completedDate: string | null;
  notes: string | null;
  findings: any;
  unit: {
    id: number;
    name: string;
    property: {
      id: number;
      name: string;
      address: string;
    };
  };
  inspector: {
    id: number;
    username: string;
  } | null;
  photos: Array<{
    id: number;
    url: string;
    caption: string | null;
    createdAt: string;
  }>;
}

export default function TenantInspectionPage(): React.ReactElement {
  const { token } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  const fetchInspections = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/inspections', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch inspections');
      }

      const data = await response.json();
      setInspections(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load inspections');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return <div className="text-center py-8">Loading inspections...</div>;
  }

  if (error) {
    return <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>;
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Unit Inspections</h1>

      {inspections.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No inspections found for your unit.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {inspections.map((inspection) => (
            <div
              key={inspection.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedInspection(inspection)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{getTypeLabel(inspection.type)}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(inspection.status)}`}>
                      {inspection.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {inspection.unit.property.name} - {inspection.unit.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Scheduled: {new Date(inspection.scheduledDate).toLocaleDateString()}
                  </p>
                  {inspection.completedDate && (
                    <p className="text-sm text-gray-600">
                      Completed: {new Date(inspection.completedDate).toLocaleDateString()}
                    </p>
                  )}
                  {inspection.notes && (
                    <p className="text-sm text-gray-700 mt-2">{inspection.notes}</p>
                  )}
                </div>
                {inspection.photos.length > 0 && (
                  <div className="text-sm text-gray-500">
                    {inspection.photos.length} photo{inspection.photos.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspection Detail Modal */}
      {selectedInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{getTypeLabel(selectedInspection.type)} Inspection</h2>
                <button
                  onClick={() => setSelectedInspection(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700">Property Information</h3>
                  <p className="text-gray-600">
                    {selectedInspection.unit.property.name} - {selectedInspection.unit.name}
                  </p>
                  <p className="text-sm text-gray-500">{selectedInspection.unit.property.address}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700">Status</h3>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(selectedInspection.status)}`}>
                    {selectedInspection.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700">Schedule</h3>
                  <p className="text-gray-600">
                    Scheduled: {new Date(selectedInspection.scheduledDate).toLocaleString()}
                  </p>
                  {selectedInspection.completedDate && (
                    <p className="text-gray-600">
                      Completed: {new Date(selectedInspection.completedDate).toLocaleString()}
                    </p>
                  )}
                </div>

                {selectedInspection.inspector && (
                  <div>
                    <h3 className="font-semibold text-gray-700">Inspector</h3>
                    <p className="text-gray-600">{selectedInspection.inspector.username}</p>
                  </div>
                )}

                {selectedInspection.notes && (
                  <div>
                    <h3 className="font-semibold text-gray-700">Notes</h3>
                    <p className="text-gray-600">{selectedInspection.notes}</p>
                  </div>
                )}

                {selectedInspection.findings && (
                  <div>
                    <h3 className="font-semibold text-gray-700">Findings</h3>
                    <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                      {JSON.stringify(selectedInspection.findings, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedInspection.photos.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Photos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedInspection.photos.map((photo) => (
                        <div key={photo.id} className="relative">
                          <img
                            src={photo.url}
                            alt={photo.caption || 'Inspection photo'}
                            className="w-full h-48 object-cover rounded border border-gray-200"
                          />
                          {photo.caption && (
                            <p className="text-xs text-gray-600 mt-1">{photo.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

