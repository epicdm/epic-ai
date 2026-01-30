"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { Mic, MicOff, Phone, PhoneOff, Volume2, Send, AlertCircle, DollarSign, Clock, Info, PhoneCall, Monitor } from "lucide-react";
import Link from "next/link";
import { PRICING } from "@/components/ui/cost-estimator";
import { trackEvent } from "@/lib/analytics";
import { OutboundTestPanel } from "./outbound-test-panel";

interface VoiceAgent {
  id: string;
  name: string;
  description?: string;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface ConversationStats {
  messageCount: number;
  userMessages: number;
  assistantMessages: number;
  duration: number;
}

export function TestConsole() {
  // State
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Call state
  const [isInCall, setIsInCall] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Conversation state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<ConversationStats | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedAgentIdRef = useRef<string>("");
  const conversationIdRef = useRef<string | null>(null);

  // Fetch voice agents on mount
  useEffect(() => {
    fetchAgents();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Keep refs in sync with state (to avoid stale closures)
  useEffect(() => {
    selectedAgentIdRef.current = selectedAgentId;
  }, [selectedAgentId]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/voice/agents");
      if (!response.ok) throw new Error("Failed to fetch agents");
      const data = await response.json();
      setAgents(data.agents || []);
      if (data.agents?.length > 0) {
        setSelectedAgentId(data.agents[0].id);
      }
    } catch (err) {
      setError("Failed to load voice agents");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const startCall = useCallback(async () => {
    if (!selectedAgentId) {
      setError("Please select a voice agent");
      return;
    }

    try {
      setIsInCall(true);
      setMessages([]);
      setConversationId(null);
      setError(null);

      // Track call started
      trackEvent("voice_call_started", { agent_id: selectedAgentId, type: "test" });

      // Get greeting from agent
      const response = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgentId,
          message: "[CALL_STARTED]",
        }),
      });

      if (!response.ok) throw new Error("Failed to start call");

      const data = await response.json();
      setConversationId(data.conversationId);

      // Add greeting message
      addMessage("assistant", data.response);

      // Speak the greeting
      await speakText(data.response);
    } catch (err) {
      setError("Failed to start call");
      setIsInCall(false);
      console.error(err);
    }
  }, [selectedAgentId]);

