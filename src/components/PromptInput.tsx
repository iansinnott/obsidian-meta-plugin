import React, { useState } from "react";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, isLoading }) => {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = () => {
    const trimmedValue = inputValue.trim();

    if (!trimmedValue) return;

    onSubmit(trimmedValue);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="meta-border-b meta-border-gray-200 dark:meta-border-gray-700">
      <textarea
        className="meta-w-full meta-p-3 meta-rounded-md meta-border meta-border-gray-300 dark:meta-border-gray-600 dark:meta-bg-gray-800 meta-text-gray-900 dark:meta-text-gray-100 meta-resize-none meta-focus:ring-2 meta-focus:ring-blue-500 meta-focus:border-blue-500 meta-outline-none meta-transition"
        placeholder="Ask a question about your notes..."
        rows={3}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      />
      <div className="meta-flex meta-justify-end meta-mt-2">
        <button
          className="meta-py-2 meta-px-4 meta-bg-blue-600 hover:meta-bg-blue-700 meta-text-white meta-font-medium meta-rounded-md meta-transition disabled:meta-opacity-50 disabled:meta-cursor-not-allowed"
          onClick={handleSubmit}
          disabled={isLoading || !inputValue.trim()}
        >
          Ask
        </button>
      </div>
    </div>
  );
};
