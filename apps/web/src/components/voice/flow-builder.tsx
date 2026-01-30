"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  NodeTypes,
  Panel,
  MarkerType,
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";

// Type definitions
type FlowNodeType =
  | "START"
  | "MESSAGE"
  | "INPUT"
  | "CONDITION"
  | "INTENT"
  | "TOOL_CALL"
  | "TRANSFER"
  | "HANDOFF"
  | "WAIT"
  | "SET_VARIABLE"
  | "END";

type FlowEdgeType =
  | "DEFAULT"
  | "CONDITIONAL"
  | "INTENT_MATCH"
  | "FALLBACK"
  | "ERROR";

interface FlowNodeData extends Record<string, unknown> {
  label: string;
  type: FlowNodeType;
  content?: string | null;
  config?: Record<string, unknown>;
}

interface FlowEdgeData extends Record<string, unknown> {
  edgeId: string;
  type: FlowEdgeType;
  condition?: Record<string, unknown> | null;
  label?: string | null;
}

interface ConversationFlow {
  id: string;
  name: string;
  description?: string | null;
  agentId?: string | null;
  version: number;
  isPublished: boolean;
  startNodeId?: string | null;
  viewport: { x: number; y: number; zoom: number };
  nodes: Array<{
    id: string;
    nodeId: string;
    type: FlowNodeType;
    label: string;
    content?: string | null;
    positionX: number;
    positionY: number;
    config: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    edgeId: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    type: FlowEdgeType;
    condition?: Record<string, unknown> | null;
    label?: string | null;
    animated: boolean;
  }>;
  agent?: { id: string; name: string } | null;
}

// Node type icons and colors
const nodeTypeConfig: Record<
  FlowNodeType,
  { icon: string; color: string; label: string }
> = {
  START: { icon: "\u{1F680}", color: "#22c55e", label: "Start" },
  MESSAGE: { icon: "\u{1F4AC}", color: "#3b82f6", label: "Message" },
  INPUT: { icon: "\u{1F3A4}", color: "#8b5cf6", label: "Input" },
  CONDITION: { icon: "\u{1F500}", color: "#f59e0b", label: "Condition" },
  INTENT: { icon: "\u{1F3AF}", color: "#ec4899", label: "Intent" },
  TOOL_CALL: { icon: "\u{1F527}", color: "#06b6d4", label: "Tool Call" },
  TRANSFER: { icon: "\u{1F4DE}", color: "#ef4444", label: "Transfer" },
  HANDOFF: { icon: "\u{1F504}", color: "#ef4444", label: "Handoff" },
  WAIT: { icon: "\u{23F3}", color: "#6b7280", label: "Wait" },
  SET_VARIABLE: { icon: "\u{1F4DD}", color: "#10b981", label: "Set Variable" },
  END: { icon: "\u{1F3C1}", color: "#dc2626", label: "End" },
};

