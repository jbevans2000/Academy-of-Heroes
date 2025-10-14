
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
      'https://fonts.googleapis.com/css2?family=Uncial+Antiqua&family=MedievalSharp&family=Cinzel&display=swap';

    const init = useMemo(
      () => ({
        promotion: false,
        branding: false,
        statusbar: false,
        elementpath: false,
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
          'media',
          'searchreplace',
          'table',
          'visualblocks',
          'checklist',
          'paste',
          'image',
        ],

        toolbar:
          'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | ' +
          'link image media table | align lineheight | checklist numlist bullist indent outdent | ' +
          'emoticons charmap | removeformat',
        
        paste_as_text: false,
        paste_data_images: true,

        content_style: `
          body { font-family: Lora, serif; }
          img {
            width: auto !important;
            height: auto !important;
            max-width: 100%;
            display: inline;
          }
          figure.image img {
            width: auto !important;
            height: auto !important;
            max-width: 100%;
          }
        `,

        content_css: prefersDark ? ['dark', fontsUrl] : ['default', fontsUrl],

        font_family_formats:
          "Uncial Antiqua='Uncial Antiqua',cursive; MedievalSharp=MedievalSharp,cursive; Cinzel=Cinzel,serif; " +
          "Lora=Lora,serif; Arial=Arial,Helvetica,sans-serif; Times New Roman='Times New Roman',Times,serif; " +
          "Georgia=Georgia,serif; Verdana=Verdana,Geneva,sans-serif;",
        
        skin: prefersDark ? 'oxide-dark' : 'oxide',
        
        referrer_policy: 'origin',
      }),
      [prefersDark, fontsUrl]
    );

    if (!isMounted) return null;

    return (
      <Editor
        key={prefersDark ? 'dark' : 'light'}
        apiKey='3pit55fk53u6a49yntmptfverzhdmw7fspxeqlv3e1wkhlui'
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
