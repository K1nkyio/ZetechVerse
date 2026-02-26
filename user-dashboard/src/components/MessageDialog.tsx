import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Send, X, Loader } from 'lucide-react';
import { messagesApi } from '@/api/messages.api';
import type { Message } from '@/types/message';

interface MessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerId: number;
  sellerName: string;
  listingId: number;
  listingTitle: string;
  sellerPhone?: string;
}

export function MessageDialog({
  open,
  onOpenChange,
  sellerId,
  sellerName,
  listingId,
  listingTitle,
  sellerPhone
}: MessageDialogProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      loadConversation();
    }
  }, [open]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    try {
      setLoading(true);
      const conversation = await messagesApi.getConversation(sellerId, listingId);
      setMessages(conversation);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load conversation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSending(true);
      const newMessage = await messagesApi.sendMessage({
        receiver_id: sellerId,
        listing_id: listingId,
        subject: `Inquiry about: ${listingTitle}`,
        content: messageContent.trim(),
      });

      setMessages([...messages, newMessage]);
      setMessageContent('');
      
      toast({
        title: 'Success',
        description: 'Message sent successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Message Seller</DialogTitle>
          <DialogDescription>
            Communicate with {sellerName} about {listingTitle}
          </DialogDescription>
        </DialogHeader>
        
        {/* Seller Info */}
        <div className="space-y-1 px-6">
          <p className="font-medium text-foreground">{sellerName}</p>
          <p className="text-sm text-muted-foreground">{listingTitle}</p>
          {sellerPhone && (
            <p className="text-sm text-muted-foreground">
              Phone: <a href={`tel:${sellerPhone}`} className="text-primary hover:underline">{sellerPhone}</a>
            </p>
          )}
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto bg-muted/30 rounded-lg p-4 space-y-4 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>No messages yet. Start a conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === sellerId ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_id === sellerId
                      ? 'bg-muted text-foreground'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="message">Your Message</Label>
            <Textarea
              id="message"
              placeholder="Type your message..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              disabled={sending}
              rows={3}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Press Ctrl+Enter to send</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Close
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={sending || !messageContent.trim()}
              className="ml-auto"
            >
              {sending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>

          {sellerPhone && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-2">Prefer to call?</p>
              <a href={`tel:${sellerPhone}`}>
                <Button variant="outline" className="w-full">
                  Call {sellerName}
                </Button>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
