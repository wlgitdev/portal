namespace PortalLite.Api.Data;

internal sealed record OrderSummary(
    int Id,
    DateTime OrderedOn,
    DateTime? ShippedOn,
    DateTime DueOn,
    string Status,
    int ItemCount,
    decimal Total,
    string? ShipTo);

internal sealed record OrderHeaderRow(
    int Id,
    DateTime OrderedOn,
    DateTime? ShippedOn,
    DateTime DueOn,
    string Status,
    string? ShipToName,
    string? ShipToAddress,
    string? ShipToCity,
    string? ShipToRegion,
    string? ShipToPostalCode,
    string? ShipToCountry,
    decimal Freight,
    decimal Total);

internal sealed record OrderLine(
    int ProductId,
    string ProductName,
    decimal UnitPrice,
    short Quantity,
    float Discount,
    decimal LineTotal);

// Mirrors db/portal-lite.sql, which is the standalone, hand-run copy used to
// verify P1's data and status derivation before any of this code existed.
// Status: ShippedDate set -> Shipped; else shifted RequiredDate >= @today ->
// Awaiting dispatch; else Late. Total is the line-item sum only (no
// freight). Each line is rounded to 2dp before summing (not after), so a
// total always equals the sum of the same rounded amounts shown per line —
// Discount is `real`, imprecise enough that rounding the aggregate
// independently can land a penny off from summing already-rounded lines.
internal static class OrdersQueries
{
    public const string List = """
        SELECT
            o.OrderID AS Id,
            DATEADD(month, @shift, o.OrderDate)     AS OrderedOn,
            DATEADD(month, @shift, o.ShippedDate)   AS ShippedOn,
            DATEADD(month, @shift, o.RequiredDate)  AS DueOn,
            CASE
                WHEN o.ShippedDate IS NOT NULL THEN N'Shipped'
                WHEN DATEADD(month, @shift, o.RequiredDate) >= @today THEN N'Awaiting dispatch'
                ELSE N'Late'
            END AS Status,
            lines.itemCount AS ItemCount,
            lines.total AS Total,
            o.ShipName AS ShipTo
        FROM dbo.Orders o
        CROSS APPLY (
            SELECT COUNT(*) AS itemCount, SUM(CAST(od.UnitPrice * od.Quantity * (1 - od.Discount) AS decimal(19,2))) AS total
            FROM dbo.[Order Details] od
            WHERE od.OrderID = o.OrderID
        ) lines
        WHERE o.CustomerID = @customerId
        ORDER BY o.OrderDate DESC;
        """;

    // Zero rows means the order doesn't exist or isn't this customer's -> the endpoint returns 404.
    // Total is deliberately the same line-sum as List.Total (not +freight), so the drawer's total
    // always matches both the row it was opened from and its own line items; freight is returned
    // separately and shown as its own figure, not folded into total.
    public const string DetailHeader = """
        SELECT
            o.OrderID AS Id,
            DATEADD(month, @shift, o.OrderDate)     AS OrderedOn,
            DATEADD(month, @shift, o.ShippedDate)   AS ShippedOn,
            DATEADD(month, @shift, o.RequiredDate)  AS DueOn,
            CASE
                WHEN o.ShippedDate IS NOT NULL THEN N'Shipped'
                WHEN DATEADD(month, @shift, o.RequiredDate) >= @today THEN N'Awaiting dispatch'
                ELSE N'Late'
            END AS Status,
            o.ShipName AS ShipToName,
            o.ShipAddress AS ShipToAddress,
            o.ShipCity AS ShipToCity,
            o.ShipRegion AS ShipToRegion,
            o.ShipPostalCode AS ShipToPostalCode,
            o.ShipCountry AS ShipToCountry,
            o.Freight AS Freight,
            lines.total AS Total
        FROM dbo.Orders o
        CROSS APPLY (
            SELECT SUM(CAST(od.UnitPrice * od.Quantity * (1 - od.Discount) AS decimal(19,2))) AS total
            FROM dbo.[Order Details] od
            WHERE od.OrderID = o.OrderID
        ) lines
        WHERE o.OrderID = @orderId AND o.CustomerID = @customerId;
        """;

    public const string DetailLines = """
        SELECT
            od.ProductID AS ProductId,
            p.ProductName AS ProductName,
            od.UnitPrice AS UnitPrice,
            od.Quantity AS Quantity,
            od.Discount AS Discount,
            CAST(od.UnitPrice * od.Quantity * (1 - od.Discount) AS decimal(19,2)) AS LineTotal
        FROM dbo.[Order Details] od
        JOIN dbo.Products p ON p.ProductID = od.ProductID
        WHERE od.OrderID = @orderId
        ORDER BY p.ProductName;
        """;
}
