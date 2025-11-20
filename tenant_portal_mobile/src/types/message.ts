/**
 * Message Type Definitions
 * Tenant-Property Manager messaging system
 */

/**
 * Message status
 */
export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

/**
 * Message thread status
 */
export enum ThreadStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  CLOSED = 'CLOSED',
}

/**
 * Message sender type
 */
export enum SenderType {
  TENANT = 'TENANT',
  PROPERTY_MANAGER = 'PROPERTY_MANAGER',
  SYSTEM = 'SYSTEM',
}

/**
 * Message interface
 */
export interface Message {
  id: number;
  threadId: number;
  senderId: number;
  senderType: SenderType;
  senderName: string;
  content: string;
  status: MessageStatus;
  attachments?: MessageAttachment[];
  createdAt: string;
  readAt?: string;
}

/**
 * Message attachment
 */
export interface MessageAttachment {
  id: number;
  messageId: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  createdAt: string;
}

/**
 * Message thread (conversation)
 */
export interface MessageThread {
  id: number;
  tenantId: number;
  propertyManagerId: number;
  subject: string;
  status: ThreadStatus;
  lastMessage?: Message;
  unreadCount: number;
  participantName: string; // Name of the other participant
  createdAt: string;
  updatedAt: string;
}

/**
 * Create message request
 */
export interface CreateMessageDto {
  threadId?: number; // Optional for new thread
  subject?: string; // Required for new thread
  content: string;
  attachments?: File[];
}

/**
 * Create thread request
 */
export interface CreateThreadDto {
  subject: string;
  initialMessage: string;
  propertyManagerId?: number; // Optional, backend can assign default
}

/**
 * Update thread request
 */
export interface UpdateThreadDto {
  status?: ThreadStatus;
  subject?: string;
}

/**
 * Message list query parameters
 */
export interface MessageListParams {
  threadId: number;
  page?: number;
  limit?: number;
}

/**
 * Thread list query parameters
 */
export interface ThreadListParams {
  status?: ThreadStatus;
  page?: number;
  limit?: number;
}

/**
 * Message list response
 */
export interface MessageListResponse {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Thread list response
 */
export interface ThreadListResponse {
  threads: MessageThread[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Unread message count
 */
export interface UnreadMessageCount {
  total: number;
  byThread: {
    [threadId: number]: number;
  };
}
