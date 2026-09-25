using Microsoft.Data.SqlClient;

namespace PortalLite.Api.Data;

// Northwind reference data: not scoped to a customer, so these endpoints
// carry no DemoCustomerFilter.
internal sealed record Shipper(int Id, string CompanyName, string? Phone)
{
    public static Shipper Map(SqlDataReader reader) => new(
        reader.GetInt32(reader.GetOrdinal("Id")),
        reader.GetString(reader.GetOrdinal("CompanyName")),
        reader.IsDBNull(reader.GetOrdinal("Phone")) ? null : reader.GetString(reader.GetOrdinal("Phone")));
}

internal sealed record Product(int Id, string Name, string CategoryName, bool Discontinued)
{
    public static Product Map(SqlDataReader reader) => new(
        reader.GetInt32(reader.GetOrdinal("Id")),
        reader.GetString(reader.GetOrdinal("Name")),
        reader.GetString(reader.GetOrdinal("CategoryName")),
        reader.GetBoolean(reader.GetOrdinal("Discontinued")));
}

internal static class ReferenceDataQueries
{
    public const string Shippers = """
        SELECT
            ShipperID   AS Id,
            CompanyName AS CompanyName,
            Phone       AS Phone
        FROM dbo.Shippers
        ORDER BY CompanyName;
        """;

    public const string Products = """
        SELECT
            p.ProductID    AS Id,
            p.ProductName  AS Name,
            c.CategoryName AS CategoryName,
            p.Discontinued AS Discontinued
        FROM dbo.Products p
        JOIN dbo.Categories c ON c.CategoryID = p.CategoryID
        ORDER BY p.ProductName;
        """;
}
