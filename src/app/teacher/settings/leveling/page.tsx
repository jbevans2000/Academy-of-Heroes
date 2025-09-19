
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, BarChart, RefreshCw } from 'lucide-react';
import { updateLevelingTable } from '@/ai/flows/manage-teacher';
import { xpForLevel as defaultXpTable, MAX_LEVEL } from '@/lib/game-mechanics';

export default function LevelingSettingsPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [teacher, setTeacher] = useState<User | null>(null);
    const [levelingTable, setLevelingTable] = useState<{ [level: number]: number }>({});
    const [initialTable, setInitialTable] = useState<{ [level: number]: number }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setTeacher(user);
                const docRef = doc(db, 'teachers', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const teacherData = docSnap.data();
                    const table = teacherData.levelingTable && Object.keys(teacherData.levelingTable).length > 0
                        ? teacherData.levelingTable
                        : defaultXpTable;
                    setLevelingTable(table);
                    setInitialTable(table);
                } else {
                     setLevelingTable(defaultXpTable);
                     setInitialTable(defaultXpTable);
                }
                setIsLoading(false);
            } else {
                router.push('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleInputChange = (level: number, value: string) => {
        const newTable = { ...levelingTable, [level]: Number(value) };
        setLevelingTable(newTable);
    };

    const hasChanges = JSON.stringify(levelingTable) !== JSON.stringify(initialTable);
    
    const handleRevertToDefault = () => {
        setLevelingTable(defaultXpTable);
        toast({ title: "Reverted", description: "The leveling table has been reset to the default values. Click 'Save Changes' to confirm." });
    };

    const handleSaveChanges = async () => {
        if (!teacher || !hasChanges) return;
        
        // Validation
        for(let i = 2; i <= MAX_LEVEL; i++) {
            if(levelingTable[i] === undefined || levelingTable[i] <= levelingTable[i-1]) {
                toast({ variant: 'destructive', title: 'Invalid Table', description: `XP for Level ${i} must be greater than Level ${i-1}.`});
                return;
            }
        }
        
        setIsSaving(true);
        try {
            const result = await updateLevelingTable({
                teacherUid: teacher.uid,
                levelingTable,
            });

            if (result.success) {
                toast({ title: "Leveling Curve Updated", description: "Your custom experience requirements have been saved." });
                setInitialTable(levelingTable);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return (
             <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <TeacherHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-2xl mx-auto space-y-6">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-[500px] w-full" />
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                        <Button variant="outline" onClick={() => router.push('/teacher/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Podium
                        </Button>
                        <Button variant="secondary" onClick={handleRevertToDefault}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Revert to Default
                        </Button>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BarChart/> Custom Leveling Curve</CardTitle>
                            <CardDescription>Define the total XP required to reach each level. Level 1 is always 0 XP.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {Array.from({ length: MAX_LEVEL - 1 }, (_, i) => i + 2).map(level => (
                                    <div key={level} className="space-y-1">
                                        <Label htmlFor={`level-${level}`} className="font-semibold">Level {level}</Label>
                                        <Input
                                            id={`level-${level}`}
                                            type="number"
                                            value={levelingTable[level] || ''}
                                            onChange={(e) => handleInputChange(level, e.target.value)}
                                        />
                                    </div>
                                ))}
                           </div>
                        </CardContent>
                    </Card>
                     <div className="flex justify-end">
                        <Button onClick={handleSaveChanges} disabled={!hasChanges || isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
