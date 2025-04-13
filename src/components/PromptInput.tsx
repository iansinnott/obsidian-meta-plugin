import React, { useState, useRef, useEffect } from "react";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, isLoading }) => {
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Function to auto-resize the textarea based on content
  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto";
      // Set the height to match content (scrollHeight)
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  // Apply auto-resize when input value changes
  useEffect(() => {
    autoResize();
  }, [inputValue]);

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
    <div className="meta-mt-6">
      <div className="meta-relative meta-flex meta-items-center">
        <textarea
          ref={textareaRef}
          className="meta-w-full meta-p-2 meta-pr-10 meta-rounded-md meta-border meta-border-gray-300 dark:meta-border-gray-600 dark:meta-bg-gray-800 meta-text-gray-900 dark:meta-text-gray-100 meta-resize-none meta-focus:ring-2 meta-focus:ring-blue-500 meta-focus:border-blue-500 meta-outline-none meta-transition meta-min-h-[40px] meta-overflow-hidden"
          placeholder="What can we do for you?"
          rows={1}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          style={{ lineHeight: "normal" }}
        />
        <button
          className="meta-absolute meta-right-2 meta-p-1 meta-text-blue-600 hover:meta-text-blue-800 dark:meta-text-blue-400 dark:hover:meta-text-blue-300 meta-bg-transparent meta-rounded-full disabled:meta-opacity-50 disabled:meta-cursor-not-allowed"
          onClick={handleSubmit}
          disabled={isLoading || !inputValue.trim()}
          aria-label="Send message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="meta-w-5 meta-h-5"
          >
            <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
