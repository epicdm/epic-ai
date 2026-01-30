"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sparkles as SparklesIcon,
  X as XMarkIcon,
  Minus as MinusIcon,
  Send as PaperAirplaneIcon,
  MessageSquare as ChatBubbleLeftRightIcon,
  RefreshCw as ArrowPathIcon,
} from "lucide-react";
import { useAssistant, AssistantMessage } from "./assistant-context";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

export function AIAssistant() {
  const {
    state,
    toggle,
    close,
    minimize,
    maximize,
    sendMessage,
    clearMessages,
  } = useAssistant();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  // Focus input when opened
  useEffect(() => {
    if (state.isOpen && !state.isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state.isOpen, state.isMinimized]);

  // Prevent body scroll when open on mobile
  useEffect(() => {
    if (isMobile && state.isOpen && !state.isMinimized) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, state.isOpen, state.isMinimized]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || state.isLoading) return;
    setInput("");
    trackEvent("ai_assistant_message_sent", { message_length: trimmed.length });
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  // Floating button when closed
  if (!state.isOpen) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className={cn(
                "fixed z-50 rounded-full shadow-lg",
                isMobile
                  ? "bottom-4 right-4 w-12 h-12"
                  : "bottom-6 right-6 w-14 h-14"
              )}
              onClick={toggle}
            >
              <SparklesIcon className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">AI Assistant</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Minimized state
  if (state.isMinimized) {
    return (
      <div
        className={cn(
          "fixed z-50 cursor-pointer",
          isMobile ? "bottom-4 right-4 left-4" : "bottom-6 right-6"
        )}
        onClick={maximize}
      >
        <Card className={cn("shadow-lg", isMobile ? "w-full" : "w-64")}>
          <CardContent className="py-3 px-4 flex flex-row items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">AI Assistant</p>
              <p className="text-xs text-muted-foreground">Click to expand</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
            >
              <XMarkIcon className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Full chat panel
  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={minimize}
        />
      )}

      <div
        className={cn(
          "fixed z-50 flex flex-col",
          isMobile
            ? "inset-0 sm:inset-auto"
            : "bottom-6 right-6"
        )}
      >
        <Card
          className={cn(
            "shadow-2xl flex flex-col",
            isMobile
              ? "w-full h-full rounded-none sm:rounded-xl"
              : "w-96 h-[32rem]"
          )}
        >
          {/* Header */}
          <CardHeader className="flex flex-row items-center gap-3 border-b border-border py-3 px-4 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">AI Assistant</h3>
              <p className="text-xs text-muted-foreground">Powered by GPT-4o</p>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={clearMessages}
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear chat</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {!isMobile && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost" onClick={minimize}>
                        <MinusIcon className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Minimize</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={close}>
                      <XMarkIcon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Close</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {state.messages.length === 0 ? (
              <EmptyState
                suggestions={state.suggestions}
                welcomeMessage={state.welcomeMessage}
                tips={state.tips}
                flywheelTip={state.flywheelTip}
                onSuggestionClick={handleSuggestionClick}
                isMobile={isMobile}
              />
            ) : (
              <>
                {state.messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {state.isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Input */}
          <CardFooter className="border-t border-border p-3 flex-shrink-0">
            <div className="flex items-center gap-2 w-full">
              <Input
                ref={inputRef}
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={state.isLoading}
                size={isMobile ? "md" : "sm"}
                className="flex-1"
                startContent={
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-muted-foreground" />
                }
              />
              <Button
                size={isMobile ? "md" : "sm"}
                onClick={handleSend}
                disabled={!input.trim() || state.isLoading}
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </Button>
            </div>
            {/* Safe area for iOS */}
            {isMobile && <div className="h-safe-area-inset-bottom" />}
          </CardFooter>
        </Card>
      </div>
    </>
  );
}

function EmptyState({
  suggestions,
  welcomeMessage,
  tips,
  flywheelTip,
  onSuggestionClick,
  isMobile,
}: {
  suggestions: string[];
  welcomeMessage?: string;
  tips?: string[];
  flywheelTip?: string | null;
  onSuggestionClick: (s: string) => void;
  isMobile: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className={cn(
        "rounded-full bg-primary/10 flex items-center justify-center mb-4",
        isMobile ? "w-20 h-20" : "w-16 h-16"
      )}>
        <SparklesIcon className={cn("text-primary", isMobile ? "w-10 h-10" : "w-8 h-8")} />
      </div>
      <h3 className={cn("font-semibold mb-2", isMobile ? "text-xl" : "text-lg")}>
        Hi! I'm your AI Assistant
      </h3>
      <p className={cn("text-muted-foreground mb-4", isMobile ? "text-base" : "text-sm")}>
        {welcomeMessage || "I can help you with creating content, setting up voice agents, and understanding your analytics."}
      </p>

      {/* Flywheel tip - shows next action to complete setup */}
      {flywheelTip && (
        <div className={cn(
          "mb-4 w-full max-w-sm rounded-xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 p-3",
          isMobile ? "text-sm" : "text-xs"
        )}>
          <p className="text-warning-700 dark:text-warning-400">{flywheelTip}</p>
        </div>
      )}

      <div className="space-y-2 w-full max-w-sm">
        <p className="text-xs text-muted-foreground uppercase font-medium">
          Try asking:
        </p>
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            className={cn(
              "w-full text-left rounded-xl bg-muted hover:bg-default-200 active:scale-[0.98] transition-all",
              isMobile ? "text-base p-4" : "text-sm p-3"
            )}
            onClick={() => onSuggestionClick(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Tips section */}
      {tips && tips.length > 0 && (
        <div className={cn("mt-4 w-full max-w-sm text-left", isMobile ? "text-xs" : "text-[10px]")}>
          <p className="text-muted-foreground uppercase font-medium mb-1">💡 Tips for this page:</p>
          <ul className="text-muted-foreground space-y-0.5">
            {tips.slice(0, 2).map((tip, i) => (
              <li key={i}>• {tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <Avatar
        size="sm"
        showFallback
        name={isUser ? "You" : "AI"}
        icon={!isUser ? <SparklesIcon className="w-4 h-4" /> : undefined}
        color={isUser ? "default" : "primary"}
        className="flex-shrink-0"
      />
      <div
        className={cn(
          "rounded-2xl px-4 py-2 max-w-[85%] sm:max-w-[80%]",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted rounded-tl-sm"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.metadata?.suggestions && (
          <div className="mt-3 flex flex-wrap gap-1">
            {message.metadata.suggestions.map((s, i) => (
              <Badge key={i}  variant="secondary" >
                {s}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
