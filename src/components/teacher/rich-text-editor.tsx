'use client';

import React, {
  useEffect,
  useMemo,
  useImperativeHandle,
  useRef,
  forwardRef,
  useState,
} from 'react';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const MIN_H = 600;
const DEFAULT_H = 5000;   // default wrapper + content height
const MAX_H = 5000;

const RichTextEditor = forwardRef<TinyMCEEditor | null, RichTextEditorProps>(
  ({ value, onChange, disabled = false, className, ...props }, ref) => {
    const editorRef = useRef<TinyMCEEditor | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    const [isMounted, setIsMounted] = useState(false);
    const [prefersDark, setPrefersDark] = useState(false);

    // Keep wrapper height in state
    const [containerHeight, setContainerHeight] = useState<number>(DEFAULT_H);

    // Observers
    const contentRORef = useRef<ResizeObserver | null>(null);
    const headerMORef = useRef<MutationObserver | null>(null);

    useEffect(() => {
      setIsMounted(true);
      if (typeof window === 'undefined') return;

      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      setPrefersDark(mq.matches);
      const handler = (e: any) => setPrefersDark(!!e.matches);

      if (mq.addEventListener) {
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
      } else if (mq.addListener) {
        mq.addListener(handler);
        return () => mq.removeListener(handler);
      }
    }, []);

    useImperativeHandle(ref, () => editorRef.current, []);

    // Load all fonts inside the editor iframe
    const fontsUrl =
      'https://fonts.googleapis.com/css2?' +
      'family=Lora:wght@400;700' +
      '&family=Cinzel:wght@400;700' +
      '&family=Uncial+Antiqua' +
      '&family=MedievalSharp' +
      '&display=swap';

    const init = useMemo(
      () => ({
        promotion: false,
        branding: false,
        statusbar: false,
        elementpath: false,
        onboarding: false,
        menubar: true,

        plugins: [
          'anchor',
          'autolink',
          'charmap',
          'codesample',
          'emoticons',
          'link',
          'lists',
          'media',
          'searchreplace',
          'table',
          'visualblocks',
          'checklist',
          'paste',
          'image',
          'autoresize'
        ],

        toolbar:
          'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | ' +
          'link image media table | align lineheight | checklist numlist bullist indent outdent | ' +
          'emoticons charmap | removeformat',

        paste_as_text: false,
        paste_data_images: true,

        autoresize_bottom_margin: 32,
        autoresize_overflow_padding: 16,
        autoresize_min_height: MIN_H,
        autoresize_max_height: MAX_H,

        content_css: prefersDark ? ['dark', fontsUrl] : ['default', fontsUrl],

        content_style: `
          :root {
            --aoh-media-radius: 8px;
            --aoh-media-block-space: 2em; /* ≈ two lines of text */
          }
          html { height: 100%; }
          body { font-family: Lora, serif; min-height: 100%; }

          img {
            width: auto !important;
            height: auto !important;
            max-width: 100%;
            display: inline;
            border-radius: var(--aoh-media-radius);
            margin: var(--aoh-media-block-space) 0;
          }

          figure.image {
            display: inline-block;
            border-radius: var(--aoh-media-radius);
            overflow: hidden;
            margin: var(--aoh-media-block-space) 0;
          }
          figure.image img { border-radius: 0; margin: 0; }

          video {
            max-width: 100%;
            height: auto;
            border: 0;
            border-radius: var(--aoh-media-radius);
            display: block;
            margin: var(--aoh-media-block-space) 0;
          }

          figure.media,
          .mce-preview-object,
          .mce-object-iframe {
            border-radius: var(--aoh-media-radius);
            overflow: hidden;
            margin: var(--aoh-media-block-space) 0;
          }
          figure.media iframe,
          .mce-preview-object iframe,
          .mce-object-iframe iframe,
          iframe {
            border: 0;
            border-radius: 0;
            display: block;
            max-width: 100%;
          }
        `,

        font_family_formats:
          "Lora=Lora,serif; Cinzel=Cinzel,serif; " +
          "Uncial Antiqua='Uncial Antiqua',cursive; MedievalSharp=MedievalSharp,cursive; " +
          "Arial=Arial,Helvetica,sans-serif; Times New Roman=Times New Roman,Times,serif; " +
          "Georgia=Georgia,serif; Verdana=Verdana,Geneva,sans-serif;",

        skin: prefersDark ? 'oxide-dark' : 'oxide',
        referrer_policy: 'origin',
      }),
      [prefersDark, fontsUrl]
    );

    if (!isMounted) return null;

    return (
      <div
        ref={wrapperRef}
        className={className}
        style={{
          position: 'relative',
          overflow: 'auto',
          minHeight: MIN_H,
          maxHeight: MAX_H,
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 8,
          background: 'transparent',
        }}
        {...props}
      >
        <Editor
          key={prefersDark ? 'dark' : 'light'}
          apiKey="3pit55fk53u6a49yntmptfverzhdmw7fspxeqlv3e1wkhlui"
          onInit={(_, editor) => {
            editorRef.current = editor;
          }}
          value={value}
          onEditorChange={(content) => onChange(content)}
          disabled={disabled}
          init={init}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;