  const endCall = useCallback(async () => {
    // Stop any ongoing recording
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    // Stop audio playback
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Get final summary if we have a conversation
    if (conversationId) {
      try {
        const response = await fetch(`/api/voice/chat?conversationId=${conversationId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          const data = await response.json();
          addMessage("system", `Call ended. ${data.summary || ""}`);
          setStats(data.stats);

          // Track call ended analytics
          if (data.stats && selectedAgentId) {
            const durationSeconds = data.stats.duration || 0;
            trackEvent("voice_call_ended", {
              agent_id: selectedAgentId,
              duration_seconds: durationSeconds,
              estimated_cost: (durationSeconds / 60) * PRICING.voice.perMinute,
            });
          }
        }
      } catch (err) {
        console.error("Error ending call:", err);
      }
    }

    setIsInCall(false);
    setIsRecording(false);
    setIsSpeaking(false);
    setConversationId(null);
  }, [conversationId, isRecording, selectedAgentId]);;

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Process the recorded audio
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Microphone access denied. Please allow microphone access.");
      console.error(err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Convert blob to base64 (browser-compatible)
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64Audio = btoa(binary);

      // Transcribe audio
      const transcribeResponse = await fetch("/api/voice/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64Audio,
          filename: "recording.webm",
        }),
      });

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Transcription failed");
      }

      const transcription = await transcribeResponse.json();
      console.log("Transcription received:", transcription);

      const userText = transcription.text?.trim();

      if (!userText) {
        setError("Could not understand audio. Please try again.");
        setIsProcessing(false);
        return;
      }

      console.log("User said:", userText);

      // Add user message
      addMessage("user", userText);

      // Send to AI (use refs to avoid stale closure)
      const currentAgentId = selectedAgentIdRef.current;
      const currentConversationId = conversationIdRef.current;

      console.log("Sending to AI - AgentId:", currentAgentId, "ConversationId:", currentConversationId);

      if (!currentAgentId) {
        throw new Error("No agent selected");
      }

      const chatResponse = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: currentAgentId,
          message: userText,
          conversationId: currentConversationId,
        }),
      });

      if (!chatResponse.ok) {
        const errorData = await chatResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Chat failed");
      }

      const chatData = await chatResponse.json();

      console.log("Chat response received:", chatData);

      // Update conversation ID if new
      if (!conversationId) {
        setConversationId(chatData.conversationId);
      }

      // Add assistant message
      if (chatData.response) {
        addMessage("assistant", chatData.response);
      } else {
        console.error("No response in chatData:", chatData);
        throw new Error("No response from AI");
      }

      // Update stats
      if (chatData.stats) {
        setStats(chatData.stats);
      }

      // Handle transfer
      if (chatData.shouldTransfer) {
        addMessage("system", "Transferring call to human agent...");
        await endCall();
        return;
      }

      // Speak the response
      await speakText(chatData.response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error processing audio";
      setError(errorMessage);
      console.error("Audio processing error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = async (text: string) => {
    setIsSpeaking(true);

    try {
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: "nova",
          returnBase64: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "TTS failed");
      }

      const data = await response.json();

      // Create audio element and play
      const audio = new Audio(`data:${data.contentType};base64,${data.audio}`);
      audioRef.current = audio;

      audio.onended = () => setIsSpeaking(false);
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setIsSpeaking(false);
        setError("Failed to play audio response");
      };

      await audio.play();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error speaking";
      console.error("TTS error:", err);
      setError(errorMessage);
      setIsSpeaking(false);
    }
  };

  const addMessage = (role: "user" | "assistant" | "system", content: string) => {
    setMessages(prev => [...prev, {
      role,
      content,
      timestamp: new Date(),
    }]);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Console"
        description="Test your voice agents in the browser or make outbound test calls."
      />

      {/* Mode Tabs */}
      <Tabs
        defaultValue="browser"
      >
        <TabsList>
          <TabsTrigger value="browser">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              <span>Browser Test</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="outbound">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4" />
              <span>Outbound Call</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browser">
          <div className="space-y-6 pt-4">
            {/* Cost Information Banner */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-200 dark:bg-amber-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  Test calls cost ${PRICING.voice.perMinute.toFixed(2)}/minute
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Includes speech-to-text, AI processing, and text-to-speech
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 cursor-help">
                      <span className="flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        View breakdown
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="p-2 space-y-1 text-sm">
                      <p className="font-medium">Cost Breakdown</p>
                      <p>STT: ${PRICING.voice.breakdown.stt.toFixed(2)}/min</p>
                      <p>LLM: ${PRICING.voice.breakdown.llm.toFixed(2)}/min</p>
                      <p>TTS: ${PRICING.voice.breakdown.tts.toFixed(2)}/min</p>
                      <p>Telephony: ${PRICING.voice.breakdown.telephony.toFixed(2)}/min</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300"
              >
                <Link href="/dashboard/settings/usage">
                  View Usage
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex flex-row items-center gap-3 py-3 px-4">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-destructive text-sm">{error}</span>
            <Button size="sm" variant="ghost" onClick={() => setError(null)} className="ml-auto">
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <Card className="lg:col-span-1">
          <CardContent className="space-y-6 p-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Select Agent
              </h3>
              <Label className="mb-2 block">Voice Agent</Label>
              <Select
                value={selectedAgentId}
                onValueChange={(value) => setSelectedAgentId(value)}
                disabled={isInCall}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAgent?.description && (
                <p className="text-sm text-muted-foreground mt-2">{selectedAgent.description}</p>
              )}
            </div>

            {/* Call Controls */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Call Controls
              </h3>

              {!isInCall ? (
                <Button
                  variant="default"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                  onClick={startCall}
                  disabled={!selectedAgentId || agents.length === 0}
                >
                  Start Test Call
                </Button>
              ) : (
                <div className="space-y-3">
                  {/* Recording Button */}
                  <Button
                    variant={isRecording ? "destructive" : "default"}
                    size="lg"
                    className="w-full"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing || isSpeaking}
                  >
                    {isRecording ? "Stop Recording" : "Push to Talk"}
                  </Button>

                  {/* End Call Button */}
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={endCall}
                  >
                    End Call
                  </Button>
                </div>
              )}
            </div>

            {/* Status Indicators */}
            {isInCall && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  Status
                </h3>
                <div className="flex flex-wrap gap-2">
                  {isRecording && (
                    <Badge variant="destructive">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse" />
                        Recording
                      </span>
                    </Badge>
                  )}
                  {isProcessing && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                      Processing...
                    </Badge>
                  )}
                  {isSpeaking && (
                    <Badge variant="default">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3 h-3" />
                        Speaking
                      </span>
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  Conversation Stats
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Messages:</div>
                  <div className="font-medium">{stats.messageCount}</div>
                  <div className="text-muted-foreground">Duration:</div>
                  <div className="font-medium">{Math.floor(stats.duration / 60)}:{String(stats.duration % 60).padStart(2, "0")}</div>
                  <div className="text-muted-foreground">Est. Cost:</div>
                  <div className="font-medium text-amber-600">
                    ${((stats.duration / 60) * PRICING.voice.perMinute).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation Panel */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Conversation
              </h3>
            </div>

            {/* Messages */}
            <div className="h-[500px] overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Phone className="w-12 h-12 mb-4 opacity-50" />
                  <p>Start a test call to begin the conversation</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-primary text-white"
                          : msg.role === "system"
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm italic"
                          : "bg-muted text-gray-900 dark:text-white"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.role === "user" ? "text-primary-100" : "text-muted-foreground"
                      }`}>
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            How to Use
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Select an Agent</p>
                <p className="text-sm text-muted-foreground">Choose the voice agent you want to test</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Start the Call</p>
                <p className="text-sm text-muted-foreground">Click &quot;Start Test Call&quot; and allow microphone access</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Push to Talk</p>
                <p className="text-sm text-muted-foreground">Hold the button to speak, release to send</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
          </div>
        </TabsContent>

        <TabsContent value="outbound">
          <div className="pt-4">
            <OutboundTestPanel />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
