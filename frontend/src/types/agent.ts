export interface Agent {
  id: string;
  object: string;
  createdAt: number;
  name: string;
  description?: string;
  model: string;
  instructions: string;
  metadata?: Record<string, string>;
}

export interface AgentsResponse {
  agents: Agent[];
  count: number;
}

export interface AgentSelectProps {
  selectedAgentId?: string;
  onAgentSelect: (agentId: string | null) => void;
  disabled?: boolean;
}