// Custom Node Component
function CustomNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  const config = nodeTypeConfig[data.type];
  const isStart = data.type === "START";
  const isEnd = data.type === "END";

  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg border-2 min-w-[180px] transition-all ${
        selected ? "border-blue-500 shadow-blue-200" : "border-gray-200"
      }`}
      style={{ backgroundColor: "white" }}
    >
      {/* Input handle (not for START) */}
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-gray-400"
        />
      )}

      <div className="flex items-center gap-2">
        <span className="text-xl">{config.icon}</span>
        <div className="flex-1">
          <div
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: config.color }}
          >
            {config.label}
          </div>
          <div className="text-sm font-semibold text-gray-800">{data.label}</div>
        </div>
      </div>

      {data.content && (
        <div className="mt-2 text-xs text-gray-500 line-clamp-2">
          {data.content}
        </div>
      )}

      {/* Output handle (not for END) */}
      {!isEnd && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-gray-400"
        />
      )}

      {/* Conditional outputs for CONDITION and INTENT nodes */}
      {(data.type === "CONDITION" || data.type === "INTENT") && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="w-3 h-3 !bg-green-500"
            style={{ top: "40%" }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="w-3 h-3 !bg-red-500"
            style={{ top: "60%" }}
          />
        </>
      )}
    </div>
  );
}

// Register custom node types
const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface FlowBuilderProps {
  flowId?: string;
  agentId?: string;
  onSave?: (flow: ConversationFlow) => void;
}

export function FlowBuilder({ flowId, agentId, onSave }: FlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<FlowEdgeData>>([]);
  const [flow, setFlow] = useState<ConversationFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node<FlowNodeData> | null>(
    null
  );

  const [isOpen, setIsOpen] = useState(false);
  const [isNodeEditorOpen, setIsNodeEditorOpen] = useState(false);

  // Node editor state
  const [editingNode, setEditingNode] = useState<Node<FlowNodeData> | null>(
    null
  );
  const [nodeLabel, setNodeLabel] = useState("");
  const [nodeContent, setNodeContent] = useState("");
  const [nodeConfig, setNodeConfig] = useState<Record<string, unknown>>({});

  // Transfer node options (agents, groups, routing rules)
  const [transferAgents, setTransferAgents] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [agentGroups, setAgentGroups] = useState<{ id: string; name: string; routingStrategy: string; isActive: boolean }[]>([]);
  const [routingRules, setRoutingRules] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [loadingTransferOptions, setLoadingTransferOptions] = useState(false);

  // Fetch transfer options when editing a TRANSFER node
  useEffect(() => {
    async function loadTransferOptions() {
      if (editingNode?.data.type !== "TRANSFER") return;

      setLoadingTransferOptions(true);
      try {
        const [agentsRes, groupsRes, rulesRes] = await Promise.all([
          fetch("/api/voice/agents"),
          fetch("/api/voice/groups"),
          fetch("/api/voice/routing"),
        ]);

        if (agentsRes.ok) {
          const data = await agentsRes.json();
          setTransferAgents(data.agents || []);
        }
        if (groupsRes.ok) {
          const data = await groupsRes.json();
          setAgentGroups(data.groups || []);
        }
        if (rulesRes.ok) {
          const data = await rulesRes.json();
          setRoutingRules(data.rules || []);
        }
      } catch (error) {
        console.error("Error loading transfer options:", error);
      } finally {
        setLoadingTransferOptions(false);
      }
    }

    loadTransferOptions();
  }, [editingNode?.data.type]);

  // Load flow data
  useEffect(() => {
    async function loadFlow() {
      if (!flowId) {
        // Create a new flow with default nodes
        setNodes([
          {
            id: "start",
            type: "custom",
            position: { x: 250, y: 50 },
            data: { label: "Start", type: "START" },
          },
        ]);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/voice/flows/${flowId}`);
        if (!res.ok) throw new Error("Failed to load flow");

        const data = await res.json();
        setFlow(data.flow);

        // Convert to React Flow format
        const flowNodes: Node<FlowNodeData>[] = data.flow.nodes.map(
          (n: ConversationFlow["nodes"][0]) => ({
            id: n.nodeId,
            type: "custom",
            position: { x: n.positionX, y: n.positionY },
            data: {
              label: n.label,
              type: n.type,
              content: n.content,
              config: n.config,
            },
          })
        );

        const flowEdges: Edge<FlowEdgeData>[] = data.flow.edges.map(
          (e: ConversationFlow["edges"][0]) => ({
            id: e.edgeId,
            source: e.sourceNodeId,
            target: e.targetNodeId,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            animated: e.animated,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
              edgeId: e.edgeId,
              type: e.type,
              condition: e.condition,
              label: e.label,
            },
          })
        );

        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch (error) {
        console.error("Error loading flow:", error);
        toast.error("Failed to load conversation flow");
      } finally {
        setLoading(false);
      }
    }

    loadFlow();
  }, [flowId, setNodes, setEdges]);

  // Handle edge connections
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge<FlowEdgeData> = {
        ...params,
        id: `e-${params.source}-${params.target}-${Date.now()}`,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
          edgeId: `e-${params.source}-${params.target}-${Date.now()}`,
          type: "DEFAULT" as FlowEdgeType,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Add a new node
  const addNode = useCallback(
    (type: FlowNodeType) => {
      const newNodeId = `node-${Date.now()}`;
      const config = nodeTypeConfig[type];

      const newNode: Node<FlowNodeData> = {
        id: newNodeId,
        type: "custom",
        position: { x: 250, y: nodes.length * 100 + 100 },
        data: {
          label: config.label,
          type,
          content: type === "MESSAGE" ? "Enter your message here..." : type === "HANDOFF" ? "Please hold while I connect you to a human..." : undefined,
          config: {},
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setIsOpen(false);
      toast.success(`Added ${config.label} node`);
    },
    [nodes.length, setNodes]
  );

  // Handle node click for editing
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<FlowNodeData>) => {
      setSelectedNode(node);
      setEditingNode(node);
      setNodeLabel(node.data.label);
      setNodeContent(node.data.content || "");
      setNodeConfig(node.data.config || {});
      setIsNodeEditorOpen(true);
    },
    []
  );

  // Save node edits
  const saveNodeEdits = useCallback(() => {
    if (!editingNode) return;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === editingNode.id) {
          return {
            ...n,
            data: {
              ...n.data,
              label: nodeLabel,
              content: nodeContent || null,
              config: nodeConfig,
            },
          };
        }
        return n;
      })
    );

    setIsNodeEditorOpen(false);
    toast.success("Node updated");
  }, [editingNode, nodeLabel, nodeContent, nodeConfig, setNodes]);

  // Delete selected node
  const deleteNode = useCallback(() => {
    if (!editingNode) return;

    if (editingNode.data.type === "START") {
      toast.error("Cannot delete the START node");
      return;
    }

    setNodes((nds) => nds.filter((n) => n.id !== editingNode.id));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== editingNode.id && e.target !== editingNode.id
      )
    );
    setIsNodeEditorOpen(false);
    toast.success("Node deleted");
  }, [editingNode, setNodes, setEdges]);

  // Save flow
  const saveFlow = useCallback(async () => {
    setSaving(true);
    try {
      const flowNodes = nodes.map((n) => ({
        nodeId: n.id,
        type: n.data.type,
        label: n.data.label,
        content: n.data.content,
        positionX: n.position.x,
        positionY: n.position.y,
        config: n.data.config || {},
      }));

      const flowEdges = edges.map((e) => ({
        edgeId: e.id,
        sourceNodeId: e.source,
        targetNodeId: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: e.data?.type || "DEFAULT",
        condition: e.data?.condition,
        label: e.data?.label,
        animated: e.animated || false,
      }));

      const startNode = nodes.find((n) => n.data.type === "START");

      if (flowId) {
        // Update existing flow
        const res = await fetch(`/api/voice/flows/${flowId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodes: flowNodes,
            edges: flowEdges,
            startNodeId: startNode?.id,
          }),
        });

        if (!res.ok) throw new Error("Failed to save flow");

        const data = await res.json();
        setFlow(data.flow);
        toast.success("Flow saved successfully");

        if (onSave) onSave(data.flow);
      } else {
        // Create new flow
        const res = await fetch("/api/voice/flows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "New Conversation Flow",
            agentId,
          }),
        });

        if (!res.ok) throw new Error("Failed to create flow");

        const data = await res.json();

        // Then update with nodes/edges
        const updateRes = await fetch(`/api/voice/flows/${data.flow.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodes: flowNodes,
            edges: flowEdges,
            startNodeId: startNode?.id,
          }),
        });

        if (!updateRes.ok) throw new Error("Failed to save flow");

        const updateData = await updateRes.json();
        setFlow(updateData.flow);
        toast.success("Flow created successfully");

        if (onSave) onSave(updateData.flow);
      }
    } catch (error) {
      console.error("Error saving flow:", error);
      toast.error("Failed to save flow");
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, flowId, agentId, onSave]);

  // Memoize default edge options
  const defaultEdgeOptions = useMemo(
    () => ({
      markerEnd: { type: MarkerType.ArrowClosed },
    }),
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-[700px] bg-gray-50 rounded-lg border relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
      >
        <Background gap={15} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as FlowNodeData;
            return nodeTypeConfig[data.type]?.color || "#6b7280";
          }}
        />

        {/* Top toolbar */}
        <Panel position="top-left" className="flex gap-2">
          <Button size="sm" onClick={() => setIsOpen(true)}>
            + Add Node
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
            onClick={saveFlow}
            disabled={saving}
          >
            Save Flow
          </Button>
          {flow?.isPublished ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              Published
            </Badge>
          ) : (
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
              Draft
            </Badge>
          )}
        </Panel>

        {/* Flow info */}
        <Panel position="top-right">
          <Card className="max-w-xs">
            <CardContent className="p-3">
              <div className="text-sm font-medium">
                {flow?.name || "New Flow"}
              </div>
              <div className="text-xs text-muted-foreground">
                {nodes.length} nodes, {edges.length} edges
              </div>
              {flow?.agent && (
                <div className="text-xs text-muted-foreground mt-1">
                  Agent: {flow.agent.name}
                </div>
              )}
            </CardContent>
          </Card>
        </Panel>
      </ReactFlow>

      {/* Add Node Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add Node</DialogTitle></DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(nodeTypeConfig) as [FlowNodeType, typeof nodeTypeConfig[FlowNodeType]][]).map(
                ([type, config]) => (
                  <Card
                    key={type}
                    className="cursor-pointer hover:border-blue-500 border-2 border-transparent transition-colors"
                    onClick={() => addNode(type)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div>
                          <div className="font-medium">{config.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {getNodeDescription(type)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Node Editor Modal */}
      <Dialog
        open={isNodeEditorOpen}
        onOpenChange={setIsNodeEditorOpen}
      >
        <DialogContent>
          <DialogHeader><DialogTitle>
            {editingNode && (
              <div className="flex items-center gap-2">
                <span>{nodeTypeConfig[editingNode.data.type].icon}</span>
                Edit {nodeTypeConfig[editingNode.data.type].label} Node
              </div>
            )}
          </DialogTitle></DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={nodeLabel}
                  onChange={(e) => setNodeLabel(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">A short name for this node</p>
              </div>

              {editingNode?.data.type === "MESSAGE" && (
                <div className="space-y-2">
                  <Label>Message Content</Label>
                  <Textarea
                    value={nodeContent}
                    onChange={(e) => setNodeContent(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">The message the agent will speak</p>
                </div>
              )}

              {editingNode?.data.type === "INPUT" && (
                <>
                  <div className="space-y-2">
                    <Label>Variable Name</Label>
                    <Input
                      value={(nodeConfig.variable as string) || ""}
                      onChange={(e) =>
                        setNodeConfig({ ...nodeConfig, variable: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Store the user&apos;s response in this variable</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Prompt</Label>
                    <Textarea
                      value={nodeContent}
                      onChange={(e) => setNodeContent(e.target.value)}
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">What to ask the user</p>
                  </div>
                </>
              )}

              {editingNode?.data.type === "CONDITION" && (
                <>
                  <div className="space-y-2">
                    <Label>Variable</Label>
                    <Input
                      value={(nodeConfig.variable as string) || ""}
                      onChange={(e) =>
                        setNodeConfig({ ...nodeConfig, variable: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Variable to check</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Operator</Label>
                    <Select
                      value={(nodeConfig.operator as string) || ""}
                      onValueChange={(val) =>
                        setNodeConfig({
                          ...nodeConfig,
                          operator: val,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="startsWith">Starts With</SelectItem>
                        <SelectItem value="endsWith">Ends With</SelectItem>
                        <SelectItem value="greaterThan">Greater Than</SelectItem>
                        <SelectItem value="lessThan">Less Than</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Value</Label>
                    <Input
                      value={(nodeConfig.value as string) || ""}
                      onChange={(e) =>
                        setNodeConfig({ ...nodeConfig, value: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Value to compare against</p>
                  </div>
                </>
              )}

              {editingNode?.data.type === "TRANSFER" && (
                <>
                  <div className="space-y-2">
                    <Label>Transfer Type</Label>
                    <Select
                      value={(nodeConfig.transferType as string) || "phone"}
                      onValueChange={(val) => {
                        setNodeConfig({
                          ...nodeConfig,
                          transferType: val,
                          // Clear other fields when type changes
                          destination: val === "phone" ? (nodeConfig.destination || "") : undefined,
                          agentId: val === "agent" ? (nodeConfig.agentId || "") : undefined,
                          groupId: val === "group" ? (nodeConfig.groupId || "") : undefined,
                          routingRuleId: val === "rule" ? (nodeConfig.routingRuleId || "") : undefined,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transfer type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">Phone Number</SelectItem>
                        <SelectItem value="agent">Voice Agent</SelectItem>
                        <SelectItem value="group">Agent Group</SelectItem>
                        <SelectItem value="rule">Routing Rule</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {loadingTransferOptions ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading options...</span>
                    </div>
                  ) : (
                    <>
                      {/* Phone number input */}
                      {(!nodeConfig.transferType || nodeConfig.transferType === "phone") && (
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input
                            value={(nodeConfig.destination as string) || ""}
                            onChange={(e) =>
                              setNodeConfig({ ...nodeConfig, destination: e.target.value })
                            }
                            placeholder="+1234567890"
                          />
                          <p className="text-xs text-muted-foreground">Phone number to transfer the call to</p>
                        </div>
                      )}

                      {/* Agent selection */}
                      {nodeConfig.transferType === "agent" && (
                        <div className="space-y-2">
                          <Label>Select Agent</Label>
                          <Select
                            value={(nodeConfig.agentId as string) || ""}
                            onValueChange={(val) =>
                              setNodeConfig({
                                ...nodeConfig,
                                agentId: val,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select an agent" />
                            </SelectTrigger>
                            <SelectContent>
                              {transferAgents.map((agent) => (
                                <SelectItem
                                  key={agent.id}
                                  value={agent.id}
                                >
                                  {agent.name}{!agent.isActive ? " (Inactive)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Transfer to another voice agent</p>
                        </div>
                      )}

                      {/* Group selection */}
                      {nodeConfig.transferType === "group" && (
                        <div className="space-y-2">
                          <Label>Select Agent Group</Label>
                          <Select
                            value={(nodeConfig.groupId as string) || ""}
                            onValueChange={(val) =>
                              setNodeConfig({
                                ...nodeConfig,
                                groupId: val,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a group" />
                            </SelectTrigger>
                            <SelectContent>
                              {agentGroups.map((group) => (
                                <SelectItem
                                  key={group.id}
                                  value={group.id}
                                >
                                  {group.name} ({group.routingStrategy.replace(/_/g, " ")}){!group.isActive ? " - Inactive" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Transfer to a group of agents (uses group&apos;s routing strategy)</p>
                        </div>
                      )}

                      {/* Routing rule selection */}
                      {nodeConfig.transferType === "rule" && (
                        <div className="space-y-2">
                          <Label>Select Routing Rule</Label>
                          <Select
                            value={(nodeConfig.routingRuleId as string) || ""}
                            onValueChange={(val) =>
                              setNodeConfig({
                                ...nodeConfig,
                                routingRuleId: val,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a routing rule" />
                            </SelectTrigger>
                            <SelectContent>
                              {routingRules.map((rule) => (
                                <SelectItem
                                  key={rule.id}
                                  value={rule.id}
                                >
                                  {rule.name}{!rule.isActive ? " (Inactive)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Apply a routing rule to determine destination</p>
                        </div>
                      )}
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Transfer Message</Label>
                    <Textarea
                      value={nodeContent}
                      onChange={(e) => setNodeContent(e.target.value)}
                      rows={2}
                      placeholder="Please hold while I transfer you..."
                    />
                    <p className="text-xs text-muted-foreground">Message to say before transferring</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Hold Music URL (Optional)</Label>
                    <Input
                      value={(nodeConfig.holdMusicUrl as string) || ""}
                      onChange={(e) =>
                        setNodeConfig({ ...nodeConfig, holdMusicUrl: e.target.value || undefined })
                      }
                      placeholder="https://example.com/music.mp3"
                    />
                    <p className="text-xs text-muted-foreground">Audio file to play while transferring</p>
                  </div>
                </>
              )}

              {editingNode?.data.type === "HANDOFF" && (
                <>
                  <div className="space-y-2">
                    <Label>Target Source</Label>
                    <Select
                      value={(nodeConfig.targetSource as string) || "default"}
                      onValueChange={(val) => {
                        setNodeConfig({
                          ...nodeConfig,
                          targetSource: val,
                          // Clear explicit target fields when switching to default
                          ...(val === "default" ? {
                            targetContext: undefined,
                            targetExten: undefined,
                            targetPriority: undefined,
                          } : {}),
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Use Governance Default</SelectItem>
                        <SelectItem value="explicit">Explicit Target</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Use governance default or specify an explicit target</p>
                  </div>

                  {nodeConfig.targetSource === "explicit" && (
                    <>
                      <div className="space-y-2">
                        <Label>Context</Label>
                        <Input
                          value={(nodeConfig.targetContext as string) || ""}
                          onChange={(e) =>
                            setNodeConfig({ ...nodeConfig, targetContext: e.target.value })
                          }
                          placeholder="sales_queue"
                        />
                        <p className="text-xs text-muted-foreground">Dialplan context name</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Extension</Label>
                        <Input
                          value={(nodeConfig.targetExten as string) || ""}
                          onChange={(e) =>
                            setNodeConfig({ ...nodeConfig, targetExten: e.target.value })
                          }
                          placeholder="1"
                        />
                        <p className="text-xs text-muted-foreground">Extension number within the context</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Input
                          type="number"
                          min={1}
                          value={String(nodeConfig.targetPriority || 1)}
                          onChange={(e) =>
                            setNodeConfig({
                              ...nodeConfig,
                              targetPriority: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">Priority level for the dialplan</p>
                      </div>
                    </>
                  )}

                  {nodeConfig.targetSource === "default" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                      <div className="font-medium mb-1">Using Governance Default</div>
                      <div>Configure default handoff targets in agent governance settings.</div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Pre-Transfer Message</Label>
                    <Textarea
                      value={nodeContent}
                      onChange={(e) => setNodeContent(e.target.value)}
                      rows={2}
                      placeholder="Please hold while I connect you to a human..."
                    />
                    <p className="text-xs text-muted-foreground">Message to speak before handoff (optional)</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Escalation Reason</Label>
                    <Input
                      value={(nodeConfig.escalationReason as string) || ""}
                      onChange={(e) =>
                        setNodeConfig({ ...nodeConfig, escalationReason: e.target.value })
                      }
                      placeholder="User requested human agent"
                    />
                    <p className="text-xs text-muted-foreground">Reason for escalation (tracked in session)</p>
                  </div>
                </>
              )}

              {editingNode?.data.type === "WAIT" && (
                <div className="space-y-2">
                  <Label>Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={String(nodeConfig.duration || 5)}
                    onChange={(e) =>
                      setNodeConfig({ ...nodeConfig, duration: parseInt(e.target.value) || 5 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">How long to wait</p>
                </div>
              )}

              {editingNode?.data.type === "SET_VARIABLE" && (
                <>
                  <div className="space-y-2">
                    <Label>Variable Name</Label>
                    <Input
                      value={(nodeConfig.variable as string) || ""}
                      onChange={(e) =>
                        setNodeConfig({ ...nodeConfig, variable: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Value</Label>
                    <Input
                      value={(nodeConfig.value as string) || ""}
                      onChange={(e) =>
                        setNodeConfig({ ...nodeConfig, value: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              {editingNode?.data.type === "END" && (
                <div className="space-y-2">
                  <Label>Call Outcome</Label>
                  <Select
                    value={(nodeConfig.outcome as string) || ""}
                    onValueChange={(val) =>
                      setNodeConfig({
                        ...nodeConfig,
                        outcome: val,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="transferred">Transferred</SelectItem>
                      <SelectItem value="voicemail">Voicemail</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            {editingNode?.data.type !== "START" && (
              <Button variant="destructive" onClick={deleteNode}>
                Delete Node
              </Button>
            )}
            <Button onClick={saveNodeEdits}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function for node descriptions
function getNodeDescription(type: FlowNodeType): string {
  const descriptions: Record<FlowNodeType, string> = {
    START: "Entry point of the conversation",
    MESSAGE: "Speak a message to the caller",
    INPUT: "Wait for and capture user input",
    CONDITION: "Branch based on a condition",
    INTENT: "Branch based on detected intent",
    TOOL_CALL: "Execute a function/tool",
    TRANSFER: "Transfer to human or another agent",
    HANDOFF: "Escalate to human via handoff target",
    WAIT: "Pause for a duration",
    SET_VARIABLE: "Set a conversation variable",
    END: "End the conversation",
  };
  return descriptions[type];
}

export default FlowBuilder;
