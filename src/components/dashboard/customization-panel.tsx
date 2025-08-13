import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarSelector } from "./avatar-selector";
import { BackgroundSelector } from "./background-selector";
import { AiAvatarGenerator } from "./ai-avatar-generator";
import type { Avatar, Background } from "@/lib/data";
import { User, Image as ImageIcon, Sparkles } from 'lucide-react';

interface CustomizationPanelProps {
  avatars: Avatar[];
  backgrounds: Background[];
  selectedAvatarId: number;
  selectedBackgroundId: number;
  onAvatarSelect: (avatar: Avatar) => void;
  onBackgroundSelect: (background: Background) => void;
  onNewAvatarGenerated: (dataUri: string) => void;
}

export function CustomizationPanel({
  avatars,
  backgrounds,
  selectedAvatarId,
  selectedBackgroundId,
  onAvatarSelect,
  onBackgroundSelect,
  onNewAvatarGenerated
}: CustomizationPanelProps) {
  return (
    <Card className="shadow-lg rounded-xl h-full flex flex-col">
      <CardHeader>
        <CardTitle>Customize Your Hero</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <Tabs defaultValue="avatars" className="w-full flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="avatars"><User className="w-4 h-4 mr-2"/>Avatars</TabsTrigger>
            <TabsTrigger value="backgrounds"><ImageIcon className="w-4 h-4 mr-2"/>Views</TabsTrigger>
            <TabsTrigger value="ai"><Sparkles className="w-4 h-4 mr-2"/>AI Gen</TabsTrigger>
          </TabsList>
          <TabsContent value="avatars" className="mt-4 flex-grow">
            <AvatarSelector
              avatars={avatars}
              selectedAvatarId={selectedAvatarId}
              onSelect={onAvatarSelect}
            />
          </TabsContent>
          <TabsContent value="backgrounds" className="mt-4 flex-grow">
            <BackgroundSelector
              backgrounds={backgrounds}
              selectedBackgroundId={selectedBackgroundId}
              onSelect={onBackgroundSelect}
            />
          </TabsContent>
          <TabsContent value="ai" className="mt-4 flex-grow">
            <AiAvatarGenerator onNewAvatarGenerated={onNewAvatarGenerated} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
