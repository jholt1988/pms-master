import React, { useState, useEffect } from 'react';
import { Bell, Home, FileText, Wrench, DollarSign, MessageSquare, Calendar, Upload, Check, X, AlertCircle, User, LogOut, Plus, Send, Download, Eye, Clock, CheckCircle, AlertTriangle, CreditCard, Building, Mail, Phone, MapPin, ChevronRight, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  category: string;
}

interface Document {
  id: string;
  name: string;
  type: 'lease' | 'invoice' | 'notice' | 'other';
  uploadedAt: Date;
  size: string;
}

interface Payment {
  id: string;
  amount: number;
  dueDate: Date;
  status: 'paid' | 'pending' | 'overdue';
  type: string;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
}

interface InventoryItem {
  id: string;
  room: string;
  item: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes: string;
  photos: number;
}

export default function TenantPortal() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([
    { id: '1', title: 'Leaking faucet', description: 'Kitchen sink is dripping', status: 'in-progress', priority: 'medium', createdAt: new Date('2024-01-15'), category: 'Plumbing' },
    { id: '2', title: 'AC not cooling', description: 'Air conditioning unit not working properly', status: 'pending', priority: 'high', createdAt: new Date('2024-01-18'), category: 'HVAC' }
  ]);
  const [documents, setDocuments] = useState<Document[]>([
    { id: '1', name: 'Lease Agreement 2024.pdf', type: 'lease', uploadedAt: new Date('2024-01-01'), size: '2.4 MB' },
    { id: '2', name: 'January Rent Invoice.pdf', type: 'invoice', uploadedAt: new Date('2024-01-05'), size: '156 KB' },
    { id: '3', name: 'Move-in Checklist.pdf', type: 'other', uploadedAt: new Date('2024-01-01'), size: '890 KB' }
  ]);
  const [payments, setPayments] = useState<Payment[]>([
    { id: '1', amount: 1500, dueDate: new Date('2024-02-01'), status: 'pending', type: 'Monthly Rent' },
    { id: '2', amount: 1500, dueDate: new Date('2024-01-01'), status: 'paid', type: 'Monthly Rent' },
    { id: '3', amount: 150, dueDate: new Date('2024-01-15'), status: 'paid', type: 'Utilities' }
  ]);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'Property Manager', content: 'Welcome to your new home! Let me know if you need anything.', timestamp: new Date('2024-01-01'), isOwn: false },
    { id: '2', sender: 'You', content: 'Thank you! Everything looks great.', timestamp: new Date('2024-01-01'), isOwn: true }
  ]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([
    { id: '1', room: 'Living Room', item: 'Walls', condition: 'excellent', notes: 'Freshly painted', photos: 2 },
    { id: '2', room: 'Kitchen', item: 'Appliances', condition: 'good', notes: 'All working properly', photos: 3 },
    { id: '3', room: 'Bedroom', item: 'Flooring', condition: 'good', notes: 'Minor wear', photos: 1 }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({ title: '', description: '', category: 'General', priority: 'medium' });
  const [applicationStep, setApplicationStep] = useState(1);
  const [leaseSignatureStatus, setLeaseSignatureStatus] = useState<'unsigned' | 'signed'>('unsigned');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        sender: 'You',
        content: newMessage,
        timestamp: new Date(),
        isOwn: true
      };
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

  const handleSubmitRequest = () => {
    if (newRequest.title && newRequest.description) {
      const request: MaintenanceRequest = {
        id: Date.now().toString(),
        title: newRequest.title,
        description: newRequest.description,
        status: 'pending',
        priority: newRequest.priority as 'low' | 'medium' | 'high',
        createdAt: new Date(),
        category: newRequest.category
      };
      setMaintenanceRequests([request, ...maintenanceRequests]);
      setNewRequest({ title: '', description: '', category: 'General', priority: 'medium' });
      setShowNewRequestForm(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in-progress': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'paid': return 'text-green-600 bg-green-50';
      case 'overdue': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'application', label: 'Application', icon: FileText },
    { id: 'lease', label: 'Lease', icon: FileText },
    { id: 'inventory', label: 'Inventory', icon: CheckCircle },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <Building className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="font-bold text-gray-900">Tenant Portal</h2>
              <p className="text-sm text-gray-500">Apartment 4B</p>
            </div>
          </div>
        </div>
        <nav className="p-4">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors mb-1 ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t">
          <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {sidebarItems.find(item => item.id === activeTab)?.label}
            </h1>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  JD
                </div>
                <div>
                  <p className="font-medium text-gray-900">John Doe</p>
                  <p className="text-sm text-gray-500">Tenant</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Next Payment</h3>
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">$1,500</p>
                  <p className="text-sm text-gray-500 mt-1">Due Feb 1, 2024</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Open Requests</h3>
                    <Wrench className="w-5 h-5 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{maintenanceRequests.filter(r => r.status !== 'completed').length}</p>
                  <p className="text-sm text-gray-500 mt-1">Active maintenance</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Lease Status</h3>
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">Active</p>
                  <p className="text-sm text-gray-500 mt-1">Expires Dec 31, 2024</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border">
                  <div className="p-6 border-b">
                    <h3 className="font-semibold text-gray-900">Recent Maintenance</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {maintenanceRequests.slice(0, 3).map((request) => (
                      <div key={request.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{request.title}</p>
                          <p className="text-sm text-gray-500">{format(request.createdAt, 'MMM d, yyyy')}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border">
                  <div className="p-6 border-b">
                    <h3 className="font-semibold text-gray-900">Recent Messages</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {messages.slice(-3).map((message) => (
                      <div key={message.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                          {message.sender[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{message.sender}</p>
                          <p className="text-sm text-gray-600">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'application' && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold text-gray-900">Rental Application</h2>
                  <p className="text-gray-500 mt-1">Complete your application in a few simple steps</p>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-8">
                    {[1, 2, 3, 4].map((step) => (
                      <div key={step} className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                          applicationStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {applicationStep > step ? <Check className="w-5 h-5" /> : step}
                        </div>
                        {step < 4 && (
                          <div className={`w-24 h-1 ml-2 ${
                            applicationStep > step ? 'bg-blue-600' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>

                  {applicationStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">Personal Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="First Name" className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <input type="text" placeholder="Last Name" className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <input type="email" placeholder="Email Address" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="tel" placeholder="Phone Number" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="date" placeholder="Date of Birth" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}

                  {applicationStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">Employment Information</h3>
                      <input type="text" placeholder="Current Employer" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="text" placeholder="Job Title" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="text" placeholder="Annual Income" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="text" placeholder="Years at Current Job" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}

                  {applicationStep === 3 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">References</h3>
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg">
                          <p className="font-medium text-gray-900 mb-2">Previous Landlord</p>
                          <input type="text" placeholder="Name" className="w-full px-4 py-2 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <input type="tel" placeholder="Phone Number" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="p-4 border rounded-lg">
                          <p className="font-medium text-gray-900 mb-2">Personal Reference</p>
                          <input type="text" placeholder="Name" className="w-full px-4 py-2 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <input type="tel" placeholder="Phone Number" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    </div>
                  )}

                  {applicationStep === 4 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">Document Upload</h3>
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 mb-2">Upload your documents</p>
                          <p className="text-sm text-gray-500 mb-4">ID, Pay Stubs, Bank Statements</p>
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Choose Files</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between mt-8">
                    <button
                      onClick={() => setApplicationStep(Math.max(1, applicationStep - 1))}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      disabled={applicationStep === 1}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setApplicationStep(Math.min(4, applicationStep + 1))}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {applicationStep === 4 ? 'Submit Application' : 'Next'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'lease' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Lease Agreement</h2>
                      <p className="text-gray-500 mt-1">12-month lease starting January 1, 2024</p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                      leaseSignatureStatus === 'signed' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                    }`}>
                      {leaseSignatureStatus === 'signed' ? 'Signed' : 'Pending Signature'}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="bg-gray-50 rounded-lg p-8 mb-6">
                    <div className="flex items-center justify-center mb-4">
                      <FileText className="w-16 h-16 text-gray-400" />
                    </div>
                    <p className="text-center text-gray-600 mb-4">Your lease agreement is ready for review</p>
                    <div className="flex justify-center space-x-4">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                        <Eye className="w-4 h-4" />
                        <span>View Lease</span>
                      </button>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
                        <Download className="w-4 h-4" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Monthly Rent</p>
                      <p className="text-xl font-semibold text-gray-900">$1,500</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Security Deposit</p>
                      <p className="text-xl font-semibold text-gray-900">$1,500</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Lease Start</p>
                      <p className="text-xl font-semibold text-gray-900">Jan 1, 2024</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Lease End</p>
                      <p className="text-xl font-semibold text-gray-900">Dec 31, 2024</p>
                    </div>
                  </div>

                  {leaseSignatureStatus === 'unsigned' && (
                    <div className="border-t pt-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Electronic Signature</h3>
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-600 mb-2">Type your full name to sign electronically</p>
                        <input type="text" placeholder="John Doe" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <button
                        onClick={() => setLeaseSignatureStatus('signed')}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        Sign Lease Agreement
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500">Document the condition of your rental unit</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {inventoryItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.room}</h3>
                          <p className="text-gray-600">{item.item}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.condition === 'excellent' ? 'bg-green-50 text-green-600' :
                          item.condition === 'good' ? 'bg-blue-50 text-blue-600' :
                          item.condition === 'fair' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {item.condition}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{item.notes}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Upload className="w-4 h-4" />
                          <span>{item.photos} photos</span>
                        </div>
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">Edit</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Important Note</h3>
                    <p className="text-sm text-gray-600">Please complete the move-in inventory within 7 days of moving in. Take photos of any existing damage or issues to protect your security deposit.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search requests..."
                      className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>All Status</option>
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowNewRequestForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Request</span>
                </button>
              </div>

              {showNewRequestForm && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Submit New Request</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Issue Title"
                      value={newRequest.title}
                      onChange={(e) => setNewRequest({...newRequest, title: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      placeholder="Describe the issue in detail..."
                      value={newRequest.description}
                      onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <select
                        value={newRequest.category}
                        onChange={(e) => setNewRequest({...newRequest, category: e.target.value})}
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option>General</option>
                        <option>Plumbing</option>
                        <option>Electrical</option>
                        <option>HVAC</option>
                        <option>Appliances</option>
                      </select>
                      <select
                        value={newRequest.priority}
                        onChange={(e) => setNewRequest({...newRequest, priority: e.target.value})}
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Upload photos (optional)</p>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowNewRequestForm(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitRequest}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Submit Request
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {maintenanceRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-xl shadow-sm border">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{request.title}</h3>
                          <p className="text-gray-600 mt-1">{request.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{format(request.createdAt, 'MMM d, yyyy')}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <AlertTriangle className={`w-4 h-4 ${getPriorityColor(request.priority)}`} />
                            <span className={getPriorityColor(request.priority)}>{request.priority}</span>
                          </span>
                          <span>{request.category}</span>
                        </div>
                        <button className="text-blue-600 hover:text-blue-700 font-medium">View Details</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h3 className="font-semibold text-gray-900 mb-2">Current Balance</h3>
                  <p className="text-3xl font-bold text-gray-900">$1,500</p>
                  <p className="text-sm text-gray-500 mt-1">Due Feb 1, 2024</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h3 className="font-semibold text-gray-900 mb-2">Last Payment</h3>
                  <p className="text-3xl font-bold text-green-600">$1,650</p>
                  <p className="text-sm text-gray-500 mt-1">Paid Jan 1, 2024</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h3 className="font-semibold text-gray-900 mb-2">Auto-Pay</h3>
                  <p className="text-3xl font-bold text-blue-600">Active</p>
                  <p className="text-sm text-gray-500 mt-1">Next: Feb 1, 2024</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b">
                  <h3 className="font-semibold text-gray-900">Make a Payment</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount</label>
                      <input
                        type="text"
                        defaultValue="1500.00"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                      <select className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Bank Account ****1234</option>
                        <option>Credit Card ****5678</option>
                        <option>Add New Method</option>
                      </select>
                    </div>
                  </div>
                  <button className="mt-6 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center space-x-2">
                    <CreditCard className="w-5 h-5" />
                    <span>Pay Now</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b">
                  <h3 className="font-semibold text-gray-900">Payment History</h3>
                </div>
                <div className="divide-y">
                  {payments.map((payment) => (
                    <div key={payment.id} className="p-6 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{payment.type}</p>
                        <p className="text-sm text-gray-500">Due {format(payment.dueDate, 'MMM d, yyyy')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">${payment.amount.toFixed(2)}</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>All Types</option>
                    <option>Lease</option>
                    <option>Invoice</option>
                    <option>Notice</option>
                    <option>Other</option>
                  </select>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Upload Document</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        doc.type === 'lease' ? 'bg-purple-50 text-purple-600' :
                        doc.type === 'invoice' ? 'bg-green-50 text-green-600' :
                        doc.type === 'notice' ? 'bg-yellow-50 text-yellow-600' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {doc.type}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{doc.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{doc.size} • {format(doc.uploadedAt, 'MMM d, yyyy')}</p>
                    <div className="flex space-x-2">
                      <button className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center justify-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm font-medium">View</span>
                      </button>
                      <button className="flex-1 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 flex items-center justify-center space-x-1">
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm border flex flex-col" style={{ height: '600px' }}>
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        PM
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Property Manager</h3>
                        <p className="text-sm text-gray-500">Online</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Phone className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Mail className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p>{message.content}</p>
                        <p className={`text-xs mt-1 ${message.isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                          {format(message.timestamp, 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6 border-t">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
