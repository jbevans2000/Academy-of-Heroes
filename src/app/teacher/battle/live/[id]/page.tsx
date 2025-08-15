
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onSnapshot, doc, getDoc, collection, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


interface LiveBattleState {
  battleId: string | null;
  status: 'WAITING' | 'IN_PROGRESS' | 'SHOWING_RESULTS';
  currentQuestionIndex: number;
}

interface Battle {
    id: string;
    battleName: string;
}

interface StudentResponse {
    studentName: string;
}

export default function TeacherLiveBattlePage() {
  const router = useRouter();
  const params = useParams();
  const battleId = params.id as string;

  const [battle, setBattle] = useState<Battle | null>(null);
  const [liveState, setLiveState] = useState<LiveBattleState | null>(null);
  const [studentResponses, setStudentResponses] = useState<StudentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the static battle definition once
  useEffect(() => {
    if (!battleId) return;
    const fetchBattle = async () => {
      const docRef = doc(db, 'bossBattles', battleId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setBattle({ id: docSnap.id, ...docSnap.data() } as Battle);
      } else {
        // Handle battle not found
      }
    };
    fetchBattle();
  }, [battleId]);

  // Listen for real-time updates on the live battle state
  useEffect(() => {
    const liveBattleRef = doc(db, 'liveBattles', 'active-battle');
    const unsubscribe = onSnapshot(liveBattleRef, (doc) => {
      if (doc.exists()) {
        const newState = doc.data() as LiveBattleState;
        // If the question index changes, clear old responses
        if (liveState && liveState.currentQuestionIndex !== newState.currentQuestionIndex) {
            setStudentResponses([]);
        }
        setLiveState(newState);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [liveState]);

  // Listen for real-time student responses
  useEffect(() => {
    if (!liveState || liveState.status !== 'IN_PROGRESS') return;

    const responsesRef = collection(db, `liveBattles/active-battle/responses`);
    const q = query(responsesRef);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const responses: StudentResponse[] = [];
        querySnapshot.forEach((doc) => {
            responses.push(doc.data() as StudentResponse);
        });
        setStudentResponses(responses);
    });

    return () => unsubscribe();
  }, [liveState]);


  if (isLoading || !battle || !liveState) {
    return (
        <>
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-4">
                    <Skeleton className="w-1/3 h-10" />
                    <Skeleton className="w-full h-64" />
                    <Skeleton className="w-full h-32" />
                </div>
            </main>
        </>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">{battle.battleName}</CardTitle>
                    <CardDescription>Live Battle Control Panel</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Status: <span className="font-bold text-primary">{liveState.status}</span></p>
                    <p>Current Question: <span className="font-bold">{liveState.currentQuestionIndex + 1}</span></p>
                    
                    <div className="mt-6 p-4 border rounded-lg">
                        <h3 className="font-semibold text-lg mb-2">Controls</h3>
                        <div className="flex gap-4">
                             <Button disabled>End Round</Button>
                             <Button disabled>Next Question</Button>
                             <Button variant="destructive">End Battle</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Live Student Responses ({studentResponses.length})</CardTitle>
                    <CardDescription>See which students have submitted their answer for the current question.</CardDescription>
                </CardHeader>
                <CardContent>
                    {studentResponses.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {studentResponses.map((response, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-secondary">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>{response.studentName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{response.studentName}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <p className="text-muted-foreground">Waiting for students to answer...</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
