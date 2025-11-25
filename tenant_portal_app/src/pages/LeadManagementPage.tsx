/**
 * Lead Management Page
 * Property Manager dashboard for viewing and managing leads from AI Leasing Agent
 * Shows all leads, conversation history, tours, and applications
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, MessageSquare, Calendar, FileText, Filter, Search, 
  Phone, Mail, DollarSign, Home, Clock, CheckCircle, XCircle,
  AlertCircle, TrendingUp, Eye, ChevronRight, Download
} from 'lucide-react';

interface Lead {
  id: string;
  sessionId: string;
  name?: string;
  email?: string;
  phone?: string;
  bedrooms?: number;
  bathrooms?: number;
  budget?: number;
  moveInDate?: string;
  petFriendly?: boolean;
  preferences?: string[];
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'TOURING' | 'APPLYING' | 'APPROVED' | 'DENIED' | 'CONVERTED' | 'LOST' | 'ARCHIVED';
  source?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
    tours: number;
    applications: number;
  };
}

interface LeadMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
}

interface LeadStats {
  total: number;
  new: number;
  qualified: number;
  touring: number;
  converted: number;
  lost: number;
  conversionRate: number;
}

export const LeadManagementPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showConversation, setShowConversation] = useState(false);

  const API_BASE_URL = '/api/leasing';

  // Fetch leads and stats on mount
  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [statusFilter]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`${API_BASE_URL}/leads?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      // Set mock data for demo
      setLeads(getMockLeads());
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/statistics`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set mock stats
      setStats({
        total: 45,
        new: 12,
        qualified: 18,
        touring: 8,
        converted: 5,
        lost: 2,
        conversionRate: 11.1,
      });
    }
  };

  const fetchConversation = async (leadId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/leads/${leadId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        setShowConversation(true);
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
      setMessages(getMockMessages());
      setShowConversation(true);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Refresh leads
        fetchLeads();
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search) ||
      lead.phone?.includes(search)
    );
  });

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      NEW: 'bg-blue-100 text-blue-800',
      CONTACTED: 'bg-purple-100 text-purple-800',
      QUALIFIED: 'bg-green-100 text-green-800',
      TOURING: 'bg-yellow-100 text-yellow-800',
      APPLYING: 'bg-orange-100 text-orange-800',
      APPROVED: 'bg-emerald-100 text-emerald-800',
      DENIED: 'bg-red-100 text-red-800',
      CONVERTED: 'bg-teal-100 text-teal-800',
      LOST: 'bg-gray-100 text-gray-800',
      ARCHIVED: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'NEW':
        return <AlertCircle className="w-4 h-4" />;
      case 'QUALIFIED':
        return <CheckCircle className="w-4 h-4" />;
      case 'CONVERTED':
        return <TrendingUp className="w-4 h-4" />;
      case 'LOST':
      case 'DENIED':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lead Management</h1>
          <p className="text-gray-600">View and manage all leads from the AI Leasing Agent</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Leads</h3>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">New Leads</h3>
                <AlertCircle className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.new}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Qualified</h3>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.qualified}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Conversion Rate</h3>
                <TrendingUp className="w-5 h-5 text-teal-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.conversionRate}%</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leads List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              {/* Filters */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="QUALIFIED">Qualified</option>
                      <option value="TOURING">Touring</option>
                      <option value="APPLYING">Applying</option>
                      <option value="CONVERTED">Converted</option>
                    </select>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Filter className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Leads Table */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading leads...</p>
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No leads found</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lead
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Activity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-semibold">
                                  {lead.name?.[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {lead.name || 'Anonymous'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatDate(lead.createdAt)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {lead.bedrooms && (
                                <div className="flex items-center mb-1">
                                  <Home className="w-4 h-4 mr-1 text-gray-400" />
                                  {lead.bedrooms} bed / {lead.bathrooms || 1} bath
                                </div>
                              )}
                              {lead.budget && (
                                <div className="flex items-center">
                                  <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                                  ${lead.budget.toLocaleString()}/mo
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                              {getStatusIcon(lead.status)}
                              {lead.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex gap-3">
                              {lead._count && (
                                <>
                                  <span className="flex items-center">
                                    <MessageSquare className="w-4 h-4 mr-1" />
                                    {lead._count.messages}
                                  </span>
                                  <span className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-1" />
                                    {lead._count.tours}
                                  </span>
                                  <span className="flex items-center">
                                    <FileText className="w-4 h-4 mr-1" />
                                    {lead._count.applications}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchConversation(lead.id);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Lead Details Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow sticky top-6">
              {selectedLead ? (
                <>
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-900">Lead Details</h2>
                      <button
                        onClick={() => setSelectedLead(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    </div>

                    <div className="flex items-center mb-4">
                      <div className="shrink-0 h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-2xl">
                          {selectedLead.name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedLead.name || 'Anonymous'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Created {formatDate(selectedLead.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Status Update */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Update Status
                      </label>
                      <select
                        value={selectedLead.status}
                        onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="NEW">New</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="QUALIFIED">Qualified</option>
                        <option value="TOURING">Touring</option>
                        <option value="APPLYING">Applying</option>
                        <option value="APPROVED">Approved</option>
                        <option value="DENIED">Denied</option>
                        <option value="CONVERTED">Converted</option>
                        <option value="LOST">Lost</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Contact Info */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h4>
                      {selectedLead.email && (
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <a href={`mailto:${selectedLead.email}`} className="hover:text-blue-600">
                            {selectedLead.email}
                          </a>
                        </div>
                      )}
                      {selectedLead.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <a href={`tel:${selectedLead.phone}`} className="hover:text-blue-600">
                            {selectedLead.phone}
                          </a>
                        </div>
                      )}
                      {!selectedLead.email && !selectedLead.phone && (
                        <p className="text-sm text-gray-500 italic">No contact info yet</p>
                      )}
                    </div>

                    {/* Preferences */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Preferences</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        {selectedLead.bedrooms && (
                          <div className="flex items-center">
                            <Home className="w-4 h-4 mr-2 text-gray-400" />
                            {selectedLead.bedrooms} bed / {selectedLead.bathrooms || 1} bath
                          </div>
                        )}
                        {selectedLead.budget && (
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                            Up to ${selectedLead.budget.toLocaleString()}/month
                          </div>
                        )}
                        {selectedLead.moveInDate && (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            Move-in: {selectedLead.moveInDate}
                          </div>
                        )}
                        {selectedLead.petFriendly !== undefined && (
                          <div className="flex items-center">
                            <Home className="w-4 h-4 mr-2 text-gray-400" />
                            {selectedLead.petFriendly ? 'Pet friendly required' : 'No pets'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amenities */}
                    {selectedLead.preferences && selectedLead.preferences.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Desired Amenities</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedLead.preferences.map((pref, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                            >
                              {pref}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-4 space-y-2">
                      <button
                        onClick={() => fetchConversation(selectedLead.id)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        View Conversation
                      </button>
                      {selectedLead.email && (
                        <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                          <Mail className="w-4 h-4" />
                          Send Email
                        </button>
                      )}
                      {selectedLead.phone && (
                        <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                          <Phone className="w-4 h-4" />
                          Call Lead
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select a lead to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conversation Modal */}
        {showConversation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Conversation with {selectedLead?.name || 'Lead'}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Download Transcript"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowConversation(false)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-4 ${
                          msg.role === 'USER'
                            ? 'bg-blue-600 text-white'
                            : msg.role === 'SYSTEM'
                            ? 'bg-gray-100 text-gray-600 italic'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p
                          className={`text-xs mt-2 ${
                            msg.role === 'USER' ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message to take over the conversation..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Send
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Send a message to take over the conversation from the AI agent
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Mock data for demo
const getMockLeads = (): Lead[] => [
  {
    id: '1',
    sessionId: 'session-1',
    name: 'John Smith',
    email: 'john@example.com',
    phone: '555-123-4567',
    bedrooms: 2,
    bathrooms: 1,
    budget: 1800,
    moveInDate: 'January 2026',
    petFriendly: true,
    preferences: ['parking', 'gym', 'laundry'],
    status: 'QUALIFIED',
    source: 'website',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { messages: 12, tours: 2, applications: 0 },
  },
  {
    id: '2',
    sessionId: 'session-2',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    phone: '555-987-6543',
    bedrooms: 1,
    bathrooms: 1,
    budget: 1500,
    moveInDate: 'ASAP',
    petFriendly: false,
    preferences: ['pool', 'ac'],
    status: 'NEW',
    source: 'website',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    _count: { messages: 5, tours: 0, applications: 0 },
  },
];

const getMockMessages = (): LeadMessage[] => [
  {
    id: '1',
    role: 'ASSISTANT',
    content: '👋 Hi! I\'m your AI Leasing Agent. How can I help you find your perfect home today?',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    role: 'USER',
    content: 'Hi, I\'m looking for a 2 bedroom apartment with parking',
    createdAt: new Date(Date.now() - 3500000).toISOString(),
  },
  {
    id: '3',
    role: 'ASSISTANT',
    content: 'Great! I can help you find a 2-bedroom apartment with parking. What\'s your budget range?',
    createdAt: new Date(Date.now() - 3400000).toISOString(),
  },
];

export default LeadManagementPage;
