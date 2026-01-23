"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher, Locale } from "./LanguageSwitcher";
import { cn } from "@/lib/utils";
import "react-quill-new/dist/quill.snow.css";

// Dynamic import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

export interface MultilingualValue {
  vi: string;
  en: string;
}

interface MultilingualRichTextEditorProps {
  id?: string;
  label: string;
  value: MultilingualValue;
  onChange: (value: MultilingualValue) => void;
  placeholder?: MultilingualValue;
  required?: boolean;
  requiredLocales?: Locale[];
  className?: string;
}

// Quill toolbar configuration
const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    ["link", "image"],
    ["clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "color",
  "background",
  "align",
  "link",
  "image",
];

export function MultilingualRichTextEditor({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  requiredLocales = ["vi", "en"],
  className,
}: MultilingualRichTextEditorProps) {
  const [activeLocale, setActiveLocale] = useState<Locale>("vi");

  const handleChange = (content: string, locale: Locale) => {
    onChange({
      ...value,
      [locale]: content,
    });
  };

  const getFilledLocales = (): Locale[] => {
    const filled: Locale[] = [];
    if (value.vi && value.vi.trim().length > 0) filled.push("vi");
    if (value.en && value.en.trim().length > 0) filled.push("en");
    return filled;
  };

  const currentValue = activeLocale === "vi" ? value.vi : value.en;
  const currentPlaceholder = placeholder
    ? activeLocale === "vi"
      ? placeholder.vi
      : placeholder.en
    : "";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
        <Label htmlFor={id} className="whitespace-nowrap">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <LanguageSwitcher
          value={activeLocale}
          onChange={setActiveLocale}
          requiredLocales={requiredLocales}
          filledLocales={getFilledLocales()}
          className="w-auto flex-shrink-0"
        />
      </div>

      <div className="quill-wrapper">
        <ReactQuill
          key={activeLocale}
          theme="snow"
          value={currentValue || ""}
          onChange={(content) => handleChange(content, activeLocale)}
          modules={modules}
          formats={formats}
          placeholder={currentPlaceholder}
          className="bg-white"
        />
      </div>

      <style jsx global>{`
        .quill-wrapper .ql-container {
          min-height: 200px;
          font-family: inherit;
        }

        .quill-wrapper .ql-editor {
          min-height: 200px;
        }

        .quill-wrapper .ql-toolbar {
          border-top-left-radius: 0.375rem;
          border-top-right-radius: 0.375rem;
          background: hsl(var(--muted) / 0.3);
        }

        .quill-wrapper .ql-container {
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
        }

        .quill-wrapper .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
      `}</style>
    </div>
  );
}
