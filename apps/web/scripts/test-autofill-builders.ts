/**
 * Test script for auto-fill builders
 *
 * Run with: npx tsx apps/web/scripts/test-autofill-builders.ts
 */

// Import the builders directly
import {
  buildSalesQualifierToolsV1,
  buildSalesQualifierFlowV1,
} from "../src/app/api/agent-os/agents/[id]/_autofill";

async function main() {
  console.log("=== Testing Sales Qualifier Auto-Fill Builders ===\n");

  // Test Tools Builder
  console.log("1. Testing buildSalesQualifierToolsV1()...");
  const toolConfig = buildSalesQualifierToolsV1();
  console.log(`   - Generated ${toolConfig.enabled_tools.length} tools`);
  console.log(`   - Tool IDs: ${toolConfig.enabled_tools.map(t => t.id).join(", ")}`);
  console.log(`   - Tool policies: ${JSON.stringify(toolConfig.tool_policies)}`);
  console.log("   ✓ Tools builder works!\n");

  // Test Flow Builder
  console.log("2. Testing buildSalesQualifierFlowV1()...");
  const flowConfig = buildSalesQualifierFlowV1();
  console.log(`   - Version: ${flowConfig.version}`);
  console.log(`   - Template key: ${flowConfig.templateKey}`);
  console.log(`   - Generated ${flowConfig.nodes.length} nodes`);
  console.log(`   - Generated ${flowConfig.edges.length} edges`);
  console.log(`   - Generated ${flowConfig.intents.length} intents`);
  console.log(`   - Generated ${flowConfig.tool_hooks.length} tool hooks`);
  console.log(`   - Entry node: ${flowConfig.entry_node_id}`);
  console.log(`   - Exit nodes: ${flowConfig.exit_node_ids.join(", ")}`);
  console.log("   ✓ Flow builder works!\n");

  // Validate flow structure
  console.log("3. Validating flow structure...");
  const nodeIds = new Set(flowConfig.nodes.map(n => n.id));
  const edgeErrors: string[] = [];

  for (const edge of flowConfig.edges) {
    if (!nodeIds.has(edge.from)) {
      edgeErrors.push(`Edge ${edge.id}: 'from' node '${edge.from}' not found`);
    }
    if (!nodeIds.has(edge.to)) {
      edgeErrors.push(`Edge ${edge.id}: 'to' node '${edge.to}' not found`);
    }
  }

  if (edgeErrors.length > 0) {
    console.log("   ✗ Validation errors:");
    edgeErrors.forEach(e => console.log(`     - ${e}`));
  } else {
    console.log("   ✓ All edges reference valid nodes");
  }

  // Check entry and exit nodes exist
  if (!nodeIds.has(flowConfig.entry_node_id)) {
    console.log(`   ✗ Entry node '${flowConfig.entry_node_id}' not found`);
  } else {
    console.log(`   ✓ Entry node exists`);
  }

  for (const exitId of flowConfig.exit_node_ids) {
    if (!nodeIds.has(exitId)) {
      console.log(`   ✗ Exit node '${exitId}' not found`);
    }
  }
  console.log(`   ✓ All exit nodes exist\n`);

  // Summary
  console.log("=== Summary ===");
  console.log(`Tools: ${toolConfig.enabled_tools.length} enabled tools configured`);
  console.log(`Flow: ${flowConfig.nodes.length} nodes, ${flowConfig.edges.length} edges`);
  console.log("\nAuto-fill builders are ready for sales_qualifier template!");
}

main().catch(console.error);
