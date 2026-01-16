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
import {
  Card,
  CardBody,
  Button,
  Input,
  Textarea,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Spinner,
  Select,
  SelectItem,
} from "@heroui/react";
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
  | "WAIT"
  | "SET_VARIABLE"
  | "END";

type FlowEdgeType =
  | "DEFAULT"
  | "CONDITIONAL"
  | "INTENT_MATCH"
  | "FALLBACK"
  | "ERROR";

interface FlowNodeData {
  label: string;
  type: FlowNodeType;
  content?: string | null;
  config?: Record<string, unknown>;
}

interface FlowEdgeData {
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
  START: { icon: "🚀", color: "#22c55e", label: "Start" },
  MESSAGE: { icon: "💬", color: "#3b82f6", label: "Message" },
  INPUT: { icon: "🎤", color: "#8b5cf6", label: "Input" },
  CONDITION: { icon: "🔀", color: "#f59e0b", label: "Condition" },
  INTENT: { icon: "🎯", color: "#ec4899", label: "Intent" },
  TOOL_CALL: { icon: "🔧", color: "#06b6d4", label: "Tool Call" },
  TRANSFER: { icon: "📞", color: "#ef4444", label: "Transfer" },
  WAIT: { icon: "⏳", color: "#6b7280", label: "Wait" },
  SET_VARIABLE: { icon: "📝", color: "#10b981", label: "Set Variable" },
  END: { icon: "🏁", color: "#dc2626", label: "End" },
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

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isNodeEditorOpen,
    onOpen: onNodeEditorOpen,
    onClose: onNodeEditorClose,
  } = useDisclosure();

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
          content: type === "MESSAGE" ? "Enter your message here..." : undefined,
          config: {},
        },
      };

      setNodes((nds) => [...nds, newNode]);
      onClose();
      toast.success(`Added ${config.label} node`);
    },
    [nodes.length, setNodes, onClose]
  );

  // Handle node click for editing
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<FlowNodeData>) => {
      setSelectedNode(node);
      setEditingNode(node);
      setNodeLabel(node.data.label);
      setNodeContent(node.data.content || "");
      setNodeConfig(node.data.config || {});
      onNodeEditorOpen();
    },
    [onNodeEditorOpen]
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

    onNodeEditorClose();
    toast.success("Node updated");
  }, [editingNode, nodeLabel, nodeContent, nodeConfig, setNodes, onNodeEditorClose]);

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
    onNodeEditorClose();
    toast.success("Node deleted");
  }, [editingNode, setNodes, setEdges, onNodeEditorClose]);

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
        <Spinner size="lg" />
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
          <Button color="primary" size="sm" onPress={onOpen}>
            + Add Node
          </Button>
          <Button
            color="success"
            size="sm"
            onPress={saveFlow}
            isLoading={saving}
          >
            Save Flow
          </Button>
          {flow?.isPublished ? (
            <Chip color="success" variant="flat">
              Published
            </Chip>
          ) : (
            <Chip color="warning" variant="flat">
              Draft
            </Chip>
          )}
        </Panel>

        {/* Flow info */}
        <Panel position="top-right">
          <Card className="max-w-xs">
            <CardBody className="p-3">
              <div className="text-sm font-medium">
                {flow?.name || "New Flow"}
              </div>
              <div className="text-xs text-gray-500">
                {nodes.length} nodes, {edges.length} edges
              </div>
              {flow?.agent && (
                <div className="text-xs text-gray-500 mt-1">
                  Agent: {flow.agent.name}
                </div>
              )}
            </CardBody>
          </Card>
        </Panel>
      </ReactFlow>

      {/* Add Node Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>Add Node</ModalHeader>
          <ModalBody>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(nodeTypeConfig) as [FlowNodeType, typeof nodeTypeConfig[FlowNodeType]][]).map(
                ([type, config]) => (
                  <Card
                    key={type}
                    isPressable
                    onPress={() => addNode(type)}
                    className="hover:border-blue-500 border-2 border-transparent transition-colors"
                  >
                    <CardBody className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div>
                          <div className="font-medium">{config.label}</div>
                          <div className="text-xs text-gray-500">
                            {getNodeDescription(type)}
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )
              )}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Node Editor Modal */}
      <Modal
        isOpen={isNodeEditorOpen}
        onClose={onNodeEditorClose}
        size="lg"
      >
        <ModalContent>
          <ModalHeader>
            {editingNode && (
              <div className="flex items-center gap-2">
                <span>{nodeTypeConfig[editingNode.data.type].icon}</span>
                Edit {nodeTypeConfig[editingNode.data.type].label} Node
              </div>
            )}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Label"
                value={nodeLabel}
                onValueChange={setNodeLabel}
                description="A short name for this node"
              />

              {editingNode?.data.type === "MESSAGE" && (
                <Textarea
                  label="Message Content"
                  value={nodeContent}
                  onValueChange={setNodeContent}
                  minRows={3}
                  description="The message the agent will speak"
                />
              )}

              {editingNode?.data.type === "INPUT" && (
                <>
                  <Input
                    label="Variable Name"
                    value={(nodeConfig.variable as string) || ""}
                    onValueChange={(v) =>
                      setNodeConfig({ ...nodeConfig, variable: v })
                    }
                    description="Store the user's response in this variable"
                  />
                  <Textarea
                    label="Prompt"
                    value={nodeContent}
                    onValueChange={setNodeContent}
                    minRows={2}
                    description="What to ask the user"
                  />
                </>
              )}

              {editingNode?.data.type === "CONDITION" && (
                <>
                  <Input
                    label="Variable"
                    value={(nodeConfig.variable as string) || ""}
                    onValueChange={(v) =>
                      setNodeConfig({ ...nodeConfig, variable: v })
                    }
                    description="Variable to check"
                  />
                  <Select
                    label="Operator"
                    selectedKeys={
                      nodeConfig.operator ? [nodeConfig.operator as string] : []
                    }
                    onSelectionChange={(keys) =>
                      setNodeConfig({
                        ...nodeConfig,
                        operator: Array.from(keys)[0],
                      })
                    }
                  >
                    <SelectItem key="equals">Equals</SelectItem>
                    <SelectItem key="contains">Contains</SelectItem>
                    <SelectItem key="startsWith">Starts With</SelectItem>
                    <SelectItem key="endsWith">Ends With</SelectItem>
                    <SelectItem key="greaterThan">Greater Than</SelectItem>
                    <SelectItem key="lessThan">Less Than</SelectItem>
                  </Select>
                  <Input
                    label="Value"
                    value={(nodeConfig.value as string) || ""}
                    onValueChange={(v) =>
                      setNodeConfig({ ...nodeConfig, value: v })
                    }
                    description="Value to compare against"
                  />
                </>
              )}

              {editingNode?.data.type === "TRANSFER" && (
                <>
                  <Select
                    label="Transfer Type"
                    selectedKeys={
                      nodeConfig.transferType
                        ? [nodeConfig.transferType as string]
                        : ["phone"]
                    }
                    onSelectionChange={(keys) => {
                      const type = Array.from(keys)[0] as string;
                      setNodeConfig({
                        ...nodeConfig,
                        transferType: type,
                        // Clear other fields when type changes
                        destination: type === "phone" ? (nodeConfig.destination || "") : undefined,
                        agentId: type === "agent" ? (nodeConfig.agentId || "") : undefined,
                        groupId: type === "group" ? (nodeConfig.groupId || "") : undefined,
                        routingRuleId: type === "rule" ? (nodeConfig.routingRuleId || "") : undefined,
                      });
                    }}
                  >
                    <SelectItem key="phone">Phone Number</SelectItem>
                    <SelectItem key="agent">Voice Agent</SelectItem>
                    <SelectItem key="group">Agent Group</SelectItem>
                    <SelectItem key="rule">Routing Rule</SelectItem>
                  </Select>

                  {loadingTransferOptions ? (
                    <div className="flex items-center justify-center py-4">
                      <Spinner size="sm" />
                      <span className="ml-2 text-sm text-gray-500">Loading options...</span>
                    </div>
                  ) : (
                    <>
                      {/* Phone number input */}
                      {(!nodeConfig.transferType || nodeConfig.transferType === "phone") && (
                        <Input
                          label="Phone Number"
                          value={(nodeConfig.destination as string) || ""}
                          onValueChange={(v) =>
                            setNodeConfig({ ...nodeConfig, destination: v })
                          }
                          placeholder="+1234567890"
                          description="Phone number to transfer the call to"
                        />
                      )}

                      {/* Agent selection */}
                      {nodeConfig.transferType === "agent" && (
                        <Select
                          label="Select Agent"
                          selectedKeys={
                            nodeConfig.agentId ? [nodeConfig.agentId as string] : []
                          }
                          onSelectionChange={(keys) =>
                            setNodeConfig({
                              ...nodeConfig,
                              agentId: Array.from(keys)[0],
                            })
                          }
                          description="Transfer to another voice agent"
                        >
                          {transferAgents.map((agent) => (
                            <SelectItem
                              key={agent.id}
                              textValue={agent.name}
                            >
                              <div className="flex items-center gap-2">
                                <span>{agent.name}</span>
                                {!agent.isActive && (
                                  <Chip size="sm" color="warning" variant="flat">Inactive</Chip>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </Select>
                      )}

                      {/* Group selection */}
                      {nodeConfig.transferType === "group" && (
                        <Select
                          label="Select Agent Group"
                          selectedKeys={
                            nodeConfig.groupId ? [nodeConfig.groupId as string] : []
                          }
                          onSelectionChange={(keys) =>
                            setNodeConfig({
                              ...nodeConfig,
                              groupId: Array.from(keys)[0],
                            })
                          }
                          description="Transfer to a group of agents (uses group's routing strategy)"
                        >
                          {agentGroups.map((group) => (
                            <SelectItem
                              key={group.id}
                              textValue={group.name}
                            >
                              <div className="flex items-center gap-2">
                                <span>{group.name}</span>
                                <Chip size="sm" variant="flat" color="primary">
                                  {group.routingStrategy.replace(/_/g, " ")}
                                </Chip>
                                {!group.isActive && (
                                  <Chip size="sm" color="warning" variant="flat">Inactive</Chip>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </Select>
                      )}

                      {/* Routing rule selection */}
                      {nodeConfig.transferType === "rule" && (
                        <Select
                          label="Select Routing Rule"
                          selectedKeys={
                            nodeConfig.routingRuleId ? [nodeConfig.routingRuleId as string] : []
                          }
                          onSelectionChange={(keys) =>
                            setNodeConfig({
                              ...nodeConfig,
                              routingRuleId: Array.from(keys)[0],
                            })
                          }
                          description="Apply a routing rule to determine destination"
                        >
                          {routingRules.map((rule) => (
                            <SelectItem
                              key={rule.id}
                              textValue={rule.name}
                            >
                              <div className="flex items-center gap-2">
                                <span>{rule.name}</span>
                                {!rule.isActive && (
                                  <Chip size="sm" color="warning" variant="flat">Inactive</Chip>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </Select>
                      )}
                    </>
                  )}

                  <Textarea
                    label="Transfer Message"
                    value={nodeContent}
                    onValueChange={setNodeContent}
                    minRows={2}
                    placeholder="Please hold while I transfer you..."
                    description="Message to say before transferring"
                  />

                  <Input
                    label="Hold Music URL (Optional)"
                    value={(nodeConfig.holdMusicUrl as string) || ""}
                    onValueChange={(v) =>
                      setNodeConfig({ ...nodeConfig, holdMusicUrl: v || undefined })
                    }
                    placeholder="https://example.com/music.mp3"
                    description="Audio file to play while transferring"
                  />
                </>
              )}

              {editingNode?.data.type === "WAIT" && (
                <Input
                  label="Duration (seconds)"
                  type="number"
                  value={String(nodeConfig.duration || 5)}
                  onValueChange={(v) =>
                    setNodeConfig({ ...nodeConfig, duration: parseInt(v) || 5 })
                  }
                  description="How long to wait"
                />
              )}

              {editingNode?.data.type === "SET_VARIABLE" && (
                <>
                  <Input
                    label="Variable Name"
                    value={(nodeConfig.variable as string) || ""}
                    onValueChange={(v) =>
                      setNodeConfig({ ...nodeConfig, variable: v })
                    }
                  />
                  <Input
                    label="Value"
                    value={(nodeConfig.value as string) || ""}
                    onValueChange={(v) =>
                      setNodeConfig({ ...nodeConfig, value: v })
                    }
                  />
                </>
              )}

              {editingNode?.data.type === "END" && (
                <Select
                  label="Call Outcome"
                  selectedKeys={
                    nodeConfig.outcome ? [nodeConfig.outcome as string] : []
                  }
                  onSelectionChange={(keys) =>
                    setNodeConfig({
                      ...nodeConfig,
                      outcome: Array.from(keys)[0],
                    })
                  }
                >
                  <SelectItem key="completed">Completed</SelectItem>
                  <SelectItem key="transferred">Transferred</SelectItem>
                  <SelectItem key="voicemail">Voicemail</SelectItem>
                  <SelectItem key="failed">Failed</SelectItem>
                </Select>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            {editingNode?.data.type !== "START" && (
              <Button color="danger" variant="light" onPress={deleteNode}>
                Delete Node
              </Button>
            )}
            <Button color="primary" onPress={saveNodeEdits}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
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
    WAIT: "Pause for a duration",
    SET_VARIABLE: "Set a conversation variable",
    END: "End the conversation",
  };
  return descriptions[type];
}

export default FlowBuilder;
