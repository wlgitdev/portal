using Microsoft.Data.SqlClient;

namespace PortalLite.Api.Data;

internal sealed record OrderSummary(
    int Id,
    DateTime OrderedOn,
    DateTime? ShippedOn,
    DateTime DueOn,
    string Status,
    int ItemCount,
    decimal Total,
    string? ShipTo)
{
    public static OrderSummary Map(SqlDataReader reader) => new(
        reader.GetInt32(reader.GetOrdinal("Id")),
        reader.GetDateTime(reader.GetOrdinal("OrderedOn")),
        reader.IsDBNull(reader.GetOrdinal("ShippedOn")) ? null : reader.GetDateTime(reader.GetOrdinal("ShippedOn")),
        reader.GetDateTime(reader.GetOrdinal("DueOn")),
        reader.GetString(reader.GetOrdinal("Status")),
        reader.GetInt32(reader.GetOrdinal("ItemCount")),
        reader.GetDecimal(reader.GetOrdinal("Total")),
        reader.IsDBNull(reader.GetOrdinal("ShipTo")) ? null : reader.GetString(reader.GetOrdinal("ShipTo")));
}

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
    decimal Total)
{
    public static OrderHeaderRow Map(SqlDataReader reader) => new(
        reader.GetInt32(reader.GetOrdinal("Id")),
        reader.GetDateTime(reader.GetOrdinal("OrderedOn")),
        reader.IsDBNull(reader.GetOrdinal("ShippedOn")) ? null : reader.GetDateTime(reader.GetOrdinal("ShippedOn")),
        reader.GetDateTime(reader.GetOrdinal("DueOn")),
        reader.GetString(reader.GetOrdinal("Status")),
        reader.IsDBNull(reader.GetOrdinal("ShipToName")) ? null : reader.GetString(reader.GetOrdinal("ShipToName")),
        reader.IsDBNull(reader.GetOrdinal("ShipToAddress")) ? null : reader.GetString(reader.GetOrdinal("ShipToAddress")),
        reader.IsDBNull(reader.GetOrdinal("ShipToCity")) ? null : reader.GetString(reader.GetOrdinal("ShipToCity")),
        reader.IsDBNull(reader.GetOrdinal("ShipToRegion")) ? null : reader.GetString(reader.GetOrdinal("ShipToRegion")),
        reader.IsDBNull(reader.GetOrdinal("ShipToPostalCode")) ? null : reader.GetString(reader.GetOrdinal("ShipToPostalCode")),
        reader.IsDBNull(reader.GetOrdinal("ShipToCountry")) ? null : reader.GetString(reader.GetOrdinal("ShipToCountry")),
        reader.GetDecimal(reader.GetOrdinal("Freight")),
        reader.GetDecimal(reader.GetOrdinal("Total")));
}

internal sealed record OrderLine(
    int ProductId,
    string ProductName,
    decimal UnitPrice,
    short Quantity,
    float Discount,
    decimal LineTotal)
{
    public static OrderLine Map(SqlDataReader reader) => new(
        reader.GetInt32(reader.GetOrdinal("ProductId")),
        reader.GetString(reader.GetOrdinal("ProductName")),
        reader.GetDecimal(reader.GetOrdinal("UnitPrice")),
        reader.GetInt16(reader.GetOrdinal("Quantity")),
        reader.GetFloat(reader.GetOrdinal("Discount")),
        reader.GetDecimal(reader.GetOrdinal("LineTotal")));
}

// Every line of one customer's orders, across all of them (item 6's master-detail
// and preview rows, item 9's Top 5 products) — unlike OrderLine, which is scoped
// to a single already-known order.
internal sealed record OrderLineRow(
    int OrderId,
    int ProductId,
    string ProductName,
    string CategoryName,
    decimal UnitPrice,
    short Quantity,
    float Discount,
    decimal LineTotal)
{
    public static OrderLineRow Map(SqlDataReader reader) => new(
        reader.GetInt32(reader.GetOrdinal("OrderId")),
        reader.GetInt32(reader.GetOrdinal("ProductId")),
        reader.GetString(reader.GetOrdinal("ProductName")),
        reader.GetString(reader.GetOrdinal("CategoryName")),
        reader.GetDecimal(reader.GetOrdinal("UnitPrice")),
        reader.GetInt16(reader.GetOrdinal("Quantity")),
        reader.GetFloat(reader.GetOrdinal("Discount")),
        reader.GetDecimal(reader.GetOrdinal("LineTotal")));
}

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

    // Same rounded-per-line total as DetailLines, joined out to every one of the
    // customer's orders rather than one order at a time.
    public const string LinesForCustomer = """
        SELECT
            od.OrderID AS OrderId,
            od.ProductID AS ProductId,
            p.ProductName AS ProductName,
            c.CategoryName AS CategoryName,
            od.UnitPrice AS UnitPrice,
            od.Quantity AS Quantity,
            od.Discount AS Discount,
            CAST(od.UnitPrice * od.Quantity * (1 - od.Discount) AS decimal(19,2)) AS LineTotal
        FROM dbo.[Order Details] od
        JOIN dbo.Orders o ON o.OrderID = od.OrderID
        JOIN dbo.Products p ON p.ProductID = od.ProductID
        JOIN dbo.Categories c ON c.CategoryID = p.CategoryID
        WHERE o.CustomerID = @customerId
        ORDER BY od.OrderID DESC, p.ProductName;
        """;
}
