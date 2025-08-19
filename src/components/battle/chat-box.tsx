
'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  text: string;
  senderName: string;
  isTeacher: boolean;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  } | null;
}

interface BattleChatBoxProps {
  teacherUid: string;
  battleId: string;
  userName: string;
  isTeacher: boolean;
}

export function BattleChatBox({ teacherUid, battleId, userName, isTeacher }: BattleChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (!teacherUid || !battleId) return;

    const messagesRef = collection(db, 'teachers', teacherUid, `liveBattles/active-battle/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    }, (error) => {
      console.error("Error fetching chat messages: ", error);
    });

    return () => unsubscribe();
  }, [teacherUid, battleId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !teacherUid || !battleId) return;

    setIsSending(true);
    try {
      const messagesRef = collection(db, 'teachers', teacherUid, `liveBattles/active-battle/messages`);
      await addDoc(messagesRef, {
        text: newMessage,
        senderName: userName,
        isTeacher: isTeacher,
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message: ", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="flex flex-col h-full bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>The War Council</CardTitle>
        <CardDescription>Talk with your party members!</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden flex flex-col">
        <div className="flex-grow overflow-y-auto pr-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col items-start p-2 rounded-lg max-w-[85%]",
                msg.isTeacher ? "bg-primary/20 self-end items-end" : "bg-secondary self-start"
              )}
            >
              <div className={cn("flex items-center gap-2 w-full", msg.isTeacher ? "flex-row-reverse" : "")}>
                <p className={cn("font-bold text-sm", msg.isTeacher ? "text-primary" : "")}>{msg.senderName}</p>
                {msg.timestamp && (
                    <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.timestamp.seconds * 1000), { addSuffix: true })}
                    </p>
                )}
              </div>
              <p className="text-foreground whitespace-pre-wrap">{msg.text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Send a message..."
            disabled={isSending}
          />
          <Button type="submit" disabled={isSending || newMessage.trim() === ''}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
