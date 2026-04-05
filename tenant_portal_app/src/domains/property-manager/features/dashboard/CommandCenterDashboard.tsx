import React, { useState } from 'react';
import { Card, Button, Chip, Tabs, Tab } from '@nextui-org/react';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { GlassCard } from '../../../../components/ui/GlassCard';
import { 
  AlertTriangle, 
  MessageSquare, 
  Phone, 
  Mail, 
  Activity, 
  Thermometer, 
  Droplet,
  Zap,
  TrendingUp,
  Inbox
} from 'lucide-react';

// Anomaly Detection Mock Alerts
const AnomalyDetectionAlerts = () => {
  const mockAlerts = [
    {
      id: 1,
      title: 'HVAC Anomalous Usage',
      unit: 'Unit 102',
      details: 'Compressor cycling 40% more frequently than historical average for this temperature.',
      severity: 'warning',
      icon: <Thermometer className="w-5 h-5 text-warning" />
    },
    {
      id: 2,
      title: 'Continuous Water Flow',
      unit: 'Unit 305',
      details: 'Smart meter detects 1.5gal/min continuous flow for past 4 hours. Possible leak.',
      severity: 'danger',
      icon: <Droplet className="w-5 h-5 text-danger" />
    },
    {
      id: 3,
      title: 'Power Spike Detected',
      unit: 'Building A, Main Panel',
      details: 'Voltage irregularity detected on phase 2. Scheduled maintenance recommended.',
      severity: 'primary',
      icon: <Zap className="w-5 h-5 text-primary" />
    }
  ];

  return (
    <GlassCard title="ML Anomaly Detection" subtitle="PREDICTIVE ALERTS" glowColor="purple" className="h-full">
      <div className="space-y-4">
        {mockAlerts.map(alert => (
          <div key={alert.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-4">
            <div className="mt-1">
              {alert.icon}
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-white font-medium">{alert.title}</h4>
                <Chip size="sm" color={alert.severity as any} variant="dot">{alert.unit}</Chip>
              </div>
              <p className="text-sm text-gray-400">{alert.details}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" color="primary" variant="flat">Dispatch Vendor</Button>
                <Button size="sm" color="default" variant="light">Dismiss</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// Omnichannel Inbox Mockup
const OmnichannelInbox = () => {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(['all']));

  const mockMessages = [
    { id: 1, source: 'SMS', from: 'Sara (Unit 102)', preview: 'Can maintenance come tomorrow at 2 PM?', time: '10m ago' },
    { id: 2, source: 'PORTAL', from: 'John (Unit 4B)', preview: 'I attached the signed lease renewal.', time: '1h ago' },
    { id: 3, source: 'EMAIL', from: 'City Utilities', preview: 'Notice of scheduled water shutoff on Friday.', time: '2h ago' }
  ];

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'SMS': return <Phone className="w-4 h-4" />;
      case 'EMAIL': return <Mail className="w-4 h-4" />;
      case 'PORTAL': return <MessageSquare className="w-4 h-4" />;
      default: return <Inbox className="w-4 h-4" />;
    }
  };

  return (
    <GlassCard title="Omnichannel Inbox" subtitle="UNIFIED COMMUNICATIONS" glowColor="blue" className="h-full">
      <Tabs aria-label="Inbox Filters" size="sm" variant="bordered" className="mb-4">
        <Tab key="all" title="All Messages" />
        <Tab key="sms" title="SMS" />
        <Tab key="email" title="Email" />
        <Tab key="portal" title="Portal Chat" />
      </Tabs>

      <div className="space-y-3">
        {mockMessages.map(msg => (
          <div key={msg.id} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border-l-2 border-neon-blue">
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">
                  {getSourceIcon(msg.source)}
                </span>
                <span className="text-white font-medium">{msg.from}</span>
              </div>
              <span className="text-xs text-gray-500">{msg.time}</span>
            </div>
            <p className="text-sm text-gray-300 ml-6 truncate">{msg.preview}</p>
          </div>
        ))}
      </div>
      <Button variant="light" className="w-full mt-4 text-primary">Open Full Inbox</Button>
    </GlassCard>
  );
};

export const CommandCenterDashboard = () => {
  return (
    <div className="space-y-6 p-6" role="main" aria-label="Command Center Dashboard">
      <PageHeader 
        title="Command Center" 
        subtitle="Property management unified interface." 
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <GlassCard className="!p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400 uppercase">Live Occupancy</p>
              <h3 className="text-2xl font-bold text-white mt-1">94.2%</h3>
            </div>
            <Activity className="w-8 h-8 text-success opacity-80" />
          </div>
        </GlassCard>
        
        <GlassCard className="!p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400 uppercase">Pending Maintenance</p>
              <h3 className="text-2xl font-bold text-warning mt-1">12</h3>
            </div>
            <AlertTriangle className="w-8 h-8 text-warning opacity-80" />
          </div>
        </GlassCard>

        <GlassCard className="!p-4 md:col-span-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400 uppercase">Revenue Collected (MTD)</p>
              <h3 className="text-2xl font-bold text-neon-blue mt-1">$142,500</h3>
            </div>
            <TrendingUp className="w-8 h-8 text-neon-blue opacity-80" />
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnomalyDetectionAlerts />
        <OmnichannelInbox />
      </div>
    </div>
  );
};

export default CommandCenterDashboard;
