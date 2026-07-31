import React from 'react';
import { ChatWindow, NotificationFeed } from '../../../shared-ui/components';

const AdminChatPage: React.FC = () => {
  // In a real app, user info would come from auth context
  const user = 'admin';
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Admin Live Chat</h2>
      <>
        <ChatWindow user={user} />
        <NotificationFeed />
      </>
    </div>
  );
};

export default AdminChatPage;
