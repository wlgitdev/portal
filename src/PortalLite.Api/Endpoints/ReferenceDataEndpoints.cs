using PortalLite.Api.Data;

namespace PortalLite.Api.Endpoints;

internal static class ReferenceDataEndpoints
{
    public static void MapReferenceDataEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/shippers", async (SqlConnectionFactory connections) =>
        {
            using var connection = connections.Create();
            var shippers = await SqlQuery.ListAsync(connection, ReferenceDataQueries.Shippers, [], Shipper.Map);
            return Results.Ok(shippers);
        });

        app.MapGet("/api/products", async (SqlConnectionFactory connections) =>
        {
            using var connection = connections.Create();
            var products = await SqlQuery.ListAsync(connection, ReferenceDataQueries.Products, [], Product.Map);
            return Results.Ok(products);
        });
    }
}
