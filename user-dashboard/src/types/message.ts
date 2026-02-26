export interface Message {
  id: number;
  sender_id: number;
  sender_username: string;
  sender_full_name: string;
  sender_avatar?: string;
  receiver_id: number;
  receiver_username: string;
  receiver_full_name: string;
  receiver_avatar?: string;
  listing_id?: number;
  subject?: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface SendMessageData {
  receiver_id: number;
  listing_id?: number;
  subject?: string;
  content: string;
}

export interface ConversationMessage extends Message {
  other_user_id?: number;
  other_user_username?: string;
  other_user_full_name?: string;
  other_user_avatar?: string;
  unread_count?: number;
}
