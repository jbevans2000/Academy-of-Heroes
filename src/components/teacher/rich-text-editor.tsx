
'use client';

import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Link, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const RichTextEditor = ({ value, onChange, className }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

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
  
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if(editorRef.current) {
      editorRef.current.focus();
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

  const handleYouTubeVideo = () => {
    const url = prompt('Enter the YouTube video URL:');
    if (!url) return;
    
    const embedUrl = getYouTubeEmbedUrl(url);
    if (!embedUrl) {
        alert('Invalid YouTube URL. Please use a valid link.');
        return;
    }

    const videoTag = `<div style="text-align: center; margin: 2rem 0;"><div style="aspect-ratio: 16 / 9; max-width: 700px; margin: auto;"><iframe style="width: 100%; height: 100%; border-radius: 8px;" src="${embedUrl}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`;
    execCommand('insertHTML', videoTag);
  };

  return (
    <div className={cn("border rounded-md", className)}>
      <div className="flex items-center gap-2 p-2 border-b bg-muted/50 flex-wrap">
        <Button size="sm" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={handleBold} title="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={handleJustifyLeft} title="Align Left">
            <AlignLeft className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={handleJustifyCenter} title="Align Center">
            <AlignCenter className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={handleJustifyRight} title="Align Right">
            <AlignRight className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={handleLink} title="Link">
          <Link className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={handleImage} title="Image">
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={handleYouTubeVideo} title="YouTube Video">
          <Youtube className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="prose prose-sm max-w-none p-3 min-h-[150px] outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-b-md"
        />
    </div>
  );
};

export default RichTextEditor;
