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
    <div className="meta-sidebar-input">
      <textarea
        className="meta-sidebar-prompt"
        placeholder="Ask a question about your notes..."
        rows={3}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      />
      <div className="meta-sidebar-button-container">
        <button
          className="mod-cta"
          onClick={handleSubmit}
          disabled={isLoading || !inputValue.trim()}
        >
          Ask
        </button>
      </div>
    </div>
  );
};
