
'use client';

import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Link, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
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

  return (
    <div className={cn("border rounded-md", className)}>
      <div className="flex items-center gap-2 p-2 border-b bg-muted/50">
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
