import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';

interface Document {
  id: number;
  fileName: string;
  category: string;
  description: string | null;
  createdAt: string;
  uploadedBy: {
    id: number;
    username: string;
  };
}

export default function DocumentManagementPage(): React.ReactElement {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({
    category: 'OTHER',
    description: '',
  });

  useEffect(() => {
    fetchDocuments();
  }, [categoryFilter]);

  const fetchDocuments = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) {
        params.append('category', categoryFilter);
      }

      const data = await apiFetch(`/documents?${params}`, { token });
      setDocuments(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedFile) {
      if (!selectedFile) {
        setError('Please select a file');
      }
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', uploadData.category);
    if (uploadData.description) {
      formData.append('description', uploadData.description);
    }

    try {
      // File uploads need special handling - use fetch directly with FormData
      const base = import.meta.env.VITE_API_URL ?? '/api';
      const url = `${base.replace(/\/$/, '')}/documents/upload`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to upload document' }));
        throw new Error(errorData.message || 'Failed to upload document');
      }

      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadData({ category: 'OTHER', description: '' });
      fetchDocuments();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    }
  };

  const handleDownload = async (id: number, fileName: string) => {
    if (!token) return;
    try {
      // File downloads need special handling - use fetch directly for blob response
      const base = import.meta.env.VITE_API_URL ?? '/api';
      const url = `${base.replace(/\/$/, '')}/documents/${id}/download`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const urlObj = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(urlObj);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to download document');
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await apiFetch(`/documents/${id}`, {
        token,
        method: 'DELETE',
      });
      fetchDocuments();
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Document Management</h1>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Upload Document
        </button>
      </div>

      <div className="mb-4">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded px-4 py-2"
        >
          <option value="">All Categories</option>
          <option value="LEASE">Lease</option>
          <option value="NOTICE">Notice</option>
          <option value="INVOICE">Invoice</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="APPLICATION">Application</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="border px-4 py-2">File Name</th>
              <th className="border px-4 py-2">Category</th>
              <th className="border px-4 py-2">Description</th>
              <th className="border px-4 py-2">Uploaded By</th>
              <th className="border px-4 py-2">Uploaded At</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="border px-4 py-2 text-center text-gray-500">
                  No documents found
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="border px-4 py-2">{doc.fileName}</td>
                  <td className="border px-4 py-2">{doc.category}</td>
                  <td className="border px-4 py-2">{doc.description || '-'}</td>
                  <td className="border px-4 py-2">{doc.uploadedBy.username}</td>
                  <td className="border px-4 py-2">{new Date(doc.createdAt).toLocaleDateString()}</td>
                  <td className="border px-4 py-2">
                    <button
                      onClick={() => handleDownload(doc.id, doc.fileName)}
                      className="bg-blue-500 hover:bg-blue-700 text-white px-2 py-1 rounded mr-2"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Upload Document</h2>
            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">File</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Category</label>
                <select
                  value={uploadData.category}
                  onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="LEASE">Lease</option>
                  <option value="NOTICE">Notice</option>
                  <option value="INVOICE">Invoice</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="APPLICATION">Application</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Description (Optional)</label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded flex-1">
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setUploadData({ category: 'OTHER', description: '' });
                  }}
                  className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

