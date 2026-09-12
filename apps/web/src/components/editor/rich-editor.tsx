"use client";

import { useEffect, useMemo, useRef } from "react";
import { EditorContent, ReactRenderer, useEditor, type Editor } from "@tiptap/react";
import { generateHTML, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Mention from "@tiptap/extension-mention";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { MentionList, type MentionItem, type MentionListRef } from "./mention-list";
import { displayName } from "@/components/common/user-avatar";
import { cn } from "@/lib/utils";

export type { JSONContent };

const baseExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
];

const mentionRender = Mention.configure({
  HTMLAttributes: { class: "mention" },
  renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
});

/** Extensions used for read-only rendering (no suggestion popup). */
export const renderExtensions = [...baseExtensions, mentionRender];

function buildMention(getMembers: () => MentionItem[]) {
  return Mention.configure({
    HTMLAttributes: { class: "mention" },
    renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
    suggestion: {
      char: "@",
      items: ({ query }) =>
        getMembers()
          .filter((m) => displayName(m).toLowerCase().includes(query.toLowerCase()) || (m.email ?? "").toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6),
      render: () => {
        let component: ReactRenderer<MentionListRef> | null = null;
        let popup: TippyInstance[] = [];
        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionList, { props, editor: props.editor });
            if (!props.clientRect) return;
            popup = tippy("body", {
              getReferenceClientRect: props.clientRect as () => DOMRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
              arrow: false,
              offset: [0, 6],
            });
          },
          onUpdate: (props) => {
            component?.updateProps(props);
            if (props.clientRect) popup[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
          },
          onKeyDown: (props) => {
            if (props.event.key === "Escape") {
              popup[0]?.hide();
              return true;
            }
            return component?.ref?.onKeyDown(props) ?? false;
          },
          onExit: () => {
            popup[0]?.destroy();
            component?.destroy();
          },
        };
      },
    },
  });
}

export function extractMentionIds(doc: JSONContent | null | undefined): string[] {
  const ids = new Set<string>();
  const walk = (n: JSONContent | undefined) => {
    if (!n) return;
    if (n.type === "mention" && n.attrs?.id) ids.add(String(n.attrs.id));
    n.content?.forEach(walk);
  };
  walk(doc ?? undefined);
  return Array.from(ids);
}

export function isEmptyDoc(doc: JSONContent | null | undefined): boolean {
  if (!doc || !doc.content) return true;
  return doc.content.every((n) => (n.type === "paragraph" && !n.content?.length) || false);
}

export function RichEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Write something…",
  members,
  className,
  autoFocus,
  editable = true,
  onSubmit,
  editorRef,
  minHeight,
}: {
  value: JSONContent | null | undefined;
  onChange?: (doc: JSONContent, text: string) => void;
  onBlur?: (doc: JSONContent, text: string) => void;
  placeholder?: string;
  /** When provided, "@" mentions are enabled. */
  members?: MentionItem[];
  className?: string;
  autoFocus?: boolean;
  editable?: boolean;
  /** Called on ⌘/Ctrl+Enter. */
  onSubmit?: (doc: JSONContent, text: string) => void;
  editorRef?: React.MutableRefObject<Editor | null>;
  minHeight?: number;
}) {
  const membersRef = useRef<MentionItem[]>([]);
  const submitRef = useRef(onSubmit);
  useEffect(() => {
    membersRef.current = members ?? [];
    submitRef.current = onSubmit;
  });
  const mentionsEnabled = !!members;

  const extensions = useMemo(
    () => [
      ...baseExtensions,
      Placeholder.configure({ placeholder }),
      // The getter runs later, inside tiptap's suggestion plugin, never during render.
      // eslint-disable-next-line react-hooks/refs
      ...(mentionsEnabled ? [buildMention(() => membersRef.current)] : [mentionRender]),
    ],
    [placeholder, mentionsEnabled],
  );

  const editor = useEditor({
    extensions,
    content: value ?? undefined,
    editable,
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: { class: cn("tiptap text-[13.5px] leading-relaxed text-ink outline-none", className) },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && submitRef.current) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getJSON(), editor.getText()),
    onBlur: ({ editor }) => onBlur?.(editor.getJSON(), editor.getText()),
  });

  useEffect(() => {
    if (editorRef) editorRef.current = editor;
  }, [editor, editorRef]);

  // Keep the editor in sync when the value changes from outside (e.g. realtime).
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(value ?? { type: "doc", content: [{ type: "paragraph" }] });
    if (current !== next) editor.commands.setContent(value ?? "", { emitUpdate: false });
  }, [value, editor]);

  useEffect(() => {
    if (!editor || !onSubmit) return;
    const dom = editor.view.dom;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        submitRef.current?.(editor.getJSON(), editor.getText());
      }
    };
    dom.addEventListener("keydown", handler);
    return () => dom.removeEventListener("keydown", handler);
  }, [editor, onSubmit]);

  return <EditorContent editor={editor} style={minHeight ? { minHeight } : undefined} />;
}

/** Read-only rendering of stored rich text. */
export function RichContent({ doc, className }: { doc: JSONContent | null | undefined; className?: string }) {
  const html = useMemo(() => {
    if (!doc) return "";
    try {
      return generateHTML(doc, renderExtensions);
    } catch {
      return "";
    }
  }, [doc]);
  if (!html) return null;
  return <div className={cn("tiptap text-[13.5px] leading-relaxed", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
