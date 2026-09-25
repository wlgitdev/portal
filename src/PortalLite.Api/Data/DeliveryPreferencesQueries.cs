using Microsoft.Data.SqlClient;

namespace PortalLite.Api.Data;

internal sealed record SiteMapPayload(string Name, string Type, string DataUrl);

internal sealed record DeliveryPreferences(
    int? ShipperId,
    IReadOnlyList<int> DeliveryDays,
    string WindowFrom,
    string WindowTo,
    string Unloading,
    int MaxPallets,
    bool Chilled,
    int? MaxTempC,
    string? ClosedFrom,
    string? ClosedTo,
    IReadOnlyList<string> NotifyEmails,
    IReadOnlyList<int> StandingProductIds,
    string InvoiceFormat,
    string Instructions,
    SiteMapPayload? SiteMap)
{
    public static readonly DeliveryPreferences Defaults = new(
        ShipperId: null,
        DeliveryDays: [1, 2, 3, 4, 5],
        WindowFrom: "08:00",
        WindowTo: "17:00",
        Unloading: "dock",
        MaxPallets: 6,
        Chilled: false,
        MaxTempC: null,
        ClosedFrom: null,
        ClosedTo: null,
        NotifyEmails: [],
        StandingProductIds: [],
        InvoiceFormat: "pdf",
        Instructions: "",
        SiteMap: null);
}

// The parent row only — DeliveryDays/NotifyEmails/StandingProductIds are separate
// child-table queries (see below), assembled with this into a DeliveryPreferences
// by the endpoint.
internal sealed record PreferencesRow(
    int? ShipperId,
    TimeSpan WindowFrom,
    TimeSpan WindowTo,
    string Unloading,
    byte MaxPallets,
    bool Chilled,
    short? MaxTempC,
    DateTime? ClosedFrom,
    DateTime? ClosedTo,
    string InvoiceFormat,
    string Instructions,
    string? SiteMapName,
    string? SiteMapType,
    byte[]? SiteMap)
{
    public static PreferencesRow Map(SqlDataReader reader) => new(
        reader.IsDBNull(reader.GetOrdinal("ShipperID")) ? null : reader.GetInt32(reader.GetOrdinal("ShipperID")),
        reader.GetTimeSpan(reader.GetOrdinal("WindowFrom")),
        reader.GetTimeSpan(reader.GetOrdinal("WindowTo")),
        reader.GetString(reader.GetOrdinal("Unloading")),
        reader.GetByte(reader.GetOrdinal("MaxPallets")),
        reader.GetBoolean(reader.GetOrdinal("Chilled")),
        reader.IsDBNull(reader.GetOrdinal("MaxTempC")) ? null : reader.GetInt16(reader.GetOrdinal("MaxTempC")),
        reader.IsDBNull(reader.GetOrdinal("ClosedFrom")) ? null : reader.GetDateTime(reader.GetOrdinal("ClosedFrom")),
        reader.IsDBNull(reader.GetOrdinal("ClosedTo")) ? null : reader.GetDateTime(reader.GetOrdinal("ClosedTo")),
        reader.GetString(reader.GetOrdinal("InvoiceFormat")),
        reader.GetString(reader.GetOrdinal("Instructions")),
        reader.IsDBNull(reader.GetOrdinal("SiteMapName")) ? null : reader.GetString(reader.GetOrdinal("SiteMapName")),
        reader.IsDBNull(reader.GetOrdinal("SiteMapType")) ? null : reader.GetString(reader.GetOrdinal("SiteMapType")),
        reader.IsDBNull(reader.GetOrdinal("SiteMap")) ? null : (byte[])reader["SiteMap"]);
}

// Mirrors db/portal-lite-schema.sql. PUT replaces a customer's rows wholesale
// (delete then insert) rather than diffing — the row counts here are tiny
// (<=6 days, <=5 emails, <=10 products), so there's nothing to optimise.
internal static class DeliveryPreferencesQueries
{
    public const string GetPreferences = """
        SELECT ShipperID, WindowFrom, WindowTo, Unloading, MaxPallets, Chilled, MaxTempC,
               ClosedFrom, ClosedTo, InvoiceFormat, Instructions, SiteMapName, SiteMapType, SiteMap
        FROM dbo.PortalDeliveryPreferences
        WHERE CustomerID = @customerId;
        """;

    public const string GetDeliveryDays = """
        SELECT DayOfWeek FROM dbo.PortalDeliveryDays WHERE CustomerID = @customerId ORDER BY DayOfWeek;
        """;

    public const string GetNotifyEmails = """
        SELECT Email FROM dbo.PortalNotifyEmails WHERE CustomerID = @customerId ORDER BY Email;
        """;

    public const string GetStandingProducts = """
        SELECT ProductID FROM dbo.PortalStandingProducts WHERE CustomerID = @customerId ORDER BY ProductID;
        """;

    public const string DeletePreferences = "DELETE FROM dbo.PortalDeliveryPreferences WHERE CustomerID = @customerId;";
    public const string DeleteDeliveryDays = "DELETE FROM dbo.PortalDeliveryDays WHERE CustomerID = @customerId;";
    public const string DeleteNotifyEmails = "DELETE FROM dbo.PortalNotifyEmails WHERE CustomerID = @customerId;";
    public const string DeleteStandingProducts = "DELETE FROM dbo.PortalStandingProducts WHERE CustomerID = @customerId;";

    public const string InsertPreferences = """
        INSERT INTO dbo.PortalDeliveryPreferences
            (CustomerID, ShipperID, WindowFrom, WindowTo, Unloading, MaxPallets, Chilled, MaxTempC,
             ClosedFrom, ClosedTo, InvoiceFormat, Instructions, SiteMapName, SiteMapType, SiteMap)
        VALUES
            (@customerId, @shipperId, @windowFrom, @windowTo, @unloading, @maxPallets, @chilled, @maxTempC,
             @closedFrom, @closedTo, @invoiceFormat, @instructions, @siteMapName, @siteMapType, @siteMap);
        """;

    public const string InsertDeliveryDay =
        "INSERT INTO dbo.PortalDeliveryDays (CustomerID, DayOfWeek) VALUES (@customerId, @day);";
    public const string InsertNotifyEmail =
        "INSERT INTO dbo.PortalNotifyEmails (CustomerID, Email) VALUES (@customerId, @email);";
    public const string InsertStandingProduct =
        "INSERT INTO dbo.PortalStandingProducts (CustomerID, ProductID) VALUES (@customerId, @productId);";
}
