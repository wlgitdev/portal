namespace PortalLite.Api.Data;

internal sealed record CustomerSummary(string Id, string CompanyName, string? City, string? Country);

// Mirrors db/portal-lite.sql, which is the standalone, hand-run copy used to
// verify P1's data and status derivation before any of this code existed.
internal static class CustomersQueries
{
    public const string Search = """
        SELECT TOP (20)
            CustomerID  AS Id,
            CompanyName AS CompanyName,
            City        AS City,
            Country     AS Country
        FROM dbo.Customers
        WHERE @search = N'' OR CompanyName LIKE N'%' + @search + N'%' OR CustomerID LIKE @search + N'%'
        ORDER BY CompanyName;
        """;
}
