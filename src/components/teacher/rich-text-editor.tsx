
'use client';

import React, { useRef, useEffect, useState, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, Link as LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Youtube, List, Minus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [isYouTubeDialogOpen, setIsYouTubeDialogOpen] = useState(false);
  const [youTubeUrl, setYouTubeUrl] = useState('');
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageWidth, setImageWidth] = useState('');
  
  // State for editing an existing image
  const [isEditImageDialogOpen, setIsEditImageDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<{el: HTMLImageElement | null, src: string, width: string}>({ el: null, src: '', width: '' });


  useEffect(() => {
    const editor = localEditorRef.current;
    if (editor && value !== editor.innerHTML) {
      editor.innerHTML = value;
    }
  }, [value]);
  
    // Add click listener for editing images
    useEffect(() => {
        const editor = localEditorRef.current;
        if (!editor || disabled) return;

        const handleEditorClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName.toLowerCase() === 'img') {
                e.preventDefault();
                const imageElement = target as HTMLImageElement;
                setEditingImage({
                    el: imageElement,
                    src: imageElement.src,
                    width: imageElement.style.width || '100%',
                });
                setIsEditImageDialogOpen(true);
            }
        };

        editor.addEventListener('click', handleEditorClick);
        return () => {
            editor.removeEventListener('click', handleEditorClick);
        };
    }, [disabled, value]); // Rerun if the editor becomes enabled/disabled or content changes

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

    // Find the closest ancestor with a font class and remove it
    let currentNode: Node | null = range.startContainer;
    while (currentNode && currentNode !== localEditorRef.current) {
        if (currentNode.nodeType === Node.ELEMENT_NODE) {
            const el = currentNode as HTMLElement;
            const classList = Array.from(el.classList);
            const fontClass = classList.find(c => c.startsWith('font-'));
            if (fontClass) {
                el.classList.remove(fontClass);
                // If no other classes, unwrap the span
                if (el.classList.length === 0 && el.tagName.toLowerCase() === 'span') {
                    const parent = el.parentNode;
                    while(el.firstChild) {
                        parent?.insertBefore(el.firstChild, el);
                    }
                    parent?.removeChild(el);
                }
                break; // Stop at the first font class found
            }
        }
        currentNode = currentNode.parentNode;
    }


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

  const handleToolbarMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent editor from losing focus
    saveSelection();
  };

  const handleBold = () => execCommand('bold');
  const handleItalic = () => execCommand('italic');
  const handleUnderline = () => execCommand('underline');
  const handleBulletedList = () => execCommand('insertUnorderedList');
  const handleHorizontalRule = () => execCommand('insertHorizontalRule');
  const handleJustifyLeft = () => execCommand('justifyLeft');
  const handleJustifyCenter = () => execCommand('justifyCenter');
  const handleJustifyRight = () => execCommand('justifyRight');
  
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
  
    const handleImageUpdate = () => {
        if (!editingImage.el) return;
        let finalWidth = editingImage.width.trim();
        // Ensure it's a percentage
        if (/^\d+$/.test(finalWidth)) {
            finalWidth += '%';
        }
        editingImage.el.style.width = finalWidth;
        handleInput();
        setIsEditImageDialogOpen(false);
    };

    const handleImageRemove = () => {
        if (!editingImage.el) return;
        const parentDiv = editingImage.el.parentElement;
        if (parentDiv && parentDiv.parentElement === localEditorRef.current) {
            localEditorRef.current?.removeChild(parentDiv);
        } else {
             editingImage.el.remove();
        }
        handleInput();
        setIsEditImageDialogOpen(false);
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
      {/* Dialog for YouTube */}
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
      {/* Dialog for Inserting Image */}
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
       {/* Dialog for Editing Image */}
        <Dialog open={isEditImageDialogOpen} onOpenChange={setIsEditImageDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Image</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-image-url">Image URL</Label>
                        <Input id="edit-image-url" value={editingImage.src} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-image-width">Image Width</Label>
                        <Input
                            id="edit-image-width"
                            value={editingImage.width}
                            onChange={(e) => setEditingImage(prev => ({...prev, width: e.target.value}))}
                            placeholder="e.g., 80%"
                        />
                    </div>
                </div>
                <DialogFooter className="justify-between">
                    <Button variant="destructive" onClick={handleImageRemove}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Image
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditImageDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleImageUpdate}>Update Image</Button>
                    </div>
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
          </select>
          <div className="flex items-center h-8 w-8 justify-center rounded-md border bg-background">
              <Input type="color" onChange={handleFontColorChange} onMouseDown={(e) => e.preventDefault()} className="w-full h-full p-0 border-none cursor-pointer" title="Font Color" disabled={disabled}/>
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
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleBulletedList} title="Bulleted List" disabled={disabled}>
            <List className="h-4 w-4" />
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
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleOpenImageDialog} title="Image" disabled={disabled}>
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onMouseDown={handleToolbarMouseDown} onClick={handleOpenYouTubeDialog} title="YouTube Video" disabled={disabled}>
            <Youtube className="h-4 w-4" />
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
