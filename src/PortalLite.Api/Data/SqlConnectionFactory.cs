using Microsoft.Data.SqlClient;

namespace PortalLite.Api.Data;

internal sealed class SqlConnectionFactory
{
    private readonly string _connectionString;

    public SqlConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("Northwind")
            ?? throw new InvalidOperationException(
                "Missing ConnectionStrings:Northwind. Set it with: " +
                "dotnet user-secrets set ConnectionStrings:Northwind \"...\"");
    }

    public SqlConnection Create() => new(_connectionString);
}
