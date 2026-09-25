using Microsoft.Data.SqlClient;

namespace PortalLite.Api.Data;

internal sealed record CustomerSummary(string Id, string CompanyName, string? City, string? Country)
{
    public static CustomerSummary Map(SqlDataReader reader) => new(
        reader.GetString(reader.GetOrdinal("Id")),
        reader.GetString(reader.GetOrdinal("CompanyName")),
        reader.IsDBNull(reader.GetOrdinal("City")) ? null : reader.GetString(reader.GetOrdinal("City")),
        reader.IsDBNull(reader.GetOrdinal("Country")) ? null : reader.GetString(reader.GetOrdinal("Country")));
}

internal sealed record CustomerProfile(
    string CompanyName,
    string? ContactName,
    string? Address,
    string? City,
    string? Region,
    string? PostalCode,
    string? Country,
    string? Phone,
    string? Fax)
{
    public static CustomerProfile Map(SqlDataReader reader) => new(
        reader.GetString(reader.GetOrdinal("CompanyName")),
        reader.IsDBNull(reader.GetOrdinal("ContactName")) ? null : reader.GetString(reader.GetOrdinal("ContactName")),
        reader.IsDBNull(reader.GetOrdinal("Address")) ? null : reader.GetString(reader.GetOrdinal("Address")),
        reader.IsDBNull(reader.GetOrdinal("City")) ? null : reader.GetString(reader.GetOrdinal("City")),
        reader.IsDBNull(reader.GetOrdinal("Region")) ? null : reader.GetString(reader.GetOrdinal("Region")),
        reader.IsDBNull(reader.GetOrdinal("PostalCode")) ? null : reader.GetString(reader.GetOrdinal("PostalCode")),
        reader.IsDBNull(reader.GetOrdinal("Country")) ? null : reader.GetString(reader.GetOrdinal("Country")),
        reader.IsDBNull(reader.GetOrdinal("Phone")) ? null : reader.GetString(reader.GetOrdinal("Phone")),
        reader.IsDBNull(reader.GetOrdinal("Fax")) ? null : reader.GetString(reader.GetOrdinal("Fax")));
}

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

    public const string GetProfile = """
        SELECT
            CompanyName AS CompanyName,
            ContactName AS ContactName,
            Address     AS Address,
            City        AS City,
            Region      AS Region,
            PostalCode  AS PostalCode,
            Country     AS Country,
            Phone       AS Phone,
            Fax         AS Fax
        FROM dbo.Customers
        WHERE CustomerID = @customerId;
        """;

    // CompanyName is never written: the Account screen shows it read-only (P4 spec).
    public const string UpdateProfile = """
        UPDATE dbo.Customers
        SET ContactName = @contactName,
            Address     = @address,
            City        = @city,
            Region      = @region,
            PostalCode  = @postalCode,
            Country     = @country,
            Phone       = @phone,
            Fax         = @fax
        WHERE CustomerID = @customerId;
        """;
}
