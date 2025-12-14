using Azure.AI.Projects;
using Azure.Core;
using Azure.Identity;
using WebApp.Api.Models;

namespace WebApp.Api.Services;

public class AgentManagementService : IDisposable
{
    private readonly AIProjectClient _projectClient;
    private readonly ILogger<AgentManagementService> _logger;
    private bool _disposed = false;

    public AgentManagementService(
        IConfiguration configuration,
        ILogger<AgentManagementService> logger)
    {
        _logger = logger;

        // Get Azure AI Agent Service configuration
        var endpoint = configuration["AI_AGENT_ENDPOINT"]
            ?? throw new InvalidOperationException("AI_AGENT_ENDPOINT is not configured");

        _logger.LogInformation("Initializing Agent Management Service for endpoint: {Endpoint}", endpoint);

        // Use same credential logic as AzureAIAgentService
        TokenCredential credential;
        var environment = configuration["ASPNETCORE_ENVIRONMENT"] ?? "Production";

        if (environment == "Development")
        {
            _logger.LogInformation("Development environment: Using ChainedTokenCredential (AzureCli -> AzureDeveloperCli)");
            credential = new ChainedTokenCredential(
                new AzureCliCredential(),
                new AzureDeveloperCliCredential()
            );
        }
        else
        {
            _logger.LogInformation("Production environment: Using ManagedIdentityCredential (system-assigned)");
            credential = new ManagedIdentityCredential();
        }

        try
        {
            _projectClient = new AIProjectClient(new Uri(endpoint), credential);
            _logger.LogInformation("Agent Management Service client initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Agent Management Service client");
            throw;
        }
    }

    /// <summary>
    /// Get all available agents in the AI Foundry project (simplified version)
    /// </summary>
    public async Task<IEnumerable<AgentMetadataResponse>> GetAvailableAgentsAsync(CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        
        try
        {
            _logger.LogInformation("Retrieving available agents from AI Foundry project");

            var agents = new List<AgentMetadataResponse>();
            
            // Get all agents from the project (using pattern from existing code)
            await foreach (var agentRecord in _projectClient.Agents.GetAgentsAsync(cancellationToken: cancellationToken))
            {
                var latestVersion = agentRecord.Versions.Latest;
                
                // Use the agent record's base ID (without version) as the primary identifier
                var agentMetadata = new AgentMetadataResponse
                {
                    Id = agentRecord.Id, // Use base agent ID instead of version ID
                    Object = "agent",
                    CreatedAt = latestVersion.CreatedAt.ToUnixTimeSeconds(),
                    Name = latestVersion.Name ?? "AI Assistant",
                    Description = latestVersion.Description ?? string.Empty,
                    Model = string.Empty, // Will be filled if available
                    Instructions = string.Empty, // Will be filled if available
                    Metadata = latestVersion.Metadata?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value) ?? new Dictionary<string, string>()
                };
                
                agents.Add(agentMetadata);
                
                _logger.LogInformation("Found agent: {AgentId} - {AgentName}", agentRecord.Id, latestVersion.Name);
            }

            _logger.LogInformation("Retrieved {AgentCount} agents", agents.Count);
            return agents;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Get agents operation was cancelled");
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve available agents");
            throw;
        }
    }

    /// <summary>
    /// Get specific agent metadata by ID (simplified version)
    /// </summary>
    public async Task<AgentMetadataResponse> GetAgentByIdAsync(string agentId, CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        
        try
        {
            _logger.LogInformation("Retrieving agent metadata for: {AgentId}", agentId);

            var agentRecord = await _projectClient.Agents.GetAgentAsync(agentId, cancellationToken);
            var latestVersion = agentRecord.Value.Versions.Latest;

            var agentMetadata = new AgentMetadataResponse
            {
                Id = agentRecord.Value.Id, // Use base agent ID instead of version ID
                Object = "agent",
                CreatedAt = latestVersion.CreatedAt.ToUnixTimeSeconds(),
                Name = latestVersion.Name ?? "AI Assistant",
                Description = latestVersion.Description ?? string.Empty,
                Model = string.Empty, // Simplified for now
                Instructions = string.Empty, // Simplified for now
                Metadata = latestVersion.Metadata?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value) ?? new Dictionary<string, string>()
            };

            _logger.LogInformation("Retrieved agent metadata for: {AgentId}", agentId);
            return agentMetadata;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Get agent operation was cancelled");
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve agent metadata for: {AgentId}", agentId);
            throw;
        }
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            // AIProjectClient doesn't implement IDisposable directly
            _disposed = true;
            _logger.LogInformation("AgentManagementService disposed");
        }
    }
}