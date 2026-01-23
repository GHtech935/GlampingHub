"use client";

import dynamic from "next/dynamic";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import "react-quill-new/dist/quill.snow.css";

// Dynamic import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

interface SimpleRichTextEditorProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

// Simple toolbar with only bold, italic, underline
const modules = {
  toolbar: [["bold", "italic", "underline"]],
};

const formats = ["bold", "italic", "underline"];

export function SimpleRichTextEditor({
  id,
  label,
  value,
  onChange,
  placeholder,
  className,
  minHeight = 100,
}: SimpleRichTextEditorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className="whitespace-nowrap">
          {label}
        </Label>
      )}

      <div className="simple-quill-wrapper">
        <ReactQuill
          theme="snow"
          value={value || ""}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          className="bg-white"
        />
      </div>

      <style jsx global>{`
        .simple-quill-wrapper .ql-container {
          min-height: ${minHeight}px;
          font-family: inherit;
          font-size: 14px;
        }

        .simple-quill-wrapper .ql-editor {
          min-height: ${minHeight}px;
          padding: 12px;
        }

        .simple-quill-wrapper .ql-toolbar {
          border-top-left-radius: 0.375rem;
          border-top-right-radius: 0.375rem;
          background: hsl(var(--muted) / 0.3);
          padding: 6px 8px;
        }

        .simple-quill-wrapper .ql-container {
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
        }

        .simple-quill-wrapper .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
          font-size: 14px;
        }

        .simple-quill-wrapper .ql-toolbar .ql-formats {
          margin-right: 8px;
        }

        .simple-quill-wrapper .ql-toolbar button {
          width: 28px;
          height: 28px;
        }
      `}</style>
    </div>
  );
}
