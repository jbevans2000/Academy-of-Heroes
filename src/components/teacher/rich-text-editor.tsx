
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

const RichTextEditor = forwardRef<TinyMCEEditor | null, RichTextEditorProps>(
  ({ value, onChange, disabled = false, className }, ref) => {
    const editorRef = useRef<TinyMCEEditor | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [prefersDark, setPrefersDark] = useState(false);

    useEffect(() => {
      setIsMounted(true);
      if (typeof window === 'undefined') return;

      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      setPrefersDark(mq.matches);
      const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }, []);

    useImperativeHandle(ref, () => editorRef.current, []);

    // Fonts loaded inside the editor iframe
    const fontsUrl =
      'https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Cinzel:wght@400;700&display=swap';

    const init = useMemo(
      () => ({
        promotion: false,
        branding: false,
        statusbar: false,       // hide status bar (removes word-count/element path UI)
        elementpath: false,      // belt-and-suspenders: no element path even if statusbar toggled
        onboarding: false,
        menubar: true,
        height: 1200,

        plugins: [
          'anchor',
          'autolink',
          'charmap',
          'codesample',
          'emoticons',
          'link',
          'lists',
          'media',              // video/iframe embeds
          'searchreplace',
          'table',
          'visualblocks',
          // 'wordcount',         // removed to ensure no word-count UI
          'checklist',
          'paste',
          'image',
          // 'autoresize',        // optional: use if you want auto-growing editor
        ],

        toolbar:
          'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | ' +
          'link image media table | align lineheight | checklist numlist bullist indent outdent | ' +
          'emoticons charmap | removeformat',

        paste_as_text: false,
        paste_data_images: true,

        // Load theme content CSS first, then Google Fonts
        content_css: prefersDark ? ['dark', fontsUrl] : ['default', fontsUrl],

        // Style rules:
        // - Keep images from stretching (natural size; scale down if too big)
        // - Rounded corners for images/videos/embeds
        // - Clip corners in wrappers
        // - Add vertical spacing equal to ~two text lines above and below media
        content_style: `
          :root {
            --aoh-media-radius: 8px;
            --aoh-media-block-space: 2em; /* ≈ two lines of text */
          }
          body { font-family: Lora, serif; }

          /* Standalone images: preserve intrinsic size, scale down if needed, rounded, spaced */
          img {
            width: auto !important;
            height: auto !important;
            max-width: 100%;
            display: inline;
            border-radius: var(--aoh-media-radius);
            margin: var(--aoh-media-block-space) 0;
          }

          /* TinyMCE <figure class="image"> wrapper around images */
          figure.image {
            display: inline-block;
            border-radius: var(--aoh-media-radius);
            overflow: hidden; /* clip the rounded corners */
            margin: var(--aoh-media-block-space) 0;
          }
          figure.image img {
            border-radius: 0; /* clipping handled by figure */
            margin: 0;        /* no inner spacing—outer figure handles it */
          }

          /* Videos */
          video {
            max-width: 100%;
            height: auto;
            border: 0;
            border-radius: var(--aoh-media-radius);
            display: block;
            margin: var(--aoh-media-block-space) 0;
          }

          /* Common media/iframe wrappers (YouTube/Vimeo etc.) */
          figure.media,
          .mce-preview-object,
          .mce-object-iframe {
            border-radius: var(--aoh-media-radius);
            overflow: hidden; /* ensures iframe corners are clipped */
            margin: var(--aoh-media-block-space) 0;
          }
          figure.media iframe,
          .mce-preview-object iframe,
          .mce-object-iframe iframe,
          iframe {
            border: 0;
            border-radius: 0;  /* clipping handled by parent wrapper */
            display: block;
            max-width: 100%;
          }
        `,

        font_family_formats:
          "Lora=Lora,serif; Cinzel=Cinzel,serif; " +
          "Arial=Arial,Helvetica,sans-serif; Times New Roman=Times New Roman,Times,serif; " +
          "Georgia=Georgia,serif; Verdana=Verdana,Geneva,sans-serif; " +
          "Uncial Antiqua='Uncial Antiqua',cursive; MedievalSharp=MedievalSharp,cursive",

        skin: prefersDark ? 'oxide-dark' : 'oxide',
        referrer_policy: 'origin',
      }),
      [prefersDark, fontsUrl]
    );

    if (!isMounted) return null;

    return (
      <Editor
        key={prefersDark ? 'dark' : 'light'} // force remount to apply theme/css on change
        apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
        onInit={(_, editor) => (editorRef.current = editor)}
        value={value}
        onEditorChange={(content) => onChange(content)}
        disabled={disabled}
        init={init}
        className={className}
      />
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;
