import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarSelector } from "./avatar-selector";
import { BackgroundSelector } from "./background-selector";
import type { Avatar, Background } from "@/lib/data";
import { User, Image as ImageIcon } from 'lucide-react';

interface CustomizationPanelProps {
  avatars: Avatar[];
  backgrounds: Background[];
  selectedAvatarId: number;
  selectedBackgroundId: number;
  onAvatarSelect: (avatar: Avatar) => void;
  onBackgroundSelect: (background: Background) => void;
}

export function CustomizationPanel({
  avatars,
  backgrounds,
  selectedAvatarId,
  selectedBackgroundId,
  onAvatarSelect,
  onBackgroundSelect,
}: CustomizationPanelProps) {
  return (
    <Card className="shadow-lg rounded-xl h-full flex flex-col">
      <CardHeader>
        <CardTitle>Customize Your Hero</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <Tabs defaultValue="avatars" className="w-full flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="avatars"><User className="w-4 h-4 mr-2"/>Avatars</TabsTrigger>
            <TabsTrigger value="backgrounds"><ImageIcon className="w-4 h-4 mr-2"/>Views</TabsTrigger>
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
        </Tabs>
      </CardContent>
    </Card>
  );
}
