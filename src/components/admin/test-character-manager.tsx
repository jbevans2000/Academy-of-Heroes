
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Student, ClassType } from '@/lib/data';
import { classData } from '@/lib/data';
import { calculateLevel, calculateHpGain, calculateMpGain, calculateBaseMaxHp } from '@/lib/game-mechanics';
import { Loader2, UserPlus } from 'lucide-react';

interface TestCharacterManagerProps {
    adminUid: string;
    testStudents: Student[];
    setTestStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

export function TestCharacterManager({ adminUid, testStudents, setTestStudents }: TestCharacterManagerProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [xpValues, setXpValues] = useState<{ [uid: string]: number | string }>({});

    useEffect(() => {
        const fetchTestStudents = async () => {
            const studentsRef = collection(db, 'admins', adminUid, 'testStudents');
            const snapshot = await getDocs(studentsRef);
            const studentsData = snapshot.docs.map(doc => doc.data() as Student);
            setTestStudents(studentsData);

            const initialXp: { [uid: string]: number } = {};
            studentsData.forEach(s => {
                initialXp[s.uid] = s.xp;
            });
            setXpValues(initialXp);
        };
        fetchTestStudents();
    }, [adminUid, setTestStudents]);

    const handleInitialize = async () => {
        setIsLoading(true);
        try {
            const batch = writeBatch(db);
            const testClasses: ClassType[] = ['Mage', 'Healer', 'Guardian'];

            for (const charClass of testClasses) {
                const uid = `test-${charClass.toLowerCase()}-char`;
                const studentRef = doc(db, 'admins', adminUid, 'testStudents', uid);
                const classInfo = classData[charClass];
                const baseStats = classInfo.baseStats;

                const newStudent: Student = {
                    uid: uid,
                    studentId: `test-${charClass.toLowerCase()}`,
                    email: `test-${charClass.toLowerCase()}@example.com`,
                    studentName: `Test ${charClass}`,
                    characterName: `Test ${charClass}`,
                    class: charClass,
                    avatarUrl: classInfo.avatars[0],
                    backgroundUrl: '',
                    xp: 0,
                    gold: 1000,
                    level: 1,
                    hp: baseStats.hp,
                    mp: baseStats.mp,
                    maxHp: baseStats.hp,
                    maxMp: baseStats.mp,
                    questProgress: {},
                    hubsCompleted: 0,
                };
                batch.set(studentRef, newStudent);
            }
            await batch.commit();

            // Refetch after creation
            const studentsRef = collection(db, 'admins', adminUid, 'testStudents');
            const snapshot = await getDocs(studentsRef);
            const studentsData = snapshot.docs.map(doc => doc.data() as Student);
            setTestStudents(studentsData);
            
            toast({ title: "Test Characters Initialized", description: "Mage, Healer, and Guardian are ready." });
        } catch (error) {
            console.error("Error initializing test characters:", error);
            toast({ variant: 'destructive', title: "Initialization Failed" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleXpChange = (uid: string, value: string) => {
        setXpValues(prev => ({ ...prev, [uid]: value }));
    };

    const handleUpdateXp = async (student: Student) => {
        const newXp = Number(xpValues[student.uid]);
        if (isNaN(newXp) || newXp < 0) {
            toast({ variant: 'destructive', title: 'Invalid XP', description: 'XP must be a non-negative number.' });
            return;
        }

        const studentRef = doc(db, 'admins', adminUid, 'testStudents', student.uid);
        
        const newLevel = calculateLevel(newXp);
        const currentLevel = student.level;
        const updates: Partial<Student> = { xp: newXp };

        if (newLevel > currentLevel) {
            const levelsGained = newLevel - currentLevel;
            updates.level = newLevel;
            updates.maxHp = calculateBaseMaxHp(student.class, newLevel);
            updates.maxMp = student.maxMp + calculateMpGain(student.class, levelsGained); // Assuming MP gain is static for now
            updates.hp = updates.maxHp; // Full heal on level up
            updates.mp = updates.maxMp;
        } else if (newLevel < currentLevel) {
            // Handle de-leveling
            updates.level = newLevel;
            updates.maxHp = calculateBaseMaxHp(student.class, newLevel);
            updates.maxMp = 10 + (newLevel - 1) * 2; // Simplified MP calculation
            updates.hp = Math.min(student.hp, updates.maxHp);
            updates.mp = Math.min(student.mp, updates.maxMp);
        } else {
             updates.level = newLevel;
        }

        try {
            const batch = writeBatch(db);
            batch.update(studentRef, updates);
            await batch.commit();

            setTestStudents(prev => prev.map(s => s.uid === student.uid ? { ...s, ...updates } : s));
            toast({ title: 'XP Updated', description: `${student.characterName}'s stats have been recalculated.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };


    return (
        <div className="p-4 bg-muted/50 rounded-lg">
            <Button onClick={handleInitialize} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Initialize / Reset Test Characters
            </Button>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
                {testStudents.map(student => (
                    <Card key={student.uid}>
                        <CardHeader>
                            <CardTitle>{student.characterName}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>Level: {student.level}</p>
                            <p>HP: {student.hp}/{student.maxHp} | MP: {student.mp}/{student.maxMp}</p>
                            <div className="space-y-2">
                                <Label htmlFor={`xp-${student.uid}`}>Set Experience</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        id={`xp-${student.uid}`} 
                                        type="number" 
                                        value={xpValues[student.uid] ?? ''}
                                        onChange={(e) => handleXpChange(student.uid, e.target.value)}
                                    />
                                    <Button size="sm" onClick={() => handleUpdateXp(student)}>Save</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

