
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Link as LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const RichTextEditor = ({ value, onChange, className }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);

  // Dialog States
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isYouTubeDialogOpen, setIsYouTubeDialogOpen] = useState(false);
  const [youTubeUrl, setYouTubeUrl] = useState('');
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageWidth, setImageWidth] = useState('');

  useEffect(() => {
    const editor = editorRef.current;
    // Only update if the editor's content is different from the prop value
    if (editor && value !== editor.innerHTML) {
      editor.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        selectionRef.current = range.cloneRange();
      }
    }
  };
  
  const restoreSelection = () => {
    if (selectionRef.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(selectionRef.current);
    } else if (editorRef.current) {
      editorRef.current.focus();
    }
  };
  
  const execCommand = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    if(editorRef.current) {
      handleInput(); // Update state after command
    }
  };

  const handleToolbarMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent editor from losing focus
    saveSelection();
  };

  const handleBold = () => execCommand('bold');
  const handleJustifyLeft = () => execCommand('justifyLeft');
  const handleJustifyCenter = () => execCommand('justifyCenter');
  const handleJustifyRight = () => execCommand('justifyRight');
  
  const handleOpenLinkDialog = () => {
    saveSelection();
    setIsLinkDialogOpen(true);
  }

  const handleLinkConfirm = () => {
    setIsLinkDialogOpen(false);
    restoreSelection();
    if (linkUrl && selectionRef.current) {
      // Use insertHTML to create a link with specific styles
      const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="color: blue; text-decoration: underline;">${selectionRef.current.toString()}</a>`;
      execCommand('insertHTML', linkHtml);
    }
    setLinkUrl('');
    selectionRef.current = null;
  };

  const handleOpenImageDialog = () => {
    saveSelection();
    setIsImageDialogOpen(true);
  }

  const handleImageConfirm = () => {
    if (!imageUrl) return;
    const width = imageWidth || '100%';
    const widthStyle = `width: ${/^\d+$/.test(width) ? `${width}px` : width}; max-width: 100%;`;
    const imgTag = `<div><img src="${imageUrl}" alt="user image" style="${widthStyle} height: auto; border-radius: 8px; display: block; margin-left: auto; margin-right: auto;" /></div>`;
    execCommand('insertHTML', imgTag);
    setIsImageDialogOpen(false);
    setImageUrl('');
    setImageWidth('');
  };
  
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const videoIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : null;
  };
  
  const handleOpenYouTubeDialog = () => {
      saveSelection();
      setIsYouTubeDialogOpen(true);
  }

  const handleYouTubeVideoConfirm = () => {
    if (!youTubeUrl) return;
    
    const embedUrl = getYouTubeEmbedUrl(youTubeUrl);
    if (!embedUrl) {
        alert('Invalid YouTube URL. Please use a valid link.');
        return;
    }

    const videoTag = `<div style="text-align: center; margin: 2rem 0;"><div style="aspect-ratio: 16 / 9; max-width: 700px; margin: auto;"><iframe style="width: 100%; height: 100%; border-radius: 8px;" src="${embedUrl}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`;
    execCommand('insertHTML', videoTag);
    setIsYouTubeDialogOpen(false);
    setYouTubeUrl('');
  };
  
  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    execCommand('fontName', e.target.value);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    execCommand('fontSize', e.target.value);
  };
  
  const handleFontColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCommand('foreColor', e.target.value);
  };

  return (
    <>
      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Hyperlink</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="link-url">URL</Label>
            <Input 
              id="link-url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleLinkConfirm}>Insert Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* YouTube Dialog */}
      <Dialog open={isYouTubeDialogOpen} onOpenChange={setIsYouTubeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed YouTube Video</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="youtube-url">YouTube Video URL</Label>
            <Input 
              id="youtube-url"
              value={youTubeUrl}
              onChange={(e) => setYouTubeUrl(e.target.value)}
              placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleYouTubeVideoConfirm}>Embed Video</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Image</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <Input 
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="image-width">Image Width (Optional)</Label>
                <Input 
                id="image-width"
                value={imageWidth}
                onChange={(e) => setImageWidth(e.target.value)}
                placeholder="e.g., 400px or 100%"
                />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleImageConfirm}>Embed Image</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className={cn("border rounded-md", className)}>
        <div className="flex items-center gap-2 p-2 border-b bg-muted/50 flex-wrap">
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleBold} title="Bold">
            <Bold className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleJustifyLeft} title="Align Left">
              <AlignLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleJustifyCenter} title="Align Center">
              <AlignCenter className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleJustifyRight} title="Align Right">
              <AlignRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleOpenLinkDialog} title="Link">
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleOpenImageDialog} title="Image">
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleOpenYouTubeDialog} title="YouTube Video">
            <Youtube className="h-4 w-4" />
          </Button>
           <select onChange={handleFontFamilyChange} className="p-1 border rounded-md bg-background text-sm">
                <option value="Lora">Lora (default)</option>
                <option value="Cinzel" style={{ fontFamily: 'Cinzel, serif' }}>Cinzel</option>
                <option value="MedievalSharp" style={{ fontFamily: 'MedievalSharp, cursive' }}>MedievalSharp</option>
                <option value="Uncial Antiqua" style={{ fontFamily: 'Uncial Antiqua, cursive' }}>Uncial Antiqua</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
            </select>
            <select onChange={handleFontSizeChange} className="p-1 border rounded-md bg-background text-sm">
                <option value="3">Normal</option>
                <option value="1">Extra Small</option>
                <option value="2">Small</option>
                <option value="4">Large</option>
                <option value="5">Extra Large</option>
                <option value="6">Heading 2</option>
                <option value="7">Heading 1</option>
            </select>
             <div className="flex items-center h-8 w-8 justify-center rounded-md border bg-background">
                <Input type="color" onChange={handleFontColorChange} className="w-full h-full p-0 border-none cursor-pointer" title="Font Color" />
            </div>
        </div>
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={saveSelection}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          className="prose prose-sm max-w-none p-3 min-h-[150px] outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-b-md"
          />
      </div>
    </>
  );
};

export default RichTextEditor;
