"use client";

import { useEffect, useRef, useState } from "react";
import {
  Code,
  Type,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Palette,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxWords?: number;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter a summary to describe your item",
  maxWords = 60,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Count words in the editor
  const countWords = (text: string) => {
    const plainText = text.replace(/<[^>]*>/g, "").trim();
    if (!plainText) return 0;
    return plainText.split(/\s+/).filter((word) => word.length > 0).length;
  };

  // Initialize editor with value
  useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      setWordCount(countWords(value));
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;

    const content = editorRef.current.innerHTML;
    const words = countWords(content);

    setWordCount(words);
    onChange(content);

    // Show warning if exceeded (but still save the content)
    if (words > maxWords) {
      // Visual feedback: counter will show red in the UI
      console.warn(`Word limit exceeded: ${words}/${maxWords}`);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertCodeBlock = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const code = document.createElement("code");
    code.style.backgroundColor = "#f3f4f6";
    code.style.padding = "2px 6px";
    code.style.borderRadius = "4px";
    code.style.fontFamily = "monospace";

    try {
      range.surroundContents(code);
    } catch (e) {
      // If surroundContents fails, insert at cursor
      code.textContent = "code";
      range.deleteContents();
      range.insertNode(code);
    }

    handleInput();
  };

  const formatBlock = (tag: string) => {
    execCommand("formatBlock", tag);
  };

  const applyColor = (color: string) => {
    execCommand("foreColor", color);
    setShowColorPicker(false);
  };

  const colors = [
    "#000000", "#4B5563", "#EF4444", "#F59E0B",
    "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"
  ];

  return (
    <div className="rich-text-editor border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-white border-b">
        {/* Code Block */}
        <button
          type="button"
          onClick={insertCodeBlock}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Code block"
        >
          <Code className="w-4 h-4" />
        </button>

        {/* Paragraph/Headers */}
        <div className="relative">
          <select
            onChange={(e) => formatBlock(e.target.value)}
            className="p-2 pr-6 hover:bg-gray-100 rounded transition-colors text-sm border-0 bg-transparent cursor-pointer"
            title="Format"
            defaultValue="p"
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Bold */}
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="p-2 hover:bg-gray-100 rounded transition-colors font-bold"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="p-2 hover:bg-gray-100 rounded transition-colors italic"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="p-2 hover:bg-gray-100 rounded transition-colors underline"
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          onClick={() => execCommand("strikeThrough")}
          className="p-2 hover:bg-gray-100 rounded transition-colors line-through"
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Bullet List */}
        <button
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Bullet list"
        >
          <List className="w-4 h-4" />
        </button>

        {/* Numbered List */}
        <button
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Numbered list"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Text Color */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Text color"
          >
            <div className="relative">
              <Palette className="w-4 h-4" />
            </div>
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border rounded-lg shadow-lg z-10 grid grid-cols-4 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => applyColor(color)}
                  className="w-6 h-6 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
          // Trigger handleInput to update word count and form value
          handleInput();
        }}
        className="min-h-[200px] p-4 bg-white focus:outline-none prose prose-sm max-w-none"
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {/* Word Counter */}
      <div className={`px-4 py-2 text-sm bg-gray-50 border-t ${
        wordCount > maxWords ? 'text-red-600 font-semibold' : 'text-gray-500'
      }`}>
        words: {wordCount} / {maxWords}
        {wordCount > maxWords && (
          <span className="ml-2 text-xs">⚠ Exceeded word limit</span>
        )}
      </div>

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }

        .prose code {
          background-color: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.875em;
        }

        .prose h1 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 0.5em 0;
        }

        .prose h2 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.5em 0;
        }

        .prose h3 {
          font-size: 1.1em;
          font-weight: 600;
          margin: 0.5em 0;
        }

        .prose ul,
        .prose ol {
          margin: 0.5em 0;
          padding-left: 1.5em;
        }

        .prose li {
          margin: 0.25em 0;
        }
      `}</style>
    </div>
  );
}
