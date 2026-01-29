"use client";

/**
 * AI Assist Button - Phase 3: Polish
 *
 * Reusable button component for triggering AI suggestions
 * in manual wizard steps.
 */

import { Button, Tooltip } from "@heroui/react";
import { Sparkles } from "lucide-react";

export interface AIAssistButtonProps {
  onSuggest: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  tooltip?: string;
  size?: "sm" | "md" | "lg";
  variant?: "flat" | "solid" | "bordered" | "light" | "ghost";
  className?: string;
}

export function AIAssistButton({
  onSuggest,
  loading = false,
  disabled = false,
  label = "AI Suggest",
  tooltip,
  size = "sm",
  variant = "flat",
  className = "",
}: AIAssistButtonProps) {
  const button = (
    <Button
      size={size}
      variant={variant}
      color="secondary"
      startContent={!loading && <Sparkles className="w-3.5 h-3.5" />}
      isLoading={loading}
      isDisabled={disabled}
      onPress={onSuggest}
      className={`font-medium ${className}`}
    >
      {label}
    </Button>
  );

  if (tooltip) {
    return (
      <Tooltip content={tooltip} placement="top">
        {button}
      </Tooltip>
    );
  }

  return button;
}

/**
 * AI Assist inline link variant
 */
export function AIAssistLink({
  onSuggest,
  loading = false,
  label = "Get AI suggestions",
  className = "",
}: {
  onSuggest: () => void | Promise<void>;
  loading?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSuggest}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 text-sm text-secondary-600 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300 transition-colors disabled:opacity-50 ${className}`}
    >
      <Sparkles className="w-3.5 h-3.5" />
      {loading ? "Thinking..." : label}
    </button>
  );
}

/**
 * AI Assist card variant for more prominent display
 */
export function AIAssistCard({
  onSuggest,
  loading = false,
  title = "Need help?",
  description = "Let AI suggest options based on your brand",
  buttonLabel = "Get Suggestions",
}: {
  onSuggest: () => void | Promise<void>;
  loading?: boolean;
  title?: string;
  description?: string;
  buttonLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-secondary-50 dark:bg-secondary-950/30 border border-secondary-200 dark:border-secondary-800 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-secondary-100 dark:bg-secondary-900/50 rounded-full">
          <Sparkles className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-foreground-500">{description}</p>
        </div>
      </div>
      <Button
        size="sm"
        color="secondary"
        variant="solid"
        isLoading={loading}
        onPress={onSuggest}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
