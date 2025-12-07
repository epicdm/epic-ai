import { eventBus, Events } from "./event-bus";

interface LeadData {
  id: string;
  organizationId: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  source: string;
  status: string;
}

export async function emitLeadCreated(lead: LeadData) {
  await eventBus.emit(Events.LEAD_CREATED, {
    leadId: lead.id,
    organizationId: lead.organizationId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    status: lead.status,
  });
}

export async function emitLeadStatusChanged(
  leadId: string,
  organizationId: string,
  oldStatus: string,
  newStatus: string
) {
  await eventBus.emit(Events.LEAD_STATUS_CHANGED, {
    leadId,
    organizationId,
    oldStatus,
    newStatus,
  });
}

interface CallData {
  id: string;
  brand?: {
    organizationId: string;
  } | null;
  agentId?: string | null;
  duration?: number;
}

interface LeadReference {
  id: string;
}

export async function emitCallCompleted(call: CallData, lead?: LeadReference | null) {
  await eventBus.emit(Events.CALL_COMPLETED, {
    callId: call.id,
    organizationId: call.brand?.organizationId,
    leadId: lead?.id,
    agentId: call.agentId,
    duration: call.duration,
  });
}

export async function emitCallFailed(call: CallData, lead?: LeadReference | null) {
  await eventBus.emit(Events.CALL_FAILED, {
    callId: call.id,
    organizationId: call.brand?.organizationId,
    leadId: lead?.id,
    agentId: call.agentId,
  });
}
