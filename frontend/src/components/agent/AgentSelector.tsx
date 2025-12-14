import { useState, useEffect } from "react";
import type {
  Agent,
  AgentSelectProps,
  AgentsResponse,
} from "../../types/agent";
import { useAuth } from "../../hooks/useAuth";
import styles from "./AgentSelector.module.css";

export function AgentSelector({
  selectedAgentId,
  onAgentSelect,
  disabled,
}: AgentSelectProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAccessToken } = useAuth();

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = await getAccessToken();
        const apiUrl = import.meta.env.VITE_API_URL || "/api";

        const response = await fetch(`${apiUrl}/agents`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch agents: ${response.status}`);
        }

        const data: AgentsResponse = await response.json();
        setAgents(data.agents);
      } catch (err) {
        console.error("Error fetching agents:", err);
        setError(err instanceof Error ? err.message : "Failed to load agents");
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [getAccessToken]);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const agentId = event.target.value;

    // Convert empty string (default option) to null
    const selectedId = agentId === "" ? null : agentId;
    onAgentSelect(selectedId);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <label className={styles.label}>Agent:</label>
        <select className={styles.select} disabled>
          <option>Loading agents...</option>
        </select>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <label className={styles.label}>Agent:</label>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="agent-selector">
        Choose Agent:
      </label>
      <select
        id="agent-selector"
        className={styles.select}
        value={selectedAgentId || ""}
        onChange={handleSelectChange}
        disabled={disabled}
      >
        <option value="">Select an agent...</option>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name} ({agent.model})
          </option>
        ))}
      </select>

      {selectedAgentId && (
        <div className={styles.agentInfo}>
          {(() => {
            const agent = agents.find((a) => a.id === selectedAgentId);
            if (!agent) return null;

            return (
              <div className={styles.details}>
                <div className={styles.agentName}>{agent.name}</div>
                <div className={styles.agentModel}>Model: {agent.model}</div>
                {agent.description && (
                  <div className={styles.agentDescription}>
                    {agent.description}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
