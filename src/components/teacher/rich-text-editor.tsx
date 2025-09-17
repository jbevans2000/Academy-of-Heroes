
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Link, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Youtube } from 'lucide-react';
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
  const [selection, setSelection] = useState<Range | null>(null);
  const [isYouTubeDialogOpen, setIsYouTubeDialogOpen] = useState(false);
  const [youTubeUrl, setYouTubeUrl] = useState('');

  useEffect(() => {
    const editor = editorRef.current;
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
      // Ensure the selection is within the editable div
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        setSelection(range);
      }
    }
  };
  
  const restoreSelection = () => {
    if (selection) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(selection);
    } else if (editorRef.current) {
      // Fallback: place cursor at the end if no selection was saved
      editorRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };
  
  const execCommand = (command: string, value?: string) => {
    restoreSelection();
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    if(editorRef.current) {
      handleInput(); // Update state after command
    }
  };

  const handleBold = () => execCommand('bold');
  const handleJustifyLeft = () => execCommand('justifyLeft');
  const handleJustifyCenter = () => execCommand('justifyCenter');
  const handleJustifyRight = () => execCommand('justifyRight');

  const handleLink = () => {
    const url = prompt('Enter the URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const handleImage = () => {
    const url = prompt('Enter the image URL:');
    if (!url) return;

    const width = prompt('Enter the image width in pixels (e.g., 400). Leave blank for default.', '100%');
    const widthStyle = width ? `width: ${/^\d+$/.test(width) ? `${width}px` : width}; max-width: 100%;` : 'max-width: 100%;';
    
    // Wrap the image in a div to ensure it can be justified correctly.
    const imgTag = `<div><img src="${url}" alt="user image" style="${widthStyle} height: auto; border-radius: 8px; display: inline-block;" /></div>`;
    execCommand('insertHTML', imgTag);
  };
  
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const videoIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : null;
  };

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

  const handleToolbarButtonClick = (action: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    action();
  }

  return (
    <>
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
      <div className={cn("border rounded-md", className)}>
        <div className="flex items-center gap-2 p-2 border-b bg-muted/50 flex-wrap">
          <Button size="sm" variant="outline" onMouseDown={handleToolbarButtonClick(handleBold)} title="Bold">
            <Bold className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarButtonClick(handleJustifyLeft)} title="Align Left">
              <AlignLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarButtonClick(handleJustifyCenter)} title="Align Center">
              <AlignCenter className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarButtonClick(handleJustifyRight)} title="Align Right">
              <AlignRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarButtonClick(handleLink)} title="Link">
            <Link className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarButtonClick(handleImage)} title="Image">
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarButtonClick(() => setIsYouTubeDialogOpen(true))} title="YouTube Video">
            <Youtube className="h-4 w-4" />
          </Button>
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
