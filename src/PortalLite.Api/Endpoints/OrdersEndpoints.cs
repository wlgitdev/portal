using System.Data;
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
        var orders = app.MapGroup("/api/orders").AddEndpointFilter<DemoCustomerFilter>();

        orders.MapGet("", async (HttpContext http, SqlConnectionFactory connections, DateShift dateShift) =>
        {
            var customerId = http.Request.Headers["X-Demo-Customer"].ToString();
            using var connection = connections.Create();
            var summaries = await SqlQuery.ListAsync(
                connection,
                OrdersQueries.List,
                [
                    new SqlParam("customerId", customerId, SqlDbType.NChar),
                    new SqlParam("shift", dateShift.Months),
                    new SqlParam("today", dateShift.Today, SqlDbType.DateTime),
                ],
                OrderSummary.Map);
            return Results.Ok(summaries);
        });

        orders.MapGet("/{id:int}", async (int id, HttpContext http, SqlConnectionFactory connections, DateShift dateShift) =>
        {
            var customerId = http.Request.Headers["X-Demo-Customer"].ToString();
            using var connection = connections.Create();

            var header = await SqlQuery.SingleOrDefaultAsync(
                connection,
                OrdersQueries.DetailHeader,
                [
                    new SqlParam("orderId", id),
                    new SqlParam("customerId", customerId, SqlDbType.NChar),
                    new SqlParam("shift", dateShift.Months),
                    new SqlParam("today", dateShift.Today, SqlDbType.DateTime),
                ],
                OrderHeaderRow.Map);
            if (header is null)
            {
                return Results.NotFound();
            }

            var lines = await SqlQuery.ListAsync(
                connection, OrdersQueries.DetailLines, [new SqlParam("orderId", id)], OrderLine.Map);

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
                lines));
        });

        var orderLines = app.MapGroup("/api/order-lines").AddEndpointFilter<DemoCustomerFilter>();

        orderLines.MapGet("", async (HttpContext http, SqlConnectionFactory connections) =>
        {
            var customerId = http.Request.Headers["X-Demo-Customer"].ToString();
            using var connection = connections.Create();
            var lines = await SqlQuery.ListAsync(
                connection,
                OrdersQueries.LinesForCustomer,
                [new SqlParam("customerId", customerId, SqlDbType.NChar)],
                OrderLineRow.Map);
            return Results.Ok(lines);
        });
    }
}
