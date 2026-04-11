"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/html/strip";

interface RichTextEditorProps {
  content: string;
  onChange?: (html: string) => void;
  name?: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  name,
  placeholder,
  maxLength,
  disabled,
}: RichTextEditorProps) {
  const hiddenRef = useRef<HTMLInputElement>(null);

  // Normalize plain text to HTML for Tiptap
  const initialContent = content && !content.includes("<")
    ? `<p>${content}</p>`
    : content;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: initialContent,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
      if (hiddenRef.current) hiddenRef.current.value = html;
    },
  });

  // Sync disabled state
  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  const textLength = stripHtml(editor.getHTML()).length;

  const handleLink = () => {
    const existingHref = editor.getAttributes("link").href;
    if (existingHref) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("URL do link:");
    if (!url) return;
    if (editor.state.selection.empty) {
      editor
        .chain()
        .focus()
        .insertContent(url)
        .setTextSelection({ from: editor.state.selection.from - url.length, to: editor.state.selection.from })
        .setLink({ href: url })
        .run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const tools = [
    {
      label: "Negrito",
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      icon: "B",
      className: "font-bold",
    },
    {
      label: "Itálico",
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      icon: "I",
      className: "italic",
    },
    {
      label: "Lista",
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
      icon: "\u2022",
      className: "",
    },
    {
      label: "Lista numerada",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
      icon: "1.",
      className: "",
    },
    {
      label: editor.isActive("link") ? "Remover link" : "Link",
      action: handleLink,
      active: editor.isActive("link"),
      icon: "\uD83D\uDD17",
      className: "",
    },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div className="flex gap-1 rounded-t-md border border-input bg-muted/50 px-2 py-1">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            aria-label={tool.label}
            aria-pressed={tool.active}
            onClick={tool.action}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded text-sm transition-colors hover:bg-muted",
              tool.active && "bg-muted text-foreground ring-1 ring-ring",
              tool.className
            )}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className={cn(
          "min-h-[80px] rounded-b-md border border-t-0 border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
          "focus-within:ring-1 focus-within:ring-ring",
          "[&_.tiptap]:outline-none [&_.tiptap]:min-h-[60px]",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:h-0",
          "[&_.tiptap_strong]:font-semibold [&_.tiptap_em]:italic",
          "[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5 [&_.tiptap_li]:mt-1",
          "[&_.tiptap_a]:text-primary [&_.tiptap_a]:underline [&_.tiptap_a]:underline-offset-2",
          disabled && "pointer-events-none opacity-50"
        )}
      />

      {/* Hidden input for form submission */}
      {name && (
        <input
          ref={hiddenRef}
          type="hidden"
          name={name}
          defaultValue={content}
        />
      )}

      {/* Character count */}
      {maxLength && (
        <span className="text-xs text-muted-foreground">
          {textLength}/{maxLength}
        </span>
      )}
    </div>
  );
}
