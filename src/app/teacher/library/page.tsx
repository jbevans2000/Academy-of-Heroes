
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { LibraryHub } from '@/lib/quests';

import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Search, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const gradeLevels = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];

export default function RoyalLibraryPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [teacher, setTeacher] = useState<User | null>(null);
    const [hubs, setHubs] = useState<LibraryHub[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTags, setSelectedTags] = useState('');

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
        const hubsRef = collection(db, 'library_hubs');
        const q = query(hubsRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setHubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibraryHub)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching library hubs:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load library content.' });
            setIsLoading(false);
        });

        return () => unsubscribe();

    }, [teacher, toast]);

    const filteredHubs = useMemo(() => {
        return hubs.filter(hub => {
            const searchTermMatch = searchTerm === '' ||
                hub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                hub.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                hub.originalTeacherName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const gradeMatch = selectedGrade === '' || hub.gradeLevel === selectedGrade;
            const subjectMatch = selectedSubject === '' || hub.subject.toLowerCase().includes(selectedSubject.toLowerCase());
            
            const tagsToSearch = selectedTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
            const tagsMatch = tagsToSearch.length === 0 ||
                tagsToSearch.every(searchTag => 
                    hub.tags.some(hubTag => hubTag.toLowerCase().includes(searchTag))
                );

            return searchTermMatch && gradeMatch && subjectMatch && tagsMatch;
        });
    }, [hubs, searchTerm, selectedGrade, selectedSubject, selectedTags]);

    const uniqueSubjects = useMemo(() => {
        const subjects = new Set(hubs.map(h => h.subject));
        return Array.from(subjects).sort();
    }, [hubs]);

    return (
         <div className="relative flex flex-col min-h-screen">
            <div
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2FArchives.jpg?alt=media&token=1bbfbdcd-fb4a-4139-9a8d-44603c19a86c')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundAttachment: 'fixed',
                }}
            />
            <TeacherHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Button variant="outline" onClick={() => router.push('/teacher/quests')} className="bg-background/80">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quest Archives
                    </Button>

                    <Card className="bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-3xl flex items-center gap-2">
                                <BookOpen className="h-8 w-8 text-primary" />
                                The Royal Library
                            </CardTitle>
                            <CardDescription>Browse and import quests shared by other Guild Leaders.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Card className="p-4 bg-background/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="search-term">Search by Keyword</Label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                            <Input id="search-term" placeholder="e.g., Photosynthesis, American Revolution" className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="grade-filter">Grade Level</Label>
                                        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                                            <SelectTrigger id="grade-filter"><SelectValue placeholder="All Grades" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">All Grades</SelectItem>
                                                {gradeLevels.map(grade => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="subject-filter">Subject</Label>
                                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                            <SelectTrigger id="subject-filter"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">All Subjects</SelectItem>
                                                {uniqueSubjects.map(subject => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tags-filter">Tags</Label>
                                        <Input id="tags-filter" placeholder="e.g., fractions, reading" value={selectedTags} onChange={e => setSelectedTags(e.target.value)} />
                                    </div>
                                </div>
                            </Card>
                        </CardContent>
                    </Card>
                    
                    <div>
                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <Skeleton className="h-64" />
                                <Skeleton className="h-64" />
                                <Skeleton className="h-64" />
                            </div>
                        ) : filteredHubs.length === 0 ? (
                            <Card className="py-20 text-center bg-card/80">
                                <CardTitle>The Library is Quiet...</CardTitle>
                                <CardDescription>No shared content matches your search. Try broadening your filters or be the first to share a quest!</CardDescription>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredHubs.map(hub => (
                                    <Card key={hub.id} className="flex flex-col bg-card/90">
                                        <CardHeader>
                                            <CardTitle>{hub.name}</CardTitle>
                                            <CardDescription>By {hub.originalTeacherName}</CardDescription>
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                <Badge>{hub.gradeLevel}</Badge>
                                                <Badge variant="secondary">{hub.subject}</Badge>
                                                {hub.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <p className="text-sm text-muted-foreground">{hub.description}</p>
                                        </CardContent>
                                        <CardFooter className="flex justify-end gap-2">
                                            <Button variant="outline">Preview</Button>
                                            <Button>Import</Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
