
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Trash2, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { clearGameLog } from '@/ai/flows/manage-student';
import { ClientOnlyTime } from '@/components/client-only-time';

interface GameLogEntry {
  id: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
  category: 'BOSS_BATTLE' | 'CHAPTER' | 'ACCOUNT' | 'GAMEMASTER';
  description: string;
}

export default function GameLogPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [logs, setLogs] = useState<GameLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<GameLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [teacher, setTeacher] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
        if (user) {
            setTeacher(user);
        } else {
            router.push('/teacher/login');
        }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!teacher) return;

    setIsLoading(true);
    const logsQuery = query(collection(db, 'teachers', teacher.uid, 'gameLog'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(logsQuery, (querySnapshot) => {
      const logsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as GameLogEntry));
      setLogs(logsData);
      setFilteredLogs(logsData); // Initially show all logs
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching game logs:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [teacher]);
  
  useEffect(() => {
      if (activeTab === 'all') {
          setFilteredLogs(logs);
      } else {
          setFilteredLogs(logs.filter(log => log.category === activeTab.toUpperCase()));
      }
  }, [activeTab, logs]);

  const handleClearLog = async () => {
    if (!teacher) return;
    setIsDeleting(true);
    try {
        const result = await clearGameLog({ teacherUid: teacher.uid });
        if (result.success) {
            toast({ title: "Game Log Cleared", description: "All log entries have been permanently deleted." });
            // The onSnapshot listener will automatically update the UI to show an empty list.
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: "Could not clear the game log. Please try again." });
        console.error("Error clearing game log:", error);
    } finally {
        setIsDeleting(false);
    }
  }

  const renderLogList = (logList: GameLogEntry[]) => {
      if (isLoading) {
          return (
              <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
          )
      }

      if (logList.length === 0) {
          return <p className="text-muted-foreground text-center py-8">No events recorded for this category yet.</p>
      }

      return (
          <ul className="space-y-2">
              {logList.map(log => (
                  <li key={log.id} className="flex items-start justify-between p-3 rounded-md bg-secondary/50">
                      <span>{log.description}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap pl-4">
                          {log.timestamp && <ClientOnlyTime date={new Date(log.timestamp.seconds * 1000)} />}
                      </span>
                  </li>
              ))}
          </ul>
      )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Podium
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting || logs.length === 0}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Clear Log
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to clear the entire game log?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. All recorded game events will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearLog} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, Clear Log
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-4">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                    <CardTitle className="text-3xl">The Chronicler's Scroll</CardTitle>
                    <CardDescription>A real-time record of all events happening in your game.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="all">All Events</TabsTrigger>
                        <TabsTrigger value="BOSS_BATTLE">Boss Battles</TabsTrigger>
                        <TabsTrigger value="CHAPTER">Chapters</TabsTrigger>
                        <TabsTrigger value="ACCOUNT">Account</TabsTrigger>
                        <TabsTrigger value="GAMEMASTER">Gamemaster</TabsTrigger>
                    </TabsList>
                    <TabsContent value={activeTab} className="mt-4 max-h-[60vh] overflow-y-auto p-2">
                       {renderLogList(filteredLogs)}
                    </TabsContent>
                </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
