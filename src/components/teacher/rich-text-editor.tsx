
'use client';

import React, { useEffect, useMemo, useImperativeHandle, useRef, forwardRef, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const RichTextEditor = forwardRef<TinyMCEEditor | null, RichTextEditorProps>(
  ({ value, onChange, disabled = false }, ref) => {
    const editorRef = useRef<TinyMCEEditor | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Dark mode tracking with live updates
    const prefersDark = useMemo(() => {
      if (typeof window === 'undefined') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }, []);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    useEffect(() => {
      if (typeof window === 'undefined') return;
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        // Force a remount to apply new skin/content css
        setIsMounted(false);
        // Next tick so unmount/mount happens
        setTimeout(() => setIsMounted(true), 0);
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }, []);

    useImperativeHandle(ref, () => editorRef.current, []);

    const init = useMemo(() => ({
      promotion: false,
      branding: false,
      statusbar: false,
      onboarding: false,
      menubar: true,
      height: 1200,

      // Using a safe list of core plugins
      plugins: [
        'anchor', 'autolink', 'charmap', 'codesample',
        'emoticons', 'link', 'lists', 'media', 'searchreplace',
        'table', 'visualblocks', 'wordcount',
        'checklist', 'markdown',
      ],
      toolbar:
        'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | ' +
        'link media table | align lineheight | checklist numlist bullist indent outdent | ' +
        'emoticons charmap | removeformat',

      font_family_formats:
        "Uncial Antiqua=uncial antiqua,cursive; MedievalSharp=medievalsharp,cursive; Cinzel=cinzel,serif; " +
        "Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; " +
        "Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; " +
        "Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; " +
        "Symbol=symbol; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monaco; " +
        "Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva; " +
        "Webdings=webdings; Wingdings=wingdings,zapf dingbats",

      content_style:
        "@import url('https://fonts.googleapis.com/css2?family=Uncial+Antiqua&family=MedievalSharp&family=Cinzel&display=swap');" +
        "body{font-family:var(--font-lora),serif;}",
      
      skin: prefersDark ? 'oxide-dark' : 'oxide',
      content_css: prefersDark ? 'dark' : 'default',
      referrer_policy: 'origin',
    }), [prefersDark]);

    if (!isMounted) return null;

    return (
      <Editor
        apiKey='3pit55fk53u6a49yntmptfverzhdmw7fspxeqlv3e1wkhlui'
        onInit={(_, editor) => (editorRef.current = editor)}
        value={value}
        onEditorChange={(content) => onChange(content)}
        disabled={disabled}
        init={init}
      />
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;
