
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const RichTextEditor = React.forwardRef<any, RichTextEditorProps>(({ value, onChange, disabled = false }, ref) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null; // Or a placeholder/skeleton
    }

  return (
    <Editor
      apiKey='3pit55fk53u6a49yntmptfverzhdmw7fspxeqlv3e1wkhlui'
      ref={ref}
      value={value}
      onEditorChange={onChange}
      disabled={disabled}
      init={{
        height: 1200,
        promotion: false,
        branding: false,
        statusbar: false,
        onboarding: false,
        menubar: true,
        plugins: [
          'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount',
          'checklist', 'mediaembed', 'casechange', 'formatpainter', 'pageembed', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 'advtable', 'advcode', 'advtemplate', 'ai', 'uploadcare', 'mentions', 'tinycomments', 'tableofcontents', 'footnotes', 'mergetags', 'autocorrect', 'typography', 'inlinecss', 'markdown','importword', 'exportword', 'exportpdf'
        ],
        toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography uploadcare | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat',
        tinycomments_mode: 'embedded',
        tinycomments_author: 'Author name',
        font_family_formats: "Uncial Antiqua=uncial antiqua,cursive; MedievalSharp=medievalsharp,cursive; Cinzel=cinzel,serif; Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Symbol=symbol; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monaco; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva; Webdings=webdings; Wingdings=wingdings,zapf dingbats",
        content_css: '/globals.css',
        mergetags_list: [
          { value: 'First.Name', title: 'First Name' },
          { value: 'Email', title: 'Email' },
        ],
        ai_request: (request: any, respondWith: any) => respondWith.string(() => Promise.reject("See docs to implement AI Assistant")),
        uploadcare_public_key: 'df2452a7d207a8276dcf',
        skin: (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'oxide-dark' : 'oxide',
        content_css_dark: (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : undefined,
        referrer_policy: 'origin',
      }}
    />
  );
});

RichTextEditor.displayName = "RichTextEditor";

export default RichTextEditor;
