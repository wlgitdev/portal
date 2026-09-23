using System.Text.RegularExpressions;
using Dapper;
using PortalLite.Api.Data;

namespace PortalLite.Api.Endpoints;

internal static class MeEndpoints
{
    // Mirrors the account form's client-side pattern; the server must not trust the screen's validation.
    private static readonly Regex PhonePattern = new(@"^[0-9 +()\-.]{0,24}$", RegexOptions.Compiled);

    public static void MapMeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/me").AddEndpointFilter<DemoCustomerFilter>();

        group.MapGet("", async (HttpContext http, SqlConnectionFactory connections) =>
        {
            var customerId = http.Request.Headers["X-Demo-Customer"].ToString();
            using var connection = connections.Create();
            var profile = await connection.QuerySingleAsync<CustomerProfile>(
                CustomersQueries.GetProfile, new { customerId });
            return Results.Ok(profile);
        });

        group.MapPut("", async (CustomerProfile profile, HttpContext http, SqlConnectionFactory connections) =>
        {
            var errors = Validate(profile);
            if (errors is not null)
            {
                return Results.ValidationProblem(errors);
            }

            var customerId = http.Request.Headers["X-Demo-Customer"].ToString();
            using var connection = connections.Create();
            await connection.ExecuteAsync(CustomersQueries.UpdateProfile, new
            {
                customerId,
                contactName = profile.ContactName,
                address = profile.Address,
                city = profile.City,
                region = profile.Region,
                postalCode = profile.PostalCode,
                country = profile.Country,
                phone = profile.Phone,
                fax = profile.Fax,
            });
            return Results.Ok(profile);
        });
    }

    private static Dictionary<string, string[]>? Validate(CustomerProfile profile)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(profile.ContactName) || profile.ContactName.Length > 30)
        {
            errors["contactName"] = ["Contact name is required and must be 30 characters or fewer."];
        }
        if (profile.Phone is not null && !PhonePattern.IsMatch(profile.Phone))
        {
            errors["phone"] = ["Phone can only contain digits, spaces, +, ( ) and -"];
        }
        if (profile.Fax is not null && !PhonePattern.IsMatch(profile.Fax))
        {
            errors["fax"] = ["Fax can only contain digits, spaces, +, ( ) and -"];
        }
        if (profile.PostalCode is { Length: > 10 })
        {
            errors["postalCode"] = ["Postal code must be 10 characters or fewer."];
        }
        if (string.IsNullOrWhiteSpace(profile.Country))
        {
            errors["country"] = ["Country is required."];
        }

        return errors.Count > 0 ? errors : null;
    }
}
