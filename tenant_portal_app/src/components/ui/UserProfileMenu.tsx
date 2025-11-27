import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Settings, 
  LogOut, 
  Edit3, 
  Mail, 
  Phone, 
  MapPin,
  CreditCard,
  Shield,
  Bell,
  X,
  Camera,
  Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

interface UserProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    id: number;
    username: string;
    email?: string;
    phone?: string;
    role: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  isOpen,
  onClose,
  user,
  onLogout
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleLogout = () => {
    // Close menu first
    onClose();
    
    // Call logout from auth context
    logout();
    
    // Call custom logout handler if provided
    if (onLogout) {
      onLogout();
    }
    
    // Navigate to login page
    navigate('/login');
  };

  const handleSave = () => {
    // TODO: Implement save logic
    console.log('Saving profile:', editForm);
    setIsEditing(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div 
        ref={menuRef}
        className="fixed top-20 right-6 z-[100] w-96 animate-in fade-in slide-in-from-top-2 duration-200"
      >
        <div className="relative overflow-hidden rounded-2xl bg-glass-surface backdrop-blur-xl border border-glass-highlight shadow-[0_0_50px_-10px_rgba(0,240,255,0.3)] border-neon-blue/30">
          {/* Grid pattern overlay */}
          <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.03]" />
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-neon-blue to-purple-500 p-[2px]">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    {user?.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User size={24} className="text-white" />
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-sans text-sm font-semibold">
                    {user?.username || 'User'}
                  </h3>
                  <p className="text-[10px] text-neon-blue font-mono uppercase">
                    {user?.role || 'USER'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      placeholder="Username"
                      aria-label="Username"
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm focus:border-neon-blue/50 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="Email"
                      aria-label="Email"
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm focus:border-neon-blue/50 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Phone"
                      aria-label="Phone"
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm focus:border-neon-blue/50 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-neon-blue/20 border border-neon-blue/50 text-neon-blue rounded-lg hover:bg-neon-blue/30 transition-colors text-sm font-semibold"
                    >
                      <Save size={14} />
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({
                          username: user?.username || '',
                          email: user?.email || '',
                          phone: user?.phone || '',
                        });
                      }}
                      className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/10 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  {/* Profile Info */}
                  <div className="space-y-3 pb-4 border-b border-white/10">
                    {user?.email && (
                      <div className="flex items-center gap-3 text-sm">
                        <Mail size={16} className="text-gray-400" />
                        <span className="text-gray-300">{user.email}</span>
                      </div>
                    )}
                    {user?.phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone size={16} className="text-gray-400" />
                        <span className="text-gray-300">{user.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Menu Items */}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 text-left transition-colors group"
                  >
                    <Edit3 size={18} className="text-gray-400 group-hover:text-neon-blue transition-colors" />
                    <span className="text-sm text-gray-300 group-hover:text-white">Edit Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 text-left transition-colors group"
                  >
                    <Settings size={18} className="text-gray-400 group-hover:text-neon-blue transition-colors" />
                    <span className="text-sm text-gray-300 group-hover:text-white">Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      navigate('/billing');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 text-left transition-colors group"
                  >
                    <CreditCard size={18} className="text-gray-400 group-hover:text-neon-blue transition-colors" />
                    <span className="text-sm text-gray-300 group-hover:text-white">Billing & Subscription</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      navigate('/security');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 text-left transition-colors group"
                  >
                    <Shield size={18} className="text-gray-400 group-hover:text-neon-blue transition-colors" />
                    <span className="text-sm text-gray-300 group-hover:text-white">Security & Privacy</span>
                  </button>

                  <div className="pt-2 border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/10 text-left transition-colors group"
                    >
                      <LogOut size={18} className="text-red-400 group-hover:text-red-300 transition-colors" />
                      <span className="text-sm text-red-400 group-hover:text-red-300">Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

