
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { LibraryHub } from '@/lib/quests';

import { TeacherHeader } from '@/components/teacher/teacher-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Search, Star, Share, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreatorProfileDialog } from '@/components/teacher/creator-profile-dialog';
import Link from 'next/link';
import { unshareHubFromLibrary, shareHubsToLibrary } from '@/ai/flows/share-to-library';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';


const gradeLevels = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  hubs: LibraryHub[];
  teacher: User | null;
}

function ShareDialog({ isOpen, onOpenChange, hubs, teacher }: ShareDialogProps) {
    const { toast } = useToast();
    const [selectedHubIds, setSelectedHubIds] = useState<string[]>([]);
    const [subject, setSubject] = useState('');
    const [gradeLevel, setGradeLevel] = useState('');
    const [tags, setTags] = useState('');
    const [sagaType, setSagaType] = useState<'standalone' | 'ongoing'>('standalone');
    const [description, setDescription] = useState('');
    const [isSharing, setIsSharing] = useState(false);

    const handleShare = async () => {
        if (!teacher || selectedHubIds.length === 0 || !subject || !gradeLevel) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select at least one hub and fill out all required fields.' });
            return;
        }
        setIsSharing(true);
        try {
            const result = await shareHubsToLibrary({
                teacherUid: teacher.uid,
                hubIds: selectedHubIds,
                subject,
                gradeLevel,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                sagaType,
                description,
            });

            if (result.success) {
                toast({ title: 'Content Shared!', description: `${result.sharedCount} hub(s) have been shared to the Royal Library.` });
                onOpenChange(false);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Sharing Failed', description: error.message });
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Share to the Royal Library</DialogTitle>
                    <DialogDescription>Select the hubs you wish to share and provide some details to help other teachers find them.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="font-bold">Select Hubs to Share</Label>
                        <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border p-2">
                            {hubs.map(hub => (
                                <div key={hub.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`share-${hub.id}`}
                                        checked={selectedHubIds.includes(hub.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedHubIds(prev => checked ? [...prev, hub.id] : prev.filter(id => id !== hub.id));
                                        }}
                                    />
                                    <Label htmlFor={`share-${hub.id}`}>{hub.name}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., American History" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gradeLevel">Grade Level</Label>
                             <Select onValueChange={setGradeLevel} value={gradeLevel}>
                                <SelectTrigger id="gradeLevel"><SelectValue placeholder="Select..." /></SelectTrigger>
                                <SelectContent>
                                    {gradeLevels.map(grade => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tags">Tags (comma-separated)</Label>
                        <Input id="tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g., Civil War, Fractions, Reading Comprehension" />
                    </div>
                     <div className="space-y-2">
                        <Label>Saga Type</Label>
                         <RadioGroup value={sagaType} onValueChange={(v) => setSagaType(v as any)} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="standalone" id="standalone" />
                                <Label htmlFor="standalone">Standalone Hub</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="ongoing" id="ongoing" />
                                <Label htmlFor="ongoing">Ongoing Saga</Label>
                            </div>
                        </RadioGroup>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Briefly describe what this quest hub is about." />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleShare} disabled={isSharing}>
                        {isSharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Share to Library
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function RoyalLibraryPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [teacher, setTeacher] = useState<User | null>(null);
    const [hubs, setHubs] = useState<LibraryHub[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('all');
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [selectedTags, setSelectedTags] = useState('');

    // Dialog state
    const [selectedCreator, setSelectedCreator] = useState<{ id: string; name: string; avatarUrl?: string; bio?: string; } | null>(null);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [hubToDelete, setHubToDelete] = useState<LibraryHub | null>(null);
    
    // Hubs for sharing
    const [teacherHubs, setTeacherHubs] = useState<LibraryHub[]>([]);

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
        
        // Fetch library hubs
        const libraryHubsRef = collection(db, 'library_hubs');
        const qLibrary = query(libraryHubsRef, orderBy('createdAt', 'desc'));
        const unsubLibrary = onSnapshot(qLibrary, (snapshot) => {
            setHubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibraryHub)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching library hubs:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load library content.' });
            setIsLoading(false);
        });

        // Fetch teacher's own hubs for the share dialog
        const teacherHubsRef = collection(db, 'teachers', teacher.uid, 'questHubs');
        const unsubTeacherHubs = onSnapshot(teacherHubsRef, (snapshot) => {
            setTeacherHubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibraryHub)));
        });

        return () => {
            unsubLibrary();
            unsubTeacherHubs();
        };

    }, [teacher, toast]);

    const filteredHubs = useMemo(() => {
        return hubs.filter(hub => {
            const searchTermMatch = searchTerm === '' ||
                hub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                hub.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                hub.originalTeacherName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const gradeMatch = selectedGrade === 'all' || hub.gradeLevel === selectedGrade;
            const subjectMatch = selectedSubject === 'all' || hub.subject === selectedSubject;
            
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

    const handleCreatorClick = async (hub: LibraryHub) => {
        if (!teacher) return;
        try {
            const creatorRef = doc(db, 'teachers', hub.originalTeacherId);
            const creatorSnap = await getDoc(creatorRef);
            if (creatorSnap.exists()) {
                const creatorData = creatorSnap.data();
                 setSelectedCreator({
                    id: hub.originalTeacherId,
                    name: hub.originalTeacherName,
                    avatarUrl: hub.originalTeacherAvatarUrl,
                    bio: creatorData.bio || 'This creator has not added a bio yet.'
                });
            } else {
                 setSelectedCreator({
                    id: hub.originalTeacherId,
                    name: hub.originalTeacherName,
                    avatarUrl: hub.originalTeacherAvatarUrl,
                    bio: 'This creator has not added a bio yet.'
                });
            }
        } catch (error) {
            console.error("Could not fetch creator profile:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load the creator\'s profile.'});
        }
    };
    
    const handleDeleteHub = async () => {
        if (!teacher || !hubToDelete) return;
        setIsDeleting(hubToDelete.id);
        try {
            const result = await unshareHubFromLibrary({ teacherUid: teacher.uid, hubId: hubToDelete.id });
            if (result.success) {
                toast({ title: 'Hub Unshared', description: 'The hub has been removed from the library.' });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsDeleting(null);
            setHubToDelete(null);
        }
    };


    return (
        <>
            {selectedCreator && (
                <CreatorProfileDialog
                    isOpen={!!selectedCreator}
                    onOpenChange={() => setSelectedCreator(null)}
                    creator={selectedCreator}
                    allHubs={hubs}
                />
            )}
             <ShareDialog isOpen={isShareDialogOpen} onOpenChange={setIsShareDialogOpen} hubs={teacherHubs} teacher={teacher} />
             <AlertDialog open={!!hubToDelete} onOpenChange={() => setHubToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove "{hubToDelete?.name}" from the Royal Library. This will not affect your original quest.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteHub} disabled={!!isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Unshare
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
                        <div className="flex justify-between items-center">
                            <Button variant="outline" onClick={() => router.push('/teacher/quests')} className="bg-background/80">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quest Archives
                            </Button>
                            <Button onClick={() => setIsShareDialogOpen(true)}>
                                <Share className="mr-2 h-4 w-4" /> Share Your Quests
                            </Button>
                        </div>

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
                                                    <SelectItem value="all">All Grades</SelectItem>
                                                    {gradeLevels.map(grade => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="subject-filter">Subject</Label>
                                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                                <SelectTrigger id="subject-filter"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Subjects</SelectItem>
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
                                        <Card key={hub.id} className="flex flex-col bg-card/90 relative">
                                            <div className="absolute top-4 right-4">
                                                <button onClick={() => handleCreatorClick(hub)}>
                                                    <Avatar>
                                                        <AvatarImage src={hub.originalTeacherAvatarUrl} alt={hub.originalTeacherName} />
                                                        <AvatarFallback>{hub.originalTeacherName?.charAt(0) || '?'}</AvatarFallback>
                                                    </Avatar>
                                                </button>
                                            </div>
                                            <CardHeader>
                                                <CardTitle>{hub.name}</CardTitle>
                                                <CardDescription>
                                                    By <button onClick={() => handleCreatorClick(hub)} className="font-semibold underline hover:text-primary">{hub.originalTeacherName}</button>
                                                </CardDescription>
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
                                                {teacher?.uid === hub.originalTeacherId && (
                                                    <Button variant="destructive" size="sm" onClick={() => setHubToDelete(hub)} disabled={isDeleting === hub.id}>
                                                        {isDeleting === hub.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                                    </Button>
                                                )}
                                                <Button asChild variant="outline">
                                                    <Link href={`/teacher/library/preview/${hub.id}`}>Preview</Link>
                                                </Button>
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
        </>
    );
}
