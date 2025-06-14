import React, { useState, useRef, useEffect } from "react";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  onCancel?: () => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, isLoading, onCancel }) => {
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle textarea auto-resize with CSS and a ResizeObserver
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Create a ResizeObserver to handle content changes
    const resizeObserver = new ResizeObserver(() => {
      // Let CSS handle the height with scrollHeight
      textarea.classList.add("auto-resize-active");
    });

    // Start observing
    resizeObserver.observe(textarea);

    // Clean up
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

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
    <div className="meta-mt-2">
      <div className="meta-relative meta-flex meta-items-center">
        <div className={`meta-w-full ${isLoading ? "meta-rotating-border-wrapper" : ""}`}>
          <textarea
            ref={textareaRef}
            className="meta-w-full meta-p-2 meta-pr-10 meta-rounded-md meta-border meta-border-gray-300 dark:meta-border-gray-600 dark:meta-bg-gray-800 meta-text-gray-900 dark:meta-text-gray-100 meta-resize-none meta-focus:ring-2 meta-focus:ring-blue-500 meta-focus:border-blue-500 meta-outline-none meta-transition meta-min-h-[40px] meta-overflow-hidden vibesidian-line-height-normal vibesidian-auto-resize"
            placeholder="What can we do for you?"
            rows={1}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
        </div>
        <button
          className="meta-absolute meta-right-2 meta-p-1 meta-bg-transparent meta-rounded-full disabled:meta-opacity-50 disabled:meta-cursor-not-allowed"
          onClick={isLoading && onCancel ? onCancel : handleSubmit}
          disabled={!isLoading && !inputValue.trim()}
          aria-label={isLoading ? "Cancel" : "Send message"}
        >
          {isLoading ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="meta-w-5 meta-h-5 meta-text-blue-600 dark:meta-text-blue-400 meta-animate-pulse"
            >
              <rect x="6" y="6" width="12" height="12" fill="currentColor" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="meta-w-5 meta-h-5 meta-text-blue-600 hover:meta-text-blue-800 dark:meta-text-blue-400 dark:hover:meta-text-blue-300"
            >
              <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
