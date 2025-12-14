import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useMsalAuthentication,
} from "@azure/msal-react";
import { Spinner } from "@fluentui/react-components";
import { useAppState } from "./hooks/useAppState";
import { InteractionType } from "@azure/msal-browser";
import { ErrorBoundary } from "./components/core/ErrorBoundary";
import { AgentPreview } from "./components/AgentPreview";
import { loginRequest } from "./config/authConfig";
import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import type { IAgentMetadata } from "./types/chat";
import "./App.css";

export interface ChatInterfaceRef {
  clearChat: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
}

function App() {
  // This hook handles authentication automatically - redirects if not authenticated
  useMsalAuthentication(InteractionType.Redirect, loginRequest);
  const { auth, chat, dispatch } = useAppState();
  const { getAccessToken } = useAuth();
  const [agentMetadata, setAgentMetadata] = useState<IAgentMetadata | null>(
    null
  );
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);

  // Agent selection handler
  const handleAgentSelect = async (agentId: string | null) => {
    console.log(`[App v2] handleAgentSelect called with agentId:`, agentId);
    dispatch({ type: "CHAT_SELECT_AGENT", agentId });
    console.log(`[App v2] Dispatched CHAT_SELECT_AGENT, current state:`, {
      previousAgentId: chat.selectedAgentId,
      newAgentId: agentId,
    });

    // Clear existing conversation when switching agents
    if (agentId !== chat.selectedAgentId) {
      dispatch({ type: "CHAT_CLEAR" });
    }

    // Update agent metadata when agent is selected
    if (agentId && auth.status === "authenticated") {
      try {
        const token = await getAccessToken();
        const apiUrl = import.meta.env.VITE_API_URL || "/api";

        const response = await fetch(`${apiUrl}/agents/${agentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const agentData = await response.json();
          setAgentMetadata({
            id: agentData.id,
            object: "agent",
            createdAt: agentData.created_at || Date.now() / 1000,
            name: agentData.name || "Azure AI Agent",
            description: agentData.description || "",
            model: agentData.model || "gpt-4o-mini",
            metadata: { logo: "Avatar_Default.svg" },
          });
          document.title = agentData.name
            ? `${agentData.name} - Azure AI Agent`
            : "Azure AI Agent";
        }
      } catch (error) {
        console.error("Error fetching agent details:", error);
      }
    } else {
      // Reset to default when no agent selected
      setAgentMetadata({
        id: "agent-selector",
        object: "agent",
        createdAt: Date.now() / 1000,
        name: "Azure AI Agent",
        description: "Choose an agent to get started",
        model: "gpt-4o-mini",
        metadata: { logo: "Avatar_Default.svg" },
      });
      document.title = "Azure AI Agent";
    }
  };

  useEffect(() => {
    const fetchDefaultAgentMetadata = async () => {
      if (auth.status !== "authenticated") return;

      try {
        // Use fallback agent metadata for now - AgentSelector will handle the actual agent selection
        setAgentMetadata({
          id: "agent-selector",
          object: "agent",
          createdAt: Date.now() / 1000,
          name: "Azure AI Agent",
          description: "Choose an agent to get started",
          model: "gpt-4o-mini",
          metadata: { logo: "Avatar_Default.svg" },
        });
        document.title = "Azure AI Agent";
      } catch (error) {
        console.error("Error setting up agent metadata:", error);
        // Fallback data keeps UI functional on error
        setAgentMetadata({
          id: "fallback-agent",
          object: "agent",
          createdAt: Date.now() / 1000,
          name: "Azure AI Agent",
          description:
            "Your intelligent conversational partner powered by Azure AI",
          model: "gpt-4o-mini",
          metadata: { logo: "Avatar_Default.svg" },
        });
        document.title = "Azure AI Agent";
      } finally {
        setIsLoadingAgent(false);
      }
    };

    fetchDefaultAgentMetadata();
  }, [auth.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ErrorBoundary>
      {auth.status === "initializing" || isLoadingAgent ? (
        <div
          className="app-container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <Spinner size="large" />
          <p style={{ margin: 0 }}>
            {auth.status === "initializing"
              ? "Preparing your session..."
              : "Loading agent..."}
          </p>
        </div>
      ) : (
        <>
          <AuthenticatedTemplate>
            {agentMetadata && (
              <div className="app-container">
                <AgentPreview
                  agentId={agentMetadata.id}
                  agentName={agentMetadata.name}
                  agentDescription={agentMetadata.description || undefined}
                  agentLogo={agentMetadata.metadata?.logo}
                  selectedAgentId={chat.selectedAgentId}
                  onAgentSelect={handleAgentSelect}
                />
              </div>
            )}
          </AuthenticatedTemplate>
          <UnauthenticatedTemplate>
            <div
              className="app-container"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
              }}
            >
              <p>Signing in...</p>
            </div>
          </UnauthenticatedTemplate>
        </>
      )}
    </ErrorBoundary>
  );
}

export default App;
