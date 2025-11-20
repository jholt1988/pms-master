import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Select, SelectItem, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Textarea } from '@nextui-org/react';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, User, AlertCircle, Plus } from 'lucide-react';
import { useAuth } from './AuthContext';

type EventType = 'TOUR' | 'MOVE_IN' | 'MOVE_OUT' | 'LEASE_EXPIRATION' | 'LEASE_RENEWAL' | 'INSPECTION' | 'MAINTENANCE';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type ViewMode = 'daily' | 'weekly' | 'monthly';

interface ScheduleEvent {
  id: number;
  type: EventType;
  title: string;
  date: string;
  time?: string;
  priority: Priority;
  propertyName?: string;
  unitName?: string;
  tenantName?: string;
  status?: string;
}

interface ScheduleSummary {
  totalEvents: number;
  upcomingTours: number;
  urgentCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
}

const SchedulePage: React.FC = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [summary, setSummary] = useState<ScheduleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  
  // Event form state
  const [eventForm, setEventForm] = useState({
    type: 'TOUR' as EventType,
    title: '',
    date: '',
    time: '',
    priority: 'MEDIUM' as Priority,
    description: '',
    propertyId: '',
    unitId: '',
    tenantId: '',
  });

  const API_BASE = 'http://localhost:3000/api';

  const fetchEvents = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const endpoint = viewMode === 'daily' 
        ? `${API_BASE}/schedule/daily?date=${dateStr}`
        : viewMode === 'weekly'
        ? `${API_BASE}/schedule/weekly?startDate=${dateStr}`
        : `${API_BASE}/schedule/monthly?month=${selectedDate.getMonth() + 1}&year=${selectedDate.getFullYear()}`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_BASE}/schedule/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleCreateEvent = async () => {
    try {
      const response = await fetch(`${API_BASE}/schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: eventForm.type,
          title: eventForm.title,
          date: new Date(eventForm.date + 'T' + (eventForm.time || '00:00')),
          priority: eventForm.priority,
          description: eventForm.description,
          propertyId: eventForm.propertyId ? parseInt(eventForm.propertyId) : undefined,
          unitId: eventForm.unitId ? parseInt(eventForm.unitId) : undefined,
          tenantId: eventForm.tenantId ? parseInt(eventForm.tenantId) : undefined,
        }),
      });

      if (response.ok) {
        setIsEventModalOpen(false);
        setEventForm({
          type: 'TOUR',
          title: '',
          date: '',
          time: '',
          priority: 'MEDIUM',
          description: '',
          propertyId: '',
          unitId: '',
          tenantId: '',
        });
        fetchEvents();
        fetchSummary();
      } else {
        console.error('Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedDate]);

  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(selectedDate);
    
    if (direction === 'today') {
      setSelectedDate(new Date());
      return;
    }

    if (viewMode === 'daily') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }

    setSelectedDate(newDate);
  };

  const getEventColor = (type: EventType): string => {
    const colors: Record<EventType, string> = {
      TOUR: 'primary',
      MOVE_IN: 'success',
      MOVE_OUT: 'warning',
      LEASE_EXPIRATION: 'danger',
      LEASE_RENEWAL: 'secondary',
      INSPECTION: 'default',
      MAINTENANCE: 'default',
    };
    return colors[type];
  };

  const getPriorityColor = (priority: Priority): string => {
    const colors: Record<Priority, string> = {
      LOW: 'success',
      MEDIUM: 'warning',
      HIGH: 'warning',
      URGENT: 'danger',
    };
    return colors[priority];
  };

  const filteredEvents = events.filter(event => {
    if (filterType !== 'all' && event.type !== filterType) return false;
    if (filterPriority !== 'all' && event.priority !== filterPriority) return false;
    return true;
  });

  const groupEventsByDate = () => {
    const grouped: Record<string, ScheduleEvent[]> = {};
    filteredEvents.forEach(event => {
      const dateKey = new Date(event.date).toLocaleDateString();
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    return grouped;
  };

  const groupedEvents = groupEventsByDate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-500 mt-1">Manage tours, inspections, and property events</p>
        </div>
        <Button
          color="primary"
          startContent={<Plus size={20} />}
          onClick={() => setIsEventModalOpen(true)}
        >
          Add Event
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-primary">{summary.totalEvents}</p>
              <p className="text-sm text-gray-600">Total Events</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-success">{summary.upcomingTours}</p>
              <p className="text-sm text-gray-600">Upcoming Tours</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-danger">{summary.urgentCount}</p>
              <p className="text-sm text-gray-600">Urgent</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-warning">{summary.highPriorityCount}</p>
              <p className="text-sm text-gray-600">High Priority</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-default-500">{summary.mediumPriorityCount}</p>
              <p className="text-sm text-gray-600">Medium Priority</p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap items-center gap-4">
            {/* View Mode */}
            <div className="flex gap-2">
              <Button
                size="sm"
                color={viewMode === 'daily' ? 'primary' : 'default'}
                variant={viewMode === 'daily' ? 'solid' : 'bordered'}
                onClick={() => setViewMode('daily')}
              >
                Daily
              </Button>
              <Button
                size="sm"
                color={viewMode === 'weekly' ? 'primary' : 'default'}
                variant={viewMode === 'weekly' ? 'solid' : 'bordered'}
                onClick={() => setViewMode('weekly')}
              >
                Weekly
              </Button>
              <Button
                size="sm"
                color={viewMode === 'monthly' ? 'primary' : 'default'}
                variant={viewMode === 'monthly' ? 'solid' : 'bordered'}
                onClick={() => setViewMode('monthly')}
              >
                Monthly
              </Button>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                isIconOnly
                variant="bordered"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft size={20} />
              </Button>
              <span className="text-sm font-medium px-3">
                {selectedDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: viewMode !== 'monthly' ? 'numeric' : undefined, 
                  year: 'numeric' 
                })}
              </span>
              <Button
                size="sm"
                isIconOnly
                variant="bordered"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight size={20} />
              </Button>
              <Button
                size="sm"
                variant="flat"
                onClick={() => navigateDate('today')}
              >
                Today
              </Button>
            </div>

            {/* Filters */}
            <Select
              size="sm"
              label="Event Type"
              className="max-w-xs"
              selectedKeys={[filterType]}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <SelectItem key="all" value="all">All Types</SelectItem>
              <SelectItem key="TOUR" value="TOUR">Tours</SelectItem>
              <SelectItem key="MOVE_IN" value="MOVE_IN">Move-ins</SelectItem>
              <SelectItem key="MOVE_OUT" value="MOVE_OUT">Move-outs</SelectItem>
              <SelectItem key="LEASE_EXPIRATION" value="LEASE_EXPIRATION">Lease Expirations</SelectItem>
              <SelectItem key="LEASE_RENEWAL" value="LEASE_RENEWAL">Lease Renewals</SelectItem>
              <SelectItem key="INSPECTION" value="INSPECTION">Inspections</SelectItem>
              <SelectItem key="MAINTENANCE" value="MAINTENANCE">Maintenance</SelectItem>
            </Select>

            <Select
              size="sm"
              label="Priority"
              className="max-w-xs"
              selectedKeys={[filterPriority]}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <SelectItem key="all" value="all">All Priorities</SelectItem>
              <SelectItem key="URGENT" value="URGENT">Urgent</SelectItem>
              <SelectItem key="HIGH" value="HIGH">High</SelectItem>
              <SelectItem key="MEDIUM" value="MEDIUM">Medium</SelectItem>
              <SelectItem key="LOW" value="LOW">Low</SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Events List */}
      <div className="space-y-6">
        {Object.keys(groupedEvents).length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No events scheduled for this period</p>
            </CardBody>
          </Card>
        ) : (
          Object.entries(groupedEvents).map(([date, dateEvents]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{date}</h3>
                <Chip size="sm" color="primary">{dateEvents.length}</Chip>
              </div>
              <div className="space-y-3">
                {dateEvents.map(event => (
                  <Card key={event.id}>
                    <CardBody>
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Chip
                              color={getEventColor(event.type) as any}
                              variant="flat"
                              size="sm"
                            >
                              {event.type.replace(/_/g, ' ')}
                            </Chip>
                            <Chip
                              color={getPriorityColor(event.priority) as any}
                              variant="dot"
                              size="sm"
                            >
                              {event.priority}
                            </Chip>
                            {event.status && (
                              <Chip size="sm" variant="bordered">
                                {event.status}
                              </Chip>
                            )}
                          </div>
                          <h4 className="font-semibold text-lg mb-2">{event.title}</h4>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            {event.time && (
                              <div className="flex items-center gap-1">
                                <Clock size={14} />
                                <span>{event.time}</span>
                              </div>
                            )}
                            {event.propertyName && (
                              <div className="flex items-center gap-1">
                                <MapPin size={14} />
                                <span>{event.propertyName}</span>
                              </div>
                            )}
                            {event.unitName && (
                              <div className="flex items-center gap-1">
                                <span>Unit: {event.unitName}</span>
                              </div>
                            )}
                            {event.tenantName && (
                              <div className="flex items-center gap-1">
                                <User size={14} />
                                <span>{event.tenantName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {event.priority === 'URGENT' && (
                          <div className="flex items-center gap-2 text-danger">
                            <AlertCircle size={20} />
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Event Modal */}
      <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} size="2xl">
        <ModalContent>
          <ModalHeader>Add New Event</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Event Type"
                  selectedKeys={[eventForm.type]}
                  onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as EventType })}
                >
                  <SelectItem key="TOUR" value="TOUR">Tour</SelectItem>
                  <SelectItem key="MOVE_IN" value="MOVE_IN">Move In</SelectItem>
                  <SelectItem key="MOVE_OUT" value="MOVE_OUT">Move Out</SelectItem>
                  <SelectItem key="LEASE_EXPIRATION" value="LEASE_EXPIRATION">Lease Expiration</SelectItem>
                  <SelectItem key="LEASE_RENEWAL" value="LEASE_RENEWAL">Lease Renewal</SelectItem>
                  <SelectItem key="INSPECTION" value="INSPECTION">Inspection</SelectItem>
                  <SelectItem key="MAINTENANCE" value="MAINTENANCE">Maintenance</SelectItem>
                </Select>

                <Select
                  label="Priority"
                  selectedKeys={[eventForm.priority]}
                  onChange={(e) => setEventForm({ ...eventForm, priority: e.target.value as Priority })}
                >
                  <SelectItem key="LOW" value="LOW">Low</SelectItem>
                  <SelectItem key="MEDIUM" value="MEDIUM">Medium</SelectItem>
                  <SelectItem key="HIGH" value="HIGH">High</SelectItem>
                  <SelectItem key="URGENT" value="URGENT">Urgent</SelectItem>
                </Select>
              </div>

              <Input
                label="Title"
                placeholder="e.g., Property Tour - 123 Main St"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                isRequired
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  isRequired
                />
                <Input
                  label="Time"
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                />
              </div>

              <Textarea
                label="Description"
                placeholder="Add event details..."
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                minRows={3}
              />

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Property ID (optional)"
                  type="number"
                  placeholder="1"
                  value={eventForm.propertyId}
                  onChange={(e) => setEventForm({ ...eventForm, propertyId: e.target.value })}
                />
                <Input
                  label="Unit ID (optional)"
                  type="number"
                  placeholder="1"
                  value={eventForm.unitId}
                  onChange={(e) => setEventForm({ ...eventForm, unitId: e.target.value })}
                />
                <Input
                  label="Tenant ID (optional)"
                  type="number"
                  placeholder="1"
                  value={eventForm.tenantId}
                  onChange={(e) => setEventForm({ ...eventForm, tenantId: e.target.value })}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={() => setIsEventModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              color="primary" 
              onClick={handleCreateEvent}
              isDisabled={!eventForm.title || !eventForm.date}
            >
              Create Event
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default SchedulePage;
