import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../AuthContext';
import { apiFetch, toFriendlyApiMessage } from '../../../../services/apiClient';
import { normalizeApiList } from '../../../../utils/normalizeApiList';
import BulkMessageComposer from '../../../../components/messages/BulkMessageComposer';
import BulkMessageStatusPanel from '../../../../components/messages/BulkMessageStatusPanel';

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

/**
 * The messaging page.
 * It allows tenants and property managers to communicate with each other.
 */
const MessagingPage = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkBatches, setBulkBatches] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showNewThreadForm, setShowNewThreadForm] = useState(false);
  const [threadRecipients, setThreadRecipients] = useState<any[]>([]);
  const [threadRecipientId, setThreadRecipientId] = useState('');
  const [threadSubject, setThreadSubject] = useState('');
  const [threadMessage, setThreadMessage] = useState('');
  const [creatingThread, setCreatingThread] = useState(false);
  const { token, user } = useAuth();
  const isPropertyManager = (user as { role?: string } | null)?.role === 'PROPERTY_MANAGER';
  const currentUserName = (user as { username?: string; name?: string } | null)?.username
    ?? (user as { username?: string; name?: string } | null)?.name
    ?? '';

  const fetchMessages = useCallback(
    async (conversationId: number) => {
      try {
        const data = await apiFetch(`/messaging/conversations/${conversationId}/messages`, { token: token ?? undefined });
        const normalizedMessages = normalizeApiList(data, ['messages', 'data', 'items']);
        setMessages(normalizedMessages);
      } catch (error: any) {
        setError(toFriendlyApiMessage(error, 'Failed to fetch messages'));
      }
    },
    [token],
  );

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await apiFetch('/messaging/conversations', { token: token ?? undefined });
        const normalizedConversations = normalizeApiList(data);
        setConversations(normalizedConversations);
        if (normalizedConversations.length > 0) {
          let shouldFetchFirst = false;
          setSelectedConversation((previous: any | null) => {
            if (previous) {
              return previous;
            }
            shouldFetchFirst = true;
            return normalizedConversations[0];
          });
          if (shouldFetchFirst) {
            fetchMessages(normalizedConversations[0].id);
          }
        }
      } catch (error: any) {
        setError(toFriendlyApiMessage(error, 'Failed to fetch conversations'));
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchConversations();
    }
  }, [token, fetchMessages]);

  const fetchBulkResources = useCallback(async () => {
    if (!token || !isPropertyManager) {
      return;
    }
    setBulkLoading(true);
    setBulkError(null);
    try {
      const [batchesData, templatesData] = await Promise.all([
        apiFetch('/messaging/bulk', { token }),
        apiFetch('/messaging/templates', { token }),
      ]);

      setBulkBatches(normalizeApiList(batchesData));
      setTemplates(normalizeApiList(templatesData));
    } catch (fetchError: any) {
      setBulkError(toFriendlyApiMessage(fetchError, 'Failed to load bulk messaging resources'));
    } finally {
      setBulkLoading(false);
    }
  }, [isPropertyManager, token]);

  useEffect(() => {
    if (token && isPropertyManager) {
      fetchBulkResources();
    }
  }, [token, isPropertyManager, fetchBulkResources]);

  useEffect(() => {
    const fetchThreadRecipients = async () => {
      if (!token) {
        return;
      }
      try {
        const endpoint = isPropertyManager ? '/messaging/users' : '/messaging/property-managers';
        const data = await apiFetch(endpoint, { token });
        setThreadRecipients(normalizeApiList(data));
      } catch {
        setThreadRecipients([]);
      }
    };

    fetchThreadRecipients();
  }, [token, isPropertyManager]);

  const handleConversationClick = (conversation: any) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || !token) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      await apiFetch('/messaging/messages', {
        token,
        method: 'POST',
        body: { conversationId: selectedConversation.id, content: newMessage.trim() },
      });
      setNewMessage('');
      fetchMessages(selectedConversation.id);
    } catch (error: any) {
      setError(toFriendlyApiMessage(error, 'Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  const handleCreateThread = async () => {
    if (!token || !threadRecipientId || !threadMessage.trim()) {
      return;
    }

    setCreatingThread(true);
    setError(null);

    try {
      const thread = await apiFetch('/messaging/threads', {
        token,
        method: 'POST',
        body: {
          recipientId: threadRecipientId,
          subject: threadSubject.trim() || undefined,
          content: threadMessage.trim(),
        },
      });

      setConversations((previous) => [thread, ...previous.filter((item) => item.id !== thread.id)]);
      setSelectedConversation(thread);
      setMessages(thread.initialMessage ? [thread.initialMessage] : []);
      setThreadRecipientId('');
      setThreadSubject('');
      setThreadMessage('');
      setShowNewThreadForm(false);
    } catch (createError: any) {
      setError(toFriendlyApiMessage(createError, 'Failed to start thread'));
    } finally {
      setCreatingThread(false);
    }
  };

  if (!token) {
    return <div className="p-4 text-sm text-gray-600">Sign in to access your inbox.</div>;
  }

  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Loading conversations…</div>;
  }

  const getParticipantName = (participant: any): string => (
    participant?.username
    ?? participant?.name
    ?? participant?.user?.username
    ?? participant?.user?.name
    ?? ''
  );

  const getConversationTitle = (conversation: any): string => {
    if (!conversation) {
      return 'Conversation';
    }
    return (
      conversation.title ??
      conversation.subject ??
      (Array.isArray(conversation.participants)
        ? conversation.participants
            .map((participant: any) => getParticipantName(participant))
            .filter(Boolean)
            .join(', ')
        : undefined) ??
      (conversation.property?.name ? `Property ${conversation.property.name}` : undefined) ??
      `Conversation #${conversation.id}`
    );
  };

  const getConversationPreview = (conversation: any): string => {
    if (!conversation) {
      return '';
    }
    if (conversation.lastMessage?.content) {
      return conversation.lastMessage.content;
    }
    if (conversation.preview) {
      return conversation.preview;
    }
    if (Array.isArray(conversation.messages) && conversation.messages.length > 0) {
      return conversation.messages[conversation.messages.length - 1].content ?? '';
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Messaging inbox</h1>
        <p className="text-sm text-gray-600">
          Stay on top of maintenance updates, rent reminders, and chat with staff in real time.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
        <aside className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
                <p className="text-xs text-gray-500">Select a thread to view the conversation.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewThreadForm((value) => !value)}
                className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                {showNewThreadForm ? 'Cancel' : 'New thread'}
              </button>
            </div>

            {showNewThreadForm && (
              <div className="mt-3 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                <select
                  value={threadRecipientId}
                  onChange={(event) => setThreadRecipientId(event.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-xs"
                >
                  <option value="">Select recipient…</option>
                  {threadRecipients.map((recipient) => (
                    <option key={recipient.id} value={recipient.id}>
                      {(recipient.username ?? recipient.name ?? recipient.id)}
                      {recipient.role ? ` (${recipient.role})` : ''}
                      {recipient.email ? ` — ${recipient.email}` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={threadSubject}
                  onChange={(event) => setThreadSubject(event.target.value)}
                  placeholder="Subject (optional)"
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-xs"
                />
                <textarea
                  rows={2}
                  value={threadMessage}
                  onChange={(event) => setThreadMessage(event.target.value)}
                  placeholder="Write your first message…"
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={handleCreateThread}
                  disabled={creatingThread || !threadRecipientId || !threadMessage.trim()}
                  className="w-full rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {creatingThread ? 'Starting…' : 'Start thread'}
                </button>
              </div>
            )}
          </div>
          <ul className="max-h-112 divide-y divide-gray-100 overflow-y-auto text-sm">
            {conversations.length === 0 ? (
              <li className="px-4 py-6 text-center text-gray-500">No conversations yet.</li>
            ) : (
              conversations.map((conversation) => {
                const selected = selectedConversation?.id === conversation.id;
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => handleConversationClick(conversation)}
                      className={`flex w-full flex-col items-start px-4 py-3 text-left transition ${
                        selected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-semibold text-gray-900">
                        {getConversationTitle(conversation)}
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs text-gray-500">
                        {getConversationPreview(conversation) || 'No messages yet.'}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <section className="flex min-h-112 flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
          {selectedConversation ? (
            <>
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  {getConversationTitle(selectedConversation)}
                </h2>
                {selectedConversation.property?.name && (
                  <p className="text-sm text-gray-500">Property: {selectedConversation.property.name}</p>
                )}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.length === 0 ? (
                  <div className="rounded border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500">
                    No messages yet. Start the conversation below.
                  </div>
                ) : (
                  messages.map((message) => {
                    const authorName =
                      message.author?.username ??
                      message.author?.name ??
                      message.sender?.username ??
                      message.sender?.name ??
                      (message.fromTenant ? 'Tenant' : message.fromStaff ? 'Staff' : 'System');
                    const isCurrentUser = currentUserName && authorName === currentUserName;

                    return (
                      <div
                        key={message.id ?? `${message.createdAt}-${message.content}`}
                        className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md rounded-lg px-4 py-2 text-sm shadow-sm ${
                            isCurrentUser
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p className="font-semibold">
                            {isCurrentUser ? 'You' : authorName}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm">{message.content}</p>
                        </div>
                        <span className="mt-1 text-xs text-gray-500">
                          {formatDateTime(message.createdAt ?? message.sentAt ?? message.updatedAt)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <textarea
                    rows={2}
                    value={newMessage}
                    onChange={(event) => setNewMessage(event.target.value)}
                    placeholder="Write a message…"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  >
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-gray-500">
              Select a conversation to view messages.
            </div>
          )}
        </section>
      </div>

      {isPropertyManager && token && (
        <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900">Bulk messaging</h2>
            <p className="text-sm text-gray-500">
              Send targeted announcements with merge-field personalization and track delivery results in real time.
            </p>
          </header>

          {bulkError && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{bulkError}</div>
          )}

          {bulkLoading ? (
            <p className="text-sm text-gray-500">Loading bulk messaging tools…</p>
          ) : (
            <div className="space-y-4">
              <BulkMessageComposer
                token={token}
                templates={templates}
                onBatchCreated={fetchBulkResources}
              />
              <BulkMessageStatusPanel token={token} batches={bulkBatches} onRefresh={fetchBulkResources} />
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default MessagingPage;

