using PortalLite.Api.Data;

namespace PortalLite.Api.Endpoints;

internal static class CustomersEndpoints
{
    public static void MapCustomersEndpoints(this IEndpointRouteBuilder app)
    {
        // Anonymous: this is the one endpoint a visitor can call before choosing who they are.
        app.MapGet("/api/customers", async (string? search, SqlConnectionFactory connections) =>
        {
            using var connection = connections.Create();
            var customers = await SqlQuery.ListAsync(
                connection, CustomersQueries.Search, [new SqlParam("search", search ?? "")], CustomerSummary.Map);
            return Results.Ok(customers);
        });
    }
}
