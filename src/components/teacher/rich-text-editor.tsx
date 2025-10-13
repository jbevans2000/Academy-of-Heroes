
'use client';

import React, { useRef, useEffect, useState, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, Link as LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Youtube, Code, List, ListOrdered, Quote, Minus, Undo, Redo, Pilcrow } from 'lucide-react';
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
import { Textarea } from '../ui/textarea';


interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(({ value, onChange, className, disabled = false }, ref) => {
  const localEditorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  
  useImperativeHandle(ref, () => localEditorRef.current as HTMLDivElement);


  // Dialog States
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isYouTubeDialogOpen, setIsYouTubeDialogOpen] = useState(false);
  const [youTubeUrl, setYouTubeUrl] = useState('');
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageWidth, setImageWidth] = useState('');
  const [isIframeDialogOpen, setIsIframeDialogOpen] = useState(false);
  const [iframeCode, setIframeCode] = useState('');

  useEffect(() => {
    const editor = localEditorRef.current;
    if (editor && value !== editor.innerHTML) {
      editor.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (localEditorRef.current) {
      onChange(localEditorRef.current.innerHTML);
    }
  };

  const saveSelection = () => {
    if (disabled) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (localEditorRef.current && localEditorRef.current.contains(range.commonAncestorContainer)) {
        selectionRef.current = range.cloneRange();
      }
    }
  };
  
  const restoreSelection = () => {
    if (disabled) return;
    if (selectionRef.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(selectionRef.current);
    } else if (localEditorRef.current) {
      localEditorRef.current.focus();
    }
  };
  
  const execCommand = (command: string, value?: string) => {
    if (disabled) return;
    restoreSelection();
    document.execCommand(command, false, value);
    if(localEditorRef.current) {
      handleInput(); // Update state after command
    }
  };

  const applyStyle = (className: string) => {
    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!range) return;

    if (range.collapsed) {
        const span = document.createElement('span');
        span.className = className;
        span.innerHTML = '&#8203;'; // Zero-width space
        range.insertNode(span);
        
        const newRange = document.createRange();
        newRange.setStart(span.firstChild!, 1);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    } else {
        const span = document.createElement('span');
        span.className = className;
        span.appendChild(range.extractContents());
        range.insertNode(span);
    }
    
    handleInput();
    localEditorRef.current?.focus();
  };


  const handleToolbarMouseDown = (e: React.MouseEvent<HTMLButtonElement | HTMLSelectElement>) => {
    e.preventDefault(); // Prevent editor from losing focus
    saveSelection();
  };

  const handleBold = () => execCommand('bold');
  const handleItalic = () => execCommand('italic');
  const handleUnderline = () => execCommand('underline');
  const handleBulletedList = () => execCommand('insertUnorderedList');
  const handleNumberedList = () => execCommand('insertOrderedList');
  const handleBlockquote = () => execCommand('formatBlock', '<blockquote>');
  const handleHorizontalRule = () => execCommand('insertHorizontalRule');
  const handleUndo = () => execCommand('undo');
  const handleRedo = () => execCommand('redo');
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
    if (linkUrl && selectionRef.current && selectionRef.current.toString()) {
        const selectedText = selectionRef.current.toString();
        const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${selectedText}</a>`;
        document.execCommand('insertHTML', false, linkHtml);
        handleInput();
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
    execCommand('insertHTML', false, imgTag);
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
    execCommand('insertHTML', false, videoTag);
    setIsYouTubeDialogOpen(false);
    setYouTubeUrl('');
  };
  
  const handleOpenIframeDialog = () => {
    saveSelection();
    setIsIframeDialogOpen(true);
  }
  
  const handleIframeConfirm = () => {
    if (!iframeCode.trim()) return;
    if (!iframeCode.trim().startsWith('<iframe') || !iframeCode.trim().endsWith('>')) {
        alert('Invalid embed code. Please paste the full <iframe> tag.');
        return;
    }
    execCommand('insertHTML', false, `<div style="width: 100%; aspect-ratio: 16 / 9;">${iframeCode}</div>`);
    setIsIframeDialogOpen(false);
    setIframeCode('');
  }

  const handleFontColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCommand('foreColor', e.target.value);
  };
  
  const handleFormatBlock = (tag: string) => {
    execCommand('formatBlock', `<${tag}>`);
  };
  
  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const className = e.target.value;
    if (!className) return;
    applyStyle(className);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    execCommand('fontSize', e.target.value);
  };

  return (
    <>
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
      <Dialog open={isIframeDialogOpen} onOpenChange={setIsIframeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Content</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="iframe-code">Embed Code</Label>
            <Textarea 
              id="iframe-code"
              value={iframeCode}
              onChange={(e) => setIframeCode(e.target.value)}
              placeholder="Paste <iframe> code here..."
              rows={6}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleIframeConfirm}>Embed Content</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className={cn("border rounded-md", disabled && 'bg-muted opacity-50', className)}>
        <div className="flex items-center gap-1 p-2 border-b bg-muted/50 flex-wrap">
          <select onChange={handleFontSizeChange} className="p-1 rounded-md border bg-background text-sm" disabled={disabled}>
            <option value="1">Smallest</option>
            <option value="2">Small</option>
            <option value="3" selected>Normal</option>
            <option value="4">Large</option>
            <option value="5">Largest</option>
            <option value="6">Huge</option>
            <option value="7">Giant</option>
          </select>
          <select onChange={handleFontFamilyChange} className="p-1 rounded-md border bg-background text-sm" disabled={disabled}>
            <option value="font-body">Lora (Default)</option>
            <option value="font-sans">Arial</option>
            <option value="font-serif">Cinzel</option>
            <option value="font-uncial">Uncial Antiqua</option>
            <option value="font-medieval">MedievalSharp</option>
            <option value="font-pirata">Pirata One</option>
          </select>
          <div className="flex items-center h-8 w-8 justify-center rounded-md border bg-background">
              <Input type="color" onChange={handleFontColorChange} onMouseDown={handleToolbarMouseDown} className="w-full h-full p-0 border-none cursor-pointer" title="Font Color" disabled={disabled}/>
          </div>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleBold} title="Bold" disabled={disabled}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleItalic} title="Italic" disabled={disabled}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleUnderline} title="Underline" disabled={disabled}>
            <Underline className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={() => handleFormatBlock('p')} title="Paragraph" disabled={disabled}>
            <Pilcrow className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleBulletedList} title="Bulleted List" disabled={disabled}>
            <List className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleNumberedList} title="Numbered List" disabled={disabled}>
            <ListOrdered className="h-4 w-4" />
          </Button>
           <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleBlockquote} title="Blockquote" disabled={disabled}>
            <Quote className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleHorizontalRule} title="Horizontal Rule" disabled={disabled}>
            <Minus className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleJustifyLeft} title="Align Left" disabled={disabled}>
              <AlignLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleJustifyCenter} title="Align Center" disabled={disabled}>
              <AlignCenter className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleJustifyRight} title="Align Right" disabled={disabled}>
              <AlignRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleOpenLinkDialog} title="Link" disabled={disabled}>
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleOpenImageDialog} title="Image" disabled={disabled}>
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleOpenYouTubeDialog} title="YouTube Video" disabled={disabled}>
            <Youtube className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleOpenIframeDialog} title="Embed Iframe" disabled={disabled}>
            <Code className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleUndo} title="Undo" disabled={disabled}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleRedo} title="Redo" disabled={disabled}>
            <Redo className="h-4 w-4" />
          </Button>
        </div>
        <div
          ref={localEditorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onBlur={saveSelection}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          className="prose prose-sm max-w-none p-3 min-h-[150px] outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-b-md"
          />
      </div>
    </>
  );
});

RichTextEditor.displayName = "RichTextEditor";

export default RichTextEditor;
