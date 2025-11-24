
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, KeyRound, ShieldAlert, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { validateCoTeacherInvite } from '@/ai/flows/validate-co-teacher-invite';
import { createCoTeacherAccount } from '@/ai/flows/create-co-teacher';

function CoTeacherRegistrationForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [token, setToken] = useState('');
    const [invitationId, setInvitationId] = useState('');
    const [inviteeName, setInviteeName] = useState('');
    const [inviteeEmail, setInviteeEmail] = useState('');
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [isValidating, setIsValidating] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    useEffect(() => {
        const inviteToken = searchParams.get('token');
        if (!inviteToken) {
            setValidationError('No invitation token found. Please use the link provided by your colleague.');
            setIsValidating(false);
            return;
        }

        setToken(inviteToken);
        const validate = async () => {
            const result = await validateCoTeacherInvite(inviteToken);
            if (result.isValid) {
                setInvitationId(result.invitationId!);
                setInviteeName(result.inviteeName!);
                setInviteeEmail(result.inviteeEmail!);
            } else {
                setValidationError(result.error || 'This invitation is not valid.');
            }
            setIsValidating(false);
        };

        validate();
    }, [searchParams]);

    const handleSubmit = async () => {
        if (password !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Passwords do not match.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await createCoTeacherAccount({
                invitationId,
                inviteeName,
                inviteeEmail,
                password,
            });

            if (result.success) {
                toast({ title: 'Account Created!', description: 'You can now log in with your new credentials.' });
                router.push('/teacher/login');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Registration Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isValidating) {
        return (
            <Card className="w-full max-w-lg shadow-2xl bg-card/80 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                    <Loader2 className="h-12 w-12 mx-auto animate-spin" />
                    <p className="mt-4 text-lg">Validating your invitation...</p>
                </CardContent>
            </Card>
        );
    }
    
    if (validationError) {
         return (
            <Card className="w-full max-w-lg shadow-2xl bg-card/80 backdrop-blur-sm">
                 <CardHeader className="text-center">
                    <XCircle className="h-16 w-16 text-destructive mx-auto"/>
                    <CardTitle className="text-3xl font-headline text-destructive">Invitation Invalid</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-lg">{validationError}</p>
                </CardContent>
                 <CardFooter>
                    <Button className="w-full" asChild>
                        <Link href="/">Return to Home</Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-lg shadow-2xl bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto"/>
                <CardTitle className="text-3xl font-headline text-primary">Invitation Accepted!</CardTitle>
                <CardDescription>Welcome! Please set a password to finalize your co-teacher account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={inviteeName} disabled />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={inviteeEmail} disabled />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="password"><KeyRound className="inline-block mr-2" />Password</Label>
                    <Input id="password" type="password" placeholder="Choose a secure password (at least 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password"><KeyRound className="inline-block mr-2" />Confirm Password</Label>
                    <Input id="confirm-password" type="password" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
                <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting || !password || !confirmPassword}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Create Co-Teacher Account
                </Button>
                <Button variant="link" asChild className="text-muted-foreground">
                    <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Cancel</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function CoTeacherRegisterPage() {
    return (
        <div 
            className="relative flex items-center justify-center min-h-screen p-4"
        >
            <div 
                className="absolute inset-0 -z-10"
                style={{
                    backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/academy-heroes-mziuf.firebasestorage.app/o/Web%20Backgrounds%2Fenvato-labs-ai-b2ed6807-b64f-48e1-9b8c-a2d0b719db78.jpg?alt=media&token=793c0484-06f3-49ab-9557-9ca0a9b0f6bf')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            <Suspense fallback={<div className="text-white text-2xl">Loading Invitation...</div>}>
                <CoTeacherRegistrationForm />
            </Suspense>
        </div>
    )
}
