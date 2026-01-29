"use client";

import { createContext, useContext, useReducer, useCallback, ReactNode, useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { getContextualHints, getFlywheelTip, type ContextualHint } from "./contextual-hints";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    action?: string;
    actionData?: Record<string, unknown>;
    suggestions?: string[];
  };
}

export interface AssistantState {
  isOpen: boolean;
  isMinimized: boolean;
  isLoading: boolean;
  messages: AssistantMessage[];
  context: {
    currentPage: string;
    brandId?: string;
    agentId?: string;
    campaignId?: string;
  };
  suggestions: string[];
  welcomeMessage: string;
  tips: string[];
  flywheelTip: string | null;
  error: string | null;
}

type AssistantAction =
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "TOGGLE" }
  | { type: "MINIMIZE" }
  | { type: "MAXIMIZE" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "ADD_MESSAGE"; payload: AssistantMessage }
  | { type: "SET_MESSAGES"; payload: AssistantMessage[] }
  | { type: "CLEAR_MESSAGES" }
  | { type: "SET_CONTEXT"; payload: Partial<AssistantState["context"]> }
  | { type: "SET_SUGGESTIONS"; payload: string[] }
  | { type: "SET_CONTEXTUAL_HINTS"; payload: { hints: ContextualHint; flywheelTip: string | null } }
  | { type: "SET_ERROR"; payload: string | null };

// Get default contextual hints for dashboard
const defaultHints = getContextualHints("/dashboard");

const initialState: AssistantState = {
  isOpen: false,
  isMinimized: false,
  isLoading: false,
  messages: [],
  context: {
    currentPage: "/dashboard",
  },
  suggestions: defaultHints.suggestions,
  welcomeMessage: defaultHints.welcomeMessage || "Hi! I'm your AI Assistant. How can I help you today?",
  tips: defaultHints.tips || [],
  flywheelTip: null,
  error: null,
};

function assistantReducer(
  state: AssistantState,
  action: AssistantAction
): AssistantState {
  switch (action.type) {
    case "OPEN":
      return { ...state, isOpen: true, isMinimized: false };
    case "CLOSE":
      return { ...state, isOpen: false };
    case "TOGGLE":
      return { ...state, isOpen: !state.isOpen, isMinimized: false };
    case "MINIMIZE":
      return { ...state, isMinimized: true };
    case "MAXIMIZE":
      return { ...state, isMinimized: false };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };
    case "SET_MESSAGES":
      return { ...state, messages: action.payload };
    case "CLEAR_MESSAGES":
      return { ...state, messages: [] };
    case "SET_CONTEXT":
      return { ...state, context: { ...state.context, ...action.payload } };
    case "SET_SUGGESTIONS":
      return { ...state, suggestions: action.payload };
    case "SET_CONTEXTUAL_HINTS":
      return {
        ...state,
        suggestions: action.payload.hints.suggestions,
        welcomeMessage: action.payload.hints.welcomeMessage || state.welcomeMessage,
        tips: action.payload.hints.tips || [],
        flywheelTip: action.payload.flywheelTip,
      };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

interface AssistantContextType {
  state: AssistantState;
  open: () => void;
  close: () => void;
  toggle: () => void;
  minimize: () => void;
  maximize: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  setContext: (context: Partial<AssistantState["context"]>) => void;
}

const AssistantContext = createContext<AssistantContextType | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(assistantReducer, initialState);

  const open = useCallback(() => {
    dispatch({ type: "OPEN" });
    trackEvent("ai_assistant_opened", {});
  }, []);
  const close = useCallback(() => dispatch({ type: "CLOSE" }), []);
  const toggle = useCallback(() => {
    dispatch({ type: "TOGGLE" });
    // Track opening (toggle from closed to open)
    if (!state.isOpen) {
      trackEvent("ai_assistant_opened", {});
    }
  }, [state.isOpen]);
  const minimize = useCallback(() => dispatch({ type: "MINIMIZE" }), []);
  const maximize = useCallback(() => dispatch({ type: "MAXIMIZE" }), []);
  const clearMessages = useCallback(() => dispatch({ type: "CLEAR_MESSAGES" }), []);

  const setContext = useCallback(
    (context: Partial<AssistantState["context"]>) => {
      dispatch({ type: "SET_CONTEXT", payload: context });

      // Update contextual hints when page changes
      if (context.currentPage) {
        const hints = getContextualHints(context.currentPage);

        // Fetch flywheel status for contextual tip
        fetch("/api/dashboard")
          .then((res) => res.ok ? res.json() : null)
          .then((data) => {
            const flywheelTip = data ? getFlywheelTip({
              brandSetup: data.brandBrain?.isSetup ?? false,
              socialConnected: (data.accounts?.connected ?? 0) > 0,
              contentCreated: (data.content?.total ?? 0) > 0,
              autoPublishing: data.publishing?.autoEnabled ?? false,
            }) : null;

            dispatch({
              type: "SET_CONTEXTUAL_HINTS",
              payload: { hints, flywheelTip },
            });
          })
          .catch(() => {
            // Still set hints even if flywheel fetch fails
            dispatch({
              type: "SET_CONTEXTUAL_HINTS",
              payload: { hints, flywheelTip: null },
            });
          });
      }
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string) => {
      // Add user message
      const userMessage: AssistantMessage = {
        id: `msg_${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };
      dispatch({ type: "ADD_MESSAGE", payload: userMessage });
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        const response = await fetch("/api/ai-assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            context: state.context,
            history: state.messages.slice(-10), // Last 10 messages for context
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        const data = await response.json();

        const assistantMessage: AssistantMessage = {
          id: `msg_${Date.now()}_assistant`,
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
          metadata: data.metadata,
        };

        dispatch({ type: "ADD_MESSAGE", payload: assistantMessage });

        if (data.suggestions) {
          dispatch({ type: "SET_SUGGESTIONS", payload: data.suggestions });
        }
      } catch (error) {
        dispatch({
          type: "SET_ERROR",
          payload: error instanceof Error ? error.message : "Something went wrong",
        });

        // Add error message from assistant
        dispatch({
          type: "ADD_MESSAGE",
          payload: {
            id: `msg_${Date.now()}_error`,
            role: "assistant",
            content: "I'm sorry, I encountered an error. Please try again.",
            timestamp: new Date(),
          },
        });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [state.context, state.messages]
  );

  return (
    <AssistantContext.Provider
      value={{
        state,
        open,
        close,
        toggle,
        minimize,
        maximize,
        sendMessage,
        clearMessages,
        setContext,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant must be used within an AssistantProvider");
  }
  return context;
}
