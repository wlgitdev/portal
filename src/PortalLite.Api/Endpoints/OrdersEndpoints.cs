using Dapper;
using PortalLite.Api.Data;

namespace PortalLite.Api.Endpoints;

internal sealed record ShipToAddress(
    string? Name, string? Address, string? City, string? Region, string? PostalCode, string? Country);

internal sealed record OrderDetail(
    int Id,
    DateTime OrderedOn,
    DateTime? ShippedOn,
    DateTime DueOn,
    string Status,
    ShipToAddress ShipTo,
    decimal Freight,
    decimal Total,
    IReadOnlyList<OrderLine> Lines);

internal static class OrdersEndpoints
{
    public static void MapOrdersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders").AddEndpointFilter<DemoCustomerFilter>();

        group.MapGet("", async (HttpContext http, SqlConnectionFactory connections, DateShift dateShift) =>
        {
            var customerId = http.Request.Headers["X-Demo-Customer"].ToString();
            using var connection = connections.Create();
            var orders = await connection.QueryAsync<OrderSummary>(
                OrdersQueries.List, new { customerId, shift = dateShift.Months, today = dateShift.Today });
            return Results.Ok(orders);
        });

        group.MapGet("/{id:int}", async (int id, HttpContext http, SqlConnectionFactory connections, DateShift dateShift) =>
        {
            var customerId = http.Request.Headers["X-Demo-Customer"].ToString();
            using var connection = connections.Create();

            var header = await connection.QuerySingleOrDefaultAsync<OrderHeaderRow>(
                OrdersQueries.DetailHeader,
                new { orderId = id, customerId, shift = dateShift.Months, today = dateShift.Today });
            if (header is null)
            {
                return Results.NotFound();
            }

            var lines = await connection.QueryAsync<OrderLine>(OrdersQueries.DetailLines, new { orderId = id });

            return Results.Ok(new OrderDetail(
                header.Id,
                header.OrderedOn,
                header.ShippedOn,
                header.DueOn,
                header.Status,
                new ShipToAddress(header.ShipToName, header.ShipToAddress, header.ShipToCity,
                    header.ShipToRegion, header.ShipToPostalCode, header.ShipToCountry),
                header.Freight,
                header.Total,
                lines.AsList()));
        });
    }
}
