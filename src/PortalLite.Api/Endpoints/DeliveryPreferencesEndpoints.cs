using System.Data;
using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;
using PortalLite.Api.Data;

namespace PortalLite.Api.Endpoints;

internal static class DeliveryPreferencesEndpoints
{
    private static readonly HashSet<string> ValidUnloading = ["dock", "tail-lift", "by-hand"];
    private static readonly HashSet<string> ValidInvoiceFormat = ["pdf", "paper", "both"];
    private static readonly HashSet<string> ValidSiteMapTypes = ["image/png", "image/jpeg", "application/pdf"];
    private static readonly Regex EmailPattern = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);
    private const int MaxSiteMapBytes = 2 * 1024 * 1024;
    private const string TimeFormat = @"hh\:mm";
    private const string DateFormat = "yyyy-MM-dd";

    public static void MapDeliveryPreferencesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/me/delivery-preferences").AddEndpointFilter<DemoCustomerFilter>();

        group.MapGet("", async (HttpContext http, SqlConnectionFactory connections) =>
        {
            var customerId = http.Request.Headers["X-Demo-Customer"].ToString();
            using var connection = connections.Create();
            var idParam = new SqlParam("customerId", customerId, SqlDbType.NChar);

            var row = await SqlQuery.SingleOrDefaultAsync(
                connection, DeliveryPreferencesQueries.GetPreferences, [idParam], PreferencesRow.Map);
            if (row is null)
            {
                return Results.Ok(DeliveryPreferences.Defaults);
            }

            var days = await SqlQuery.ListAsync(
                connection, DeliveryPreferencesQueries.GetDeliveryDays, [idParam],
                r => (int)r.GetByte(r.GetOrdinal("DayOfWeek")));
            var emails = await SqlQuery.ListAsync(
                connection, DeliveryPreferencesQueries.GetNotifyEmails, [idParam],
                r => r.GetString(r.GetOrdinal("Email")));
            var products = await SqlQuery.ListAsync(
                connection, DeliveryPreferencesQueries.GetStandingProducts, [idParam],
                r => r.GetInt32(r.GetOrdinal("ProductID")));

            return Results.Ok(ToDto(row, days, emails, products));
        });

        group.MapPut("", async (DeliveryPreferences preferences, HttpContext http, SqlConnectionFactory connections) =>
        {
            var errors = Validate(preferences, out var parsed);
            if (errors is not null)
            {
                return Results.ValidationProblem(errors);
            }

            var customerId = http.Request.Headers["X-Demo-Customer"].ToString();
            var idParam = new SqlParam("customerId", customerId, SqlDbType.NChar);

            using var connection = connections.Create();
            await connection.OpenAsync();
            await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

            await SqlQuery.ExecuteAsync(connection, DeliveryPreferencesQueries.DeletePreferences, [idParam], transaction);
            await SqlQuery.ExecuteAsync(
                connection, DeliveryPreferencesQueries.InsertPreferences,
                [
                    idParam,
                    new SqlParam("shipperId", preferences.ShipperId),
                    new SqlParam("windowFrom", parsed.WindowFrom, SqlDbType.Time),
                    new SqlParam("windowTo", parsed.WindowTo, SqlDbType.Time),
                    new SqlParam("unloading", preferences.Unloading),
                    new SqlParam("maxPallets", preferences.MaxPallets, SqlDbType.TinyInt),
                    new SqlParam("chilled", preferences.Chilled),
                    new SqlParam("maxTempC", preferences.MaxTempC, SqlDbType.SmallInt),
                    new SqlParam("closedFrom", (object?)parsed.ClosedFrom ?? DBNull.Value, SqlDbType.Date),
                    new SqlParam("closedTo", (object?)parsed.ClosedTo ?? DBNull.Value, SqlDbType.Date),
                    new SqlParam("invoiceFormat", preferences.InvoiceFormat),
                    new SqlParam("instructions", preferences.Instructions),
                    new SqlParam("siteMapName", preferences.SiteMap?.Name),
                    new SqlParam("siteMapType", preferences.SiteMap?.Type),
                    new SqlParam("siteMap", (object?)parsed.SiteMapBytes ?? DBNull.Value, SqlDbType.VarBinary),
                ],
                transaction);

            await SqlQuery.ExecuteAsync(connection, DeliveryPreferencesQueries.DeleteDeliveryDays, [idParam], transaction);
            foreach (var day in preferences.DeliveryDays)
            {
                await SqlQuery.ExecuteAsync(
                    connection, DeliveryPreferencesQueries.InsertDeliveryDay,
                    [idParam, new SqlParam("day", (byte)day, SqlDbType.TinyInt)], transaction);
            }

            await SqlQuery.ExecuteAsync(connection, DeliveryPreferencesQueries.DeleteNotifyEmails, [idParam], transaction);
            foreach (var email in preferences.NotifyEmails)
            {
                await SqlQuery.ExecuteAsync(
                    connection, DeliveryPreferencesQueries.InsertNotifyEmail,
                    [idParam, new SqlParam("email", email)], transaction);
            }

            await SqlQuery.ExecuteAsync(connection, DeliveryPreferencesQueries.DeleteStandingProducts, [idParam], transaction);
            foreach (var productId in preferences.StandingProductIds)
            {
                await SqlQuery.ExecuteAsync(
                    connection, DeliveryPreferencesQueries.InsertStandingProduct,
                    [idParam, new SqlParam("productId", productId)], transaction);
            }

            await transaction.CommitAsync();
            return Results.Ok(preferences);
        });
    }

    private static DeliveryPreferences ToDto(
        PreferencesRow row, IReadOnlyList<int> days, IReadOnlyList<string> emails, IReadOnlyList<int> products) => new(
        row.ShipperId,
        days,
        row.WindowFrom.ToString(TimeFormat),
        row.WindowTo.ToString(TimeFormat),
        row.Unloading,
        row.MaxPallets,
        row.Chilled,
        row.MaxTempC,
        row.ClosedFrom?.ToString(DateFormat),
        row.ClosedTo?.ToString(DateFormat),
        emails,
        products,
        row.InvoiceFormat,
        row.Instructions,
        row.SiteMap is null ? null : new SiteMapPayload(
            row.SiteMapName!, row.SiteMapType!, $"data:{row.SiteMapType};base64,{Convert.ToBase64String(row.SiteMap)}"));

    private readonly record struct ParsedPreferences(
        TimeSpan WindowFrom, TimeSpan WindowTo, DateOnly? ClosedFrom, DateOnly? ClosedTo, byte[]? SiteMapBytes);

    // Mirrors the delivery-preferences form's client-side validators; the server must not trust the
    // screen's validation. Parses the wire-format time/date strings once here rather than re-parsing
    // in the PUT handler, since a value that fails to parse is itself a validation error.
    private static Dictionary<string, string[]>? Validate(DeliveryPreferences preferences, out ParsedPreferences parsed)
    {
        var errors = new Dictionary<string, string[]>();
        TimeSpan windowFrom = default, windowTo = default;
        DateOnly? closedFrom = null, closedTo = null;
        byte[]? siteMapBytes = null;

        if (preferences.DeliveryDays.Count == 0)
        {
            errors["deliveryDays"] = ["Pick at least one delivery day"];
        }
        else if (preferences.DeliveryDays.Any(day => day is < 1 or > 6))
        {
            errors["deliveryDays"] = ["Pick valid delivery days"];
        }

        var fromOk = TimeSpan.TryParseExact(preferences.WindowFrom, TimeFormat, CultureInfo.InvariantCulture, out windowFrom);
        if (!fromOk) errors["windowFrom"] = ["Enter a valid time"];
        var toOk = TimeSpan.TryParseExact(preferences.WindowTo, TimeFormat, CultureInfo.InvariantCulture, out windowTo);
        if (!toOk) errors["windowTo"] = ["Enter a valid time"];
        if (fromOk && toOk && windowTo - windowFrom < TimeSpan.FromMinutes(120))
        {
            errors["windowTo"] = ["End the window at least 2 hours after it starts"];
        }

        if (!ValidUnloading.Contains(preferences.Unloading))
        {
            errors["unloading"] = ["Choose how deliveries are unloaded"];
        }

        if (preferences.MaxPallets is < 1 or > 26)
        {
            errors["maxPallets"] = ["Choose 1 to 26 pallets"];
        }

        var chilledMatchesTemp = preferences.Chilled == preferences.MaxTempC.HasValue;
        var tempInRange = preferences.MaxTempC is null or (>= -25 and <= 8);
        if (!chilledMatchesTemp || !tempInRange)
        {
            errors["maxTempC"] = ["Enter a temperature from −25 to 8 °C"];
        }

        if (preferences.ClosedFrom is not null)
        {
            if (!DateOnly.TryParseExact(preferences.ClosedFrom, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var from))
            {
                errors["closedFrom"] = ["Enter a valid date"];
            }
            else
            {
                closedFrom = from;
                if (from < DateOnly.FromDateTime(DateTime.UtcNow.Date)) errors["closedFrom"] = ["Start the closure today or later"];
            }
        }
        if (preferences.ClosedTo is not null)
        {
            if (!DateOnly.TryParseExact(preferences.ClosedTo, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var to))
            {
                errors["closedTo"] = ["Enter a valid date"];
            }
            else
            {
                closedTo = to;
            }
        }
        if (closedFrom is not null && closedTo is not null && closedTo < closedFrom)
        {
            errors["closedTo"] = ["End the closure on or after its first day"];
        }

        if (preferences.NotifyEmails.Count > 5)
        {
            errors["notifyEmails"] = ["Enter up to 5 email addresses"];
        }
        else if (preferences.NotifyEmails.Any(email => !EmailPattern.IsMatch(email)))
        {
            errors["notifyEmails"] = ["Enter an email address like name@example.com"];
        }

        if (preferences.StandingProductIds.Count > 10 || preferences.StandingProductIds.Any(id => id <= 0))
        {
            errors["standingProductIds"] = ["Choose up to 10 products"];
        }

        if (preferences.ShipperId is <= 0)
        {
            errors["shipperId"] = ["Choose a valid carrier"];
        }

        if (!ValidInvoiceFormat.Contains(preferences.InvoiceFormat))
        {
            errors["invoiceFormat"] = ["Choose PDF, paper or both"];
        }

        if (preferences.Instructions.Length > 500)
        {
            errors["instructions"] = ["Keep delivery instructions to 500 characters or fewer"];
        }

        if (preferences.SiteMap is not null)
        {
            if (!ValidSiteMapTypes.Contains(preferences.SiteMap.Type))
            {
                errors["siteMap"] = ["Choose a PNG, JPG or PDF"];
            }
            else if (!TryDecodeDataUrl(preferences.SiteMap.DataUrl, out var bytes) || bytes.Length > MaxSiteMapBytes)
            {
                errors["siteMap"] = ["Choose a file under 2 MB"];
            }
            else
            {
                siteMapBytes = bytes;
            }
        }

        parsed = new ParsedPreferences(windowFrom, windowTo, closedFrom, closedTo, siteMapBytes);
        return errors.Count > 0 ? errors : null;
    }

    private static bool TryDecodeDataUrl(string dataUrl, out byte[] bytes)
    {
        var commaIndex = dataUrl.IndexOf(',');
        if (commaIndex < 0 || !dataUrl.StartsWith("data:", StringComparison.Ordinal))
        {
            bytes = [];
            return false;
        }
        try
        {
            bytes = Convert.FromBase64String(dataUrl[(commaIndex + 1)..]);
            return true;
        }
        catch (FormatException)
        {
            bytes = [];
            return false;
        }
    }
}
