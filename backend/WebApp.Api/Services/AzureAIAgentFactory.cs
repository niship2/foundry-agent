using Azure.AI.Projects;
using Azure.Core;
using Azure.Identity;
using System.Collections.Concurrent;
using WebApp.Api.Models;

namespace WebApp.Api.Services;

public interface IAzureAIAgentFactory
{
    AzureAIAgentService CreateAgent(string agentId);
    void ReleaseAgent(string agentId);
}

public class AzureAIAgentFactory : IAzureAIAgentFactory, IDisposable
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<AzureAIAgentService> _agentLogger;
    private readonly ILogger<AzureAIAgentFactory> _factoryLogger;
    private readonly ConcurrentDictionary<string, AzureAIAgentService> _agents = new();
    private bool _disposed = false;

    public AzureAIAgentFactory(
        IConfiguration configuration,
        ILogger<AzureAIAgentService> agentLogger,
        ILogger<AzureAIAgentFactory> factoryLogger)
    {
        _configuration = configuration;
        _agentLogger = agentLogger;
        _factoryLogger = factoryLogger;
    }

    public AzureAIAgentService CreateAgent(string agentId)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        return _agents.GetOrAdd(agentId, id =>
        {
            _factoryLogger.LogInformation("Creating new agent service instance for: {AgentId}", id);
            
            // Create a new configuration that overrides the agent ID
            var configBuilder = new ConfigurationBuilder();
            
            // Copy all existing configuration
            foreach (var kvp in _configuration.AsEnumerable())
            {
                if (kvp.Value != null)
                {
                    configBuilder.AddInMemoryCollection(new[] { kvp });
                }
            }
            
            // Override the AI_AGENT_ID
            configBuilder.AddInMemoryCollection(new[]
            {
                new KeyValuePair<string, string?>("AI_AGENT_ID", id)
            });

            var agentConfig = configBuilder.Build();
            
            return new AzureAIAgentService(agentConfig, _agentLogger);
        });
    }

    public void ReleaseAgent(string agentId)
    {
        if (_agents.TryRemove(agentId, out var agent))
        {
            _factoryLogger.LogInformation("Releasing agent service instance for: {AgentId}", agentId);
            agent.Dispose();
        }
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _factoryLogger.LogInformation("Disposing agent factory and all agent instances");
            
            foreach (var kvp in _agents)
            {
                kvp.Value.Dispose();
            }
            
            _agents.Clear();
            _disposed = true;
        }
    }
}