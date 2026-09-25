namespace PortalLite.Api.Data;

// Northwind's order history ends in 1998; every date the API returns is
// shifted forward by whole months so the latest order lands in the current
// month, keeping the demo's "on the water" framing honest without touching
// the underlying data. Computed once at startup, not per-request, so a
// running demo doesn't drift mid-session.
internal sealed record DateShift(int Months, DateTime Today)
{
    public static async Task<DateShift> ComputeAsync(SqlConnectionFactory connections, IConfiguration configuration)
    {
        var today = DateTime.UtcNow.Date;

        var overrideMonths = configuration.GetValue<int?>("Portal:DateShiftMonths");
        if (overrideMonths is { } months)
        {
            return new DateShift(months, today);
        }

        using var connection = connections.Create();
        await connection.OpenAsync();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT MAX(OrderDate) FROM dbo.Orders";
        var maxOrderDate = (DateTime)(await command.ExecuteScalarAsync())!;

        var shiftMonths = ((today.Year - maxOrderDate.Year) * 12) + today.Month - maxOrderDate.Month;
        return new DateShift(shiftMonths, today);
    }
}
