import React, { useState } from 'react';
import { Bell, Inbox, Users, PawPrint, Shield } from 'lucide-react';

interface ApplicationViewProps {
  className?: string;
  userAvatar?: string;
  onNotificationsClick?: () => void;
  onMessagesClick?: () => void;
  onSaveDraft?: () => void;
  onContinue?: () => void;
  onBack?: () => void;
}

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  governmentId?: File;
}

interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  moveInDate: string;
  reasonForMoving: string;
}

interface Income {
  monthlyIncome: string;
  otherIncome?: string;
}

export const ApplicationView: React.FC<ApplicationViewProps> = ({ 
  className = '',
  userAvatar = 'https://app.banani.co/avatar1.jpeg',
  onNotificationsClick,
  onMessagesClick,
  onSaveDraft,
  onContinue,
  onBack
}) => {
  const [personalInfo] = useState<PersonalInfo>({
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@email.com',
    phone: '(555) 555-1234',
    dateOfBirth: ''
  });

  const [address] = useState<Address>({
    street: '123 Main St Apt 4B',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94107',
    moveInDate: '',
    reasonForMoving: 'Relocation for work'
  });

  const [income] = useState<Income>({
    monthlyIncome: '$6,500',
    otherIncome: '$500'
  });

  return (
    <div className={`content ${className}`}>
      <div className="nav-top">
        <div className="row">
          <div className="btn" onClick={onNotificationsClick}>
            <Bell className="w-[16px] h-[16px] mr-1" />
            Alerts
          </div>
          <div className="btn" onClick={onMessagesClick}>
            <Inbox className="w-[16px] h-[16px] mr-1" />
            Messages
          </div>
          <div className="avatar">
            <img 
              src={userAvatar} 
              alt="User avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>
      </div>

      <div className="header">
        <div className="title">Prospective Tenant Application</div>
        <div className="actions">
          <div className="btn" onClick={onSaveDraft}>Save draft</div>
          <div className="btn primary" onClick={onContinue}>Continue</div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">
          <div className="h2">Personal Information</div>
          <span className="hint">Provide your legal name and contact details</span>
        </div>
        <div className="grid-2">
          <div className="col">
            <div className="label">First name</div>
            <div className="input">
              <span>{personalInfo.firstName}</span>
            </div>
          </div>
          <div className="col">
            <div className="label">Last name</div>
            <div className="input">
              <span>{personalInfo.lastName}</span>
            </div>
          </div>
          <div className="col">
            <div className="label">Email</div>
            <div className="input">
              <span>{personalInfo.email}</span>
            </div>
          </div>
          <div className="col">
            <div className="label">Phone</div>
            <div className="input">
              <span>{personalInfo.phone}</span>
            </div>
          </div>
          <div className="col">
            <div className="label">Date of birth</div>
            <div className="input">
              <span>MM / DD / YYYY</span>
            </div>
          </div>
          <div className="col">
            <div className="label">Government ID</div>
            <div className="input">
              <span>Upload image</span>
              <span className="pill">PNG/JPG</span>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">
          <div className="h2">Current Address</div>
          <span className="hint">Tell us where you live now</span>
        </div>
        <div className="grid-2">
          <div className="col">
            <div className="label">Street address</div>
            <div className="input">
              <span>{address.street}</span>
            </div>
          </div>
          <div className="col">
            <div className="label">City</div>
            <div className="input">
              <span>{address.city}</span>
            </div>
          </div>
          <div className="col">
            <div className="label">State</div>
            <div className="input">
              <span>{address.state}</span>
            </div>
          </div>
          <div className="col">
            <div className="label">Postal code</div>
            <div className="input">
              <span>{address.postalCode}</span>
            </div>
          </div>
          <div className="col">
            <div className="label">Move-in date</div>
            <div className="input">
              <span>MM / YYYY</span>
            </div>
          </div>
          <div className="col">
            <div className="label">Reason for moving</div>
            <div className="input">
              <span>{address.reasonForMoving}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">
          <div className="h2">Occupants &amp; Pets</div>
          <span className="hint">List everyone who will live with you</span>
        </div>
        <div className="stack">
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="row" style={{ alignItems: 'center' }}>
              <Users className="w-[18px] h-[18px] mr-2" />
              <div className="hint">Adults: 2 • Children: 1</div>
            </div>
            <div className="btn">Add occupant</div>
          </div>
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="row" style={{ alignItems: 'center' }}>
              <PawPrint className="w-[18px] h-[18px] mr-2" />
              <div className="hint">Pets: 1 (Dog)</div>
            </div>
            <div className="btn">Add pet</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">
          <div className="h2">Income Summary</div>
          <span className="hint">You can add details in the next step</span>
        </div>
        <div className="grid-2">
          <div className="col">
            <div className="label">Monthly income (gross)</div>
            <div className="input">
              <span>{income.monthlyIncome}</span>
            </div>
          </div>
          <div className="col">
            <div className="label">Other income</div>
            <div className="input">
              <span>{income.otherIncome}</span>
              <span className="pill">Optional</span>
            </div>
          </div>
        </div>
      </div>

      <div className="review">
        <div className="left">
          <Shield className="w-[18px] h-[18px] mr-2" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>Data privacy</div>
            <div className="hint">
              Your information is encrypted and only shared with the property manager.
            </div>
          </div>
        </div>
        <div className="row">
          <div className="btn">Download PDF</div>
          <div className="btn primary">Continue to Rental History</div>
        </div>
      </div>

      <div className="footer">
        <div className="helper">Auto-saved 2 mins ago</div>
        <div className="row">
          <div className="btn" onClick={onBack}>Back</div>
          <div className="btn primary" onClick={onContinue}>Save &amp; Continue</div>
        </div>
      </div>
    </div>
  );
};