
'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import 'react-quill/dist/quill.snow.css';
import type { ReactQuillProps } from 'react-quill';

// Dynamically import ReactQuill to avoid SSR issues, and wrap it in a forwardRef
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill');
    // eslint-disable-next-line react/display-name
    return ({ forwardedRef, ...props }: ReactQuillProps & { forwardedRef: React.Ref<any> }) => (
      <RQ ref={forwardedRef} {...props} />
    );
  },
  { ssr: false }
);


interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
    ['link', 'image'],
    ['clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'bullet', 'indent',
  'link', 'image'
];

function RichTextEditor({ value, onChange }: RichTextEditorProps, ref: React.Ref<any>) {
  return (
    <div className="bg-background">
        <ReactQuill
        forwardedRef={ref}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        />
    </div>
  );
}

export default React.forwardRef(RichTextEditor);
