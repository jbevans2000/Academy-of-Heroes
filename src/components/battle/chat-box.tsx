

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
  isChatDisabled?: boolean;
}

export function BattleChatBox({ teacherUid, battleId, userName, isTeacher, isChatDisabled = false }: BattleChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);


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
    if (newMessage.trim() === '' || !teacherUid || !battleId || isChatDisabled) return;

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
    <Card className="flex flex-col h-full bg-card/60 backdrop-blur-sm min-h-0">
      <CardHeader>
        <CardTitle className="text-black">The War Council</CardTitle>
        <CardDescription className="text-black">Talk with your party members!</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden flex flex-col">
        <div ref={scrollAreaRef} className="flex-grow overflow-y-auto pr-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col items-start p-2 rounded-lg max-w-[85%]",
                msg.isTeacher ? "bg-primary/20 self-end items-end" : "bg-secondary self-start"
              )}
            >
              <div className={cn("flex items-center gap-2 w-full", msg.isTeacher ? "flex-row-reverse" : "")}>
                <p className="font-bold text-sm text-black">{msg.senderName}</p>
                {msg.timestamp && (
                    <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.timestamp.seconds * 1000), { addSuffix: true })}
                    </p>
                )}
              </div>
              <p className="text-black whitespace-pre-wrap">{msg.text}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isChatDisabled ? "Chat is disabled by the Guild Leader" : "Send a message..."}
            disabled={isSending || isChatDisabled}
          />
          <Button type="submit" disabled={isSending || newMessage.trim() === '' || isChatDisabled}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
