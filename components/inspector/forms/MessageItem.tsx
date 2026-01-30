"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef } from "react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { TextStyle } from "@tiptap/extension-text-style";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MessageJson } from "@/lib/schema/flow.schema";
import {
  parseContentWithMentions,
  convertToMarkdown,
  looksLikeMarkdown,
} from "@/lib/utils/markdown-utils";
import { buildMentionExtension } from "@/lib/utils/tiptap-mention";
import { useMentionData } from "@/hooks/useMentionData";

interface MessageItemProps {
  message: MessageJson;
  index: number;
  onUpdate: (updates: Partial<MessageJson>) => void;
  onRemove: () => void;
}

export function MessageItem({ message, index, onUpdate, onRemove }: MessageItemProps) {
  const messageRoleId = useId();
  const messageContentId = useId();
  const editorRef = useRef<Editor | null>(null);
  const lastInternalContentRef = useRef<string>(message.content ?? "");

  const { variables, globalVariables, functions, isLoading } = useMentionData();

  const normalizedVariables = useMemo(
    () =>
      variables.map((v) => ({
        id: v.id,
        label: v.name ?? v.id,
        name: v.name ?? v.id,
        description: v.description ?? "",
        isMutable: v.isMutable,
      })),
    [variables]
  );

  const mutableVariables = useMemo(
    () => normalizedVariables.filter((v) => v.isMutable),
    [normalizedVariables]
  );

  // Use refs to ensure getters always get current values
  const normalizedVariablesRef = useRef(normalizedVariables);
  const mutableVariablesRef = useRef(mutableVariables);
  const functionsRef = useRef(functions);
  const globalVariablesRef = useRef(globalVariables);

  // Update refs when values change
  useEffect(() => {
    normalizedVariablesRef.current = normalizedVariables;
    mutableVariablesRef.current = mutableVariables;
    functionsRef.current = functions;
    globalVariablesRef.current = globalVariables;
  }, [normalizedVariables, mutableVariables, functions, globalVariables]);

  const mentionExtensions = useMemo(() => {
    return buildMentionExtension(
      () => {
        const vars = normalizedVariablesRef.current;
        return vars;
      },
      () => mutableVariablesRef.current,
      () => functionsRef.current,
      () => globalVariablesRef.current
    );
  }, [
    normalizedVariables.length,
    mutableVariables.length,
    functions.length,
    globalVariables.length,
  ]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      onCreate: ({ editor }) => {
        editorRef.current = editor;
      },
      editable: true,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
            HTMLAttributes: { class: "font-bold text-gray-900 dark:text-gray-100" },
          },
          bulletList: {
            keepMarks: true,
            keepAttributes: true,
            HTMLAttributes: { class: "list-disc" },
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: true,
            HTMLAttributes: { class: "list-decimal" },
          },
          listItem: {
            HTMLAttributes: { class: "ml-6 relative" },
          },
          code: {
            HTMLAttributes: {
              class: "bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono",
            },
          },
          codeBlock: {
            HTMLAttributes: {
              class: "bg-gray-200 dark:bg-gray-700 p-3 rounded font-mono text-sm my-4",
            },
          },
          bold: { HTMLAttributes: { class: "font-bold" } },
          italic: { HTMLAttributes: { class: "italic" } },
        }),
        ...mentionExtensions,
        TextStyle,
      ],
      content: parseContentWithMentions(
        message.content ?? "",
        normalizedVariables,
        functions,
        globalVariables
      ),
      editorProps: {
        handlePaste: (_view, event) => {
          const text = event.clipboardData?.getData("text/plain") ?? "";
          if (text && looksLikeMarkdown(text)) {
            event.preventDefault();
            const htmlFromMarkdown = parseContentWithMentions(
              text,
              normalizedVariables,
              functions,
              globalVariables
            );
            editorRef.current?.chain().focus().insertContent(htmlFromMarkdown).run();
            return true;
          }
          return false;
        },
        attributes: {
          class:
            "ProseMirror prose prose-sm focus:outline-none min-h-20 text-xs " +
            // Nested list styling
            "[&_ul]:list-disc [&_ol]:list-decimal " +
            "[&_ul_ul]:list-[circle] [&_ul_ul_ul]:list-[square] " +
            "[&_ol_ol]:list-[lower-alpha] [&_ol_ol_ol]:list-[lower-roman] " +
            "[&_li]:ml-0 [&_ul]:pl-6 [&_ol]:pl-6 " +
            "[&_li_p]:mb-0 [&_li]:mb-1",
        },
      },
      onUpdate: ({ editor }) => {
        const rawHTML = editor.getHTML();
        const markdownContent = convertToMarkdown(rawHTML);
        lastInternalContentRef.current = markdownContent;
        onUpdate({ content: markdownContent });
      },
    },
    // Force recreation when extensions change (when variables load)
    [mentionExtensions]
  );

  // Update editor content when message.content changes externally
  useEffect(() => {
    if (!editor || isLoading) return;
    
    // Skip update if this change came from our own internal update
    const incomingContent = message.content ?? "";
    if (incomingContent === lastInternalContentRef.current) {
      return;
    }
    
    // Skip update if editor is focused (user is actively typing)
    if (editor.isFocused) {
      return;
    }
    
    const currentContent = editor.getHTML();
    const expectedContent = parseContentWithMentions(
      incomingContent,
      normalizedVariables,
      functions,
      globalVariables
    );
    
    // Only update if content actually differs
    if (currentContent !== expectedContent) {
      // Preserve cursor position when updating
      const { from, to } = editor.state.selection;
      editor.commands.setContent(expectedContent);
      // Try to restore cursor position if still valid
      try {
        const docSize = editor.state.doc.content.size;
        const safeFrom = Math.min(from, docSize);
        const safeTo = Math.min(to, docSize);
        editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
      } catch {
        // If selection restoration fails, just focus at the end
        editor.commands.focus("end");
      }
    }
  }, [message.content, editor, normalizedVariables, functions, globalVariables, isLoading]);

  if (!editor) return null;

  return (
    <div className="space-y-2 rounded border p-3">
      <div className="flex items-center gap-2">
        <div className="space-y-2">
          <label htmlFor={messageRoleId} className="sr-only">
            Role
          </label>
          <Select
            value={message.role}
            onValueChange={(v: "system" | "user" | "assistant") => onUpdate({ role: v })}
          >
            <SelectTrigger id={messageRoleId} className="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="assistant">Assistant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8" onClick={onRemove}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove message</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="space-y-2">
        <label htmlFor={messageContentId} className="sr-only">
          Message content
        </label>
        <div
          id={messageContentId}
          className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 min-h-20 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
        >
          <EditorContent editor={editor} className="prose prose-sm max-w-none dark:prose-invert" />
        </div>
        <div className="text-[10px] opacity-60">
          Use @ for variables, $ for mutable variables, # for global variables, ! for functions
        </div>
      </div>
    </div>
  );
}
