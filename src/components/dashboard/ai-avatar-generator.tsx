'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { generateAvatar } from '@/ai/flows/generate-avatar';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Loader2, Wand2 } from 'lucide-react';

const formSchema = z.object({
  artStyle: z.string().min(3, 'Art style must be at least 3 characters long.').max(50, 'Style too long.'),
});

interface AiAvatarGeneratorProps {
  onNewAvatarGenerated: (dataUri: string) => void;
}

export function AiAvatarGenerator({ onNewAvatarGenerated }: AiAvatarGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      artStyle: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedImage(null);
    try {
      const result = await generateAvatar({ artStyle: values.artStyle });
      if (result.avatarDataUri) {
        setGeneratedImage(result.avatarDataUri);
        onNewAvatarGenerated(result.avatarDataUri);
        toast({
          title: 'Avatar Generated!',
          description: 'Your new avatar has been added to your collection.',
        });
        form.reset();
      } else {
        throw new Error('AI did not return an image.');
      }
    } catch (error) {
      console.error('Error generating avatar:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem generating your avatar. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Describe an art style to generate a unique avatar.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="artStyle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Art Style</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., cyberpunk, watercolor" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Avatar
              </>
            )}
          </Button>
        </form>
      </Form>
      {isLoading && (
         <div className="flex justify-center items-center h-48 bg-secondary rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
      )}
      {generatedImage && !isLoading && (
        <div className="pt-4">
          <h3 className="text-base font-semibold mb-2">New Avatar:</h3>
          <Card>
            <CardContent className="p-2">
              <Image
                src={generatedImage}
                alt="AI Generated Avatar"
                width={200}
                height={200}
                className="rounded-md w-full aspect-square object-cover"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
