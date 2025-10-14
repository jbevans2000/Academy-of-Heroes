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
const DEFAULT_H = 1000;   // default wrapper + content height
const MAX_H = 4000;

const RichTextEditor = forwardRef<TinyMCEEditor | null, RichTextEditorProps>(
  ({ value, onChange, disabled = false, className, ...props }, ref) => {
    const editorRef = useRef<TinyMCEEditor | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    const [isMounted, setIsMounted] = useState(false);
    const [prefersDark, setPrefersDark] = useState(false);

    // Keep wrapper height in state and sync it with native drag + autosize
    const [containerHeight, setContainerHeight] = useState<number>(DEFAULT_H);

    // Flags & observers
    const userResizingRef = useRef(false);
    const contentRORef = useRef<ResizeObserver | null>(null);
    const wrapperRORef = useRef<ResizeObserver | null>(null);
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
        statusbar: false,   // hide word count & element path
        elementpath: false,
        onboarding: false,
        menubar: true,

        // No TinyMCE 'autoresize' plugin — we autosize the wrapper ourselves
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

        // Theme content CSS then Google Fonts (loaded inside iframe)
        content_css: prefersDark ? ['dark', fontsUrl] : ['default', fontsUrl],

        // Keep images from stretching; rounded corners; 2-line spacing; embed styling
        content_style: `
          :root {
            --aoh-media-radius: 8px;
            --aoh-media-block-space: 2em; /* ≈ two lines of text */
          }
          html, body { height: 100%; } /* allow body to fill iframe when we expand it */
          body { font-family: Lora, serif; }

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

        // Expose the families in the dropdown
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

    // Helper: make the editor iframe height match the wrapper (minus chrome)
    const syncIframeToWrapperHeight = (wrapperH: number) => {
      const editor = editorRef.current;
      if (!editor) return;

      const container = editor.getContainer?.() as HTMLElement | null;
      const iframe = editor.getContentAreaContainer?.()?.querySelector('iframe') as HTMLIFrameElement | null;
      if (!container || !iframe) return;

      // Measure TinyMCE UI chrome above the iframe
      const menubar = container.querySelector('.tox-menubar') as HTMLElement | null;
      const toolbar = container.querySelector('.tox-toolbar') as HTMLElement | null;
      const statusbar = container.querySelector('.tox-statusbar') as HTMLElement | null; // hidden, but safe
      const chrome =
        (menubar?.offsetHeight || 0) +
        (toolbar?.offsetHeight || 0) +
        (statusbar?.offsetHeight || 0);

      const target = Math.max(200, Math.round(wrapperH - chrome - 2)); // small buffer
      iframe.style.height = `${target}px`;
    };

    // 1) Observe editor content height and (when not dragging) grow/shrink the wrapper to fit
    useEffect(() => {
      if (typeof window === 'undefined') return;
      const RO: any = (window as any).ResizeObserver;
      if (!RO || !editorRef.current) return;

      const area = editorRef.current.getContentAreaContainer?.();
      const iframe = area?.querySelector?.('iframe') as HTMLIFrameElement | null;
      if (!iframe) return;

      const setupObserver = () => {
        try {
          const doc = iframe.contentDocument || iframe.ownerDocument;
          const body = doc?.body;
          if (!body) return;

          if (contentRORef.current) {
            contentRORef.current.disconnect();
            contentRORef.current = null;
          }

          const observer = new RO(() => {
            if (userResizingRef.current) return; // don't fight native drag
            const scrollH = body.scrollHeight;
            const desired = Math.min(
              MAX_H,
              Math.max(DEFAULT_H, scrollH + 16)
            );
            setContainerHeight((prev) =>
              Math.abs(prev - desired) < 8 ? prev : desired
            );
          }) as ResizeObserver;

          contentRORef.current = observer;
          observer.observe(body);
        } catch {
          // cross-origin oddities — ignore
        }
      };

      setupObserver();
      const onLoad = () => setupObserver();
      iframe.addEventListener('load', onLoad);
      return () => {
        iframe.removeEventListener('load', onLoad);
        if (contentRORef.current) {
          contentRORef.current.disconnect();
          contentRORef.current = null;
        }
      };
    }, [isMounted, prefersDark]);

    // 2) Observe the wrapper itself so when the user drags (native CSS resizer),
    //    we sync React state AND the iframe height to the actual DOM height.
    useEffect(() => {
      if (typeof window === 'undefined') return;
      const RO: any = (window as any).ResizeObserver;
      if (!RO || !wrapperRef.current) return;

      if (wrapperRORef.current) {
        wrapperRORef.current.disconnect();
        wrapperRORef.current = null;
      }

      const observer = new RO(() => {
        if (!wrapperRef.current) return;
        const h = Math.min(MAX_H, Math.max(MIN_H, Math.round(wrapperRef.current.getBoundingClientRect().height)));
        setContainerHeight((prev) => (Math.abs(prev - h) < 4 ? prev : h));
        // Keep the typing area stretched to match the wrapper
        syncIframeToWrapperHeight(h);
      }) as ResizeObserver;

      wrapperRORef.current = observer;
      observer.observe(wrapperRef.current);

      return () => {
        observer.disconnect();
        wrapperRORef.current = null;
      };
    }, []);

    // 3) Pause autosizing while the user is dragging anywhere in the wrapper
    useEffect(() => {
      const el = wrapperRef.current;
      if (!el || typeof window === 'undefined') return;

      const down = () => { userResizingRef.current = true; };
      const up = () => {
        userResizingRef.current = false;
        // On mouseup, ensure iframe fill is perfect
        syncIframeToWrapperHeight(wrapperRef.current!.clientHeight);
      };

      el.addEventListener('mousedown', down);
      window.addEventListener('mouseup', up);
      return () => {
        el.removeEventListener('mousedown', down);
        window.removeEventListener('mouseup', up);
      };
    }, []);

    // 4) Watch header DOM for size changes (fonts/skin), re-sync iframe height
    useEffect(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const container = editor.getContainer?.() as HTMLElement | null;
      if (!container) return;

      const header = container.querySelector('.tox-editor-header');
      if (!header) return;

      if (headerMORef.current) {
        headerMORef.current.disconnect();
        headerMORef.current = null;
      }
      const mo = new MutationObserver(() => {
        syncIframeToWrapperHeight(wrapperRef.current?.clientHeight || containerHeight);
      });
      mo.observe(header, { attributes: true, childList: true, subtree: true });
      headerMORef.current = mo;

      return () => {
        mo.disconnect();
        headerMORef.current = null;
      };
    }, [isMounted, prefersDark, containerHeight]);

    // 5) Keep iframe filled on mount / theme change / containerHeight change / window resize
    useEffect(() => {
      if (!isMounted) return;
      syncIframeToWrapperHeight(containerHeight);
      const onResize = () => syncIframeToWrapperHeight(wrapperRef.current?.clientHeight || containerHeight);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMounted, containerHeight, prefersDark]);

    if (!isMounted) return null;

    return (
      <div
        ref={wrapperRef}
        className={className}
        style={{
          position: 'relative',
          resize: 'vertical',          // native click & drag resizer
          overflow: 'auto',
          height: containerHeight,     // synced with native drag and autosize
          minHeight: MIN_H,
          maxHeight: MAX_H,
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 8,
          background: 'transparent',
        }}
        {...props}
      >
        <Editor
          key={prefersDark ? 'dark' : 'light'} // remount to apply theme/css on change
          apiKey="3pit55fk53u6a49yntmptfverzhdmw7fspxeqlv3e1wkhlui"
          onInit={(_, editor) => {
            editorRef.current = editor;
            // First sync once editor is ready
            setTimeout(() => syncIframeToWrapperHeight(containerHeight), 0);
          }}
          value={value}
          onEditorChange={(content) => onChange(content)}
          disabled={disabled}
          init={init}
        />

        {/* Cosmetic corner so users notice they can resize. Native handle still works. */}
        <div
          id="aoh-editor-resize-handle"
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 16,
            height: 16,
            cursor: 'nwse-resize',
            zIndex: 10,
            background:
              'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.18) 50%)',
            borderTopLeftRadius: 3,
            userSelect: 'none',
            pointerEvents: 'none', // don't block native resizer
          }}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;
