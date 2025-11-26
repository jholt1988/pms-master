import React, { useState } from 'react';
import { 
  Settings, 
  Bell, 
  Palette,
  Shield,
  Zap,
  Save,
  X,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingSection {
  title: string;
  icon: React.ReactNode;
  items: SettingItem[];
}

interface SettingItem {
  id: string;
  label: string;
  description?: string;
  type: 'toggle' | 'select' | 'button';
  value?: boolean | string;
  options?: { label: string; value: string }[];
  onChange?: (value: boolean | string) => void;
}

interface SettingsState {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  appearance: {
    theme: string;
    animations: boolean;
    compactMode: boolean;
  };
  privacy: {
    dataSharing: boolean;
    analytics: boolean;
  };
  performance: {
    cacheEnabled: boolean;
    aiEnabled: boolean;
  };
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<SettingsState>({
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    appearance: {
      theme: 'dark',
      animations: true,
      compactMode: false,
    },
    privacy: {
      dataSharing: false,
      analytics: true,
    },
    performance: {
      cacheEnabled: true,
      aiEnabled: true,
    },
  });

  const handleToggle = (category: keyof SettingsState, key: string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !(prev[category] as Record<string, boolean>)[key],
      },
    }));
  };

  const handleSelect = (category: keyof SettingsState, key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const sections: SettingSection[] = [
    {
      title: 'Notifications',
      icon: <Bell size={18} className="text-neon-blue" />,
      items: [
        {
          id: 'email',
          label: 'Email Notifications',
          description: 'Receive notifications via email',
          type: 'toggle',
          value: settings.notifications.email,
          onChange: () => handleToggle('notifications', 'email'),
        },
        {
          id: 'push',
          label: 'Push Notifications',
          description: 'Browser push notifications',
          type: 'toggle',
          value: settings.notifications.push,
          onChange: () => handleToggle('notifications', 'push'),
        },
        {
          id: 'sms',
          label: 'SMS Notifications',
          description: 'Text message alerts',
          type: 'toggle',
          value: settings.notifications.sms,
          onChange: () => handleToggle('notifications', 'sms'),
        },
      ],
    },
    {
      title: 'Appearance',
      icon: <Palette size={18} className="text-neon-purple" />,
      items: [
        {
          id: 'theme',
          label: 'Theme',
          description: 'Interface color scheme',
          type: 'select',
          value: settings.appearance.theme,
          options: [
            { label: 'Dark', value: 'dark' },
            { label: 'Light', value: 'light' },
            { label: 'Auto', value: 'auto' },
          ],
          onChange: (value) => handleSelect('appearance', 'theme', value as string),
        },
        {
          id: 'animations',
          label: 'Animations',
          description: 'Enable UI animations',
          type: 'toggle',
          value: settings.appearance.animations,
          onChange: () => handleToggle('appearance', 'animations'),
        },
        {
          id: 'compactMode',
          label: 'Compact Mode',
          description: 'Reduce spacing and padding',
          type: 'toggle',
          value: settings.appearance.compactMode,
          onChange: () => handleToggle('appearance', 'compactMode'),
        },
      ],
    },
    {
      title: 'Privacy & Security',
      icon: <Shield size={18} className="text-green-400" />,
      items: [
        {
          id: 'dataSharing',
          label: 'Data Sharing',
          description: 'Share anonymized usage data',
          type: 'toggle',
          value: settings.privacy.dataSharing,
          onChange: () => handleToggle('privacy', 'dataSharing'),
        },
        {
          id: 'analytics',
          label: 'Analytics',
          description: 'Help improve the app',
          type: 'toggle',
          value: settings.privacy.analytics,
          onChange: () => handleToggle('privacy', 'analytics'),
        },
      ],
    },
    {
      title: 'Performance',
      icon: <Zap size={18} className="text-yellow-400" />,
      items: [
        {
          id: 'cacheEnabled',
          label: 'Enable Caching',
          description: 'Cache data for faster loading',
          type: 'toggle',
          value: settings.performance.cacheEnabled,
          onChange: () => handleToggle('performance', 'cacheEnabled'),
        },
        {
          id: 'aiEnabled',
          label: 'AI Features',
          description: 'Enable AI-powered features',
          type: 'toggle',
          value: settings.performance.aiEnabled,
          onChange: () => handleToggle('performance', 'aiEnabled'),
        },
      ],
    },
  ];

  const handleSave = () => {
    // TODO: Implement save to backend/localStorage
    console.log('Saving settings:', settings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Settings Panel */}
      <div className="fixed top-0 right-0 h-full w-96 max-w-[90vw] z-[100] animate-in slide-in-from-right duration-300">
        <div className="h-full flex flex-col bg-glass-surface backdrop-blur-xl border-l border-glass-highlight shadow-[0_0_50px_-10px_rgba(112,0,255,0.3)] border-neon-purple/30">
          {/* Grid pattern overlay */}
          <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.03]" />
          
          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <Settings size={20} className="text-neon-purple" />
                <h2 className="text-white font-sans text-lg font-semibold">Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                aria-label="Close settings"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {sections.map((section) => (
                <div key={section.title} className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                    {section.icon}
                    <h3 className="text-white font-sans text-sm font-semibold uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-1">
                          <label className="block text-sm text-white font-medium mb-1">
                            {item.label}
                          </label>
                          {item.description && (
                            <p className="text-xs text-gray-400">{item.description}</p>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          {item.type === 'toggle' && (
                            <button
                              onClick={() => item.onChange?.(!item.value)}
                              className="relative inline-flex items-center"
                              aria-label={`Toggle ${item.label}`}
                            >
                              {item.value ? (
                                <ToggleRight size={32} className="text-neon-blue" />
                              ) : (
                                <ToggleLeft size={32} className="text-gray-600" />
                              )}
                            </button>
                          )}
                          
                          {item.type === 'select' && (
                            <select
                              value={item.value as string}
                              onChange={(e) => item.onChange?.(e.target.value)}
                              className="px-3 py-1.5 bg-black/20 border border-white/10 rounded-lg text-white text-sm focus:border-neon-blue/50 focus:outline-none"
                            >
                              {item.options?.map((option) => (
                                <option key={option.value} value={option.value} className="bg-deep-900">
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-white/5">
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neon-blue/20 border border-neon-blue/50 text-neon-blue rounded-lg hover:bg-neon-blue/30 transition-colors font-semibold"
                >
                  <Save size={16} />
                  Save Settings
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

