using System.Data;
using Microsoft.Data.SqlClient;

namespace PortalLite.Api.Data;

// why-not-the-obvious-way: Dapper is the usual choice for a thin data-access
// helper like this. It's replaced here so the server carries only Microsoft
// packages (Microsoft.Data.SqlClient, plus the ASP.NET Core/.NET SDK itself).
internal static class SqlQuery
{
    public static async Task<IReadOnlyList<T>> ListAsync<T>(
        SqlConnection connection, string sql, IReadOnlyList<SqlParam> parameters, Func<SqlDataReader, T> map)
    {
        await using var command = Command(connection, sql, parameters);
        await OpenIfNeeded(connection);
        await using var reader = await command.ExecuteReaderAsync();
        var rows = new List<T>();
        while (await reader.ReadAsync())
        {
            rows.Add(map(reader));
        }
        return rows;
    }

    public static async Task<T?> SingleOrDefaultAsync<T>(
        SqlConnection connection, string sql, IReadOnlyList<SqlParam> parameters, Func<SqlDataReader, T> map)
        where T : class
    {
        await using var command = Command(connection, sql, parameters);
        await OpenIfNeeded(connection);
        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() ? map(reader) : null;
    }

    public static async Task ExecuteAsync(
        SqlConnection connection, string sql, IReadOnlyList<SqlParam> parameters, SqlTransaction? transaction = null)
    {
        await using var command = Command(connection, sql, parameters);
        command.Transaction = transaction;
        await OpenIfNeeded(connection);
        await command.ExecuteNonQueryAsync();
    }

    private static Task OpenIfNeeded(SqlConnection connection) =>
        connection.State == ConnectionState.Open ? Task.CompletedTask : connection.OpenAsync();

    private static SqlCommand Command(SqlConnection connection, string sql, IReadOnlyList<SqlParam> parameters)
    {
        var command = connection.CreateCommand();
        command.CommandText = sql;
        foreach (var parameter in parameters)
        {
            var sqlParameter = new SqlParameter(parameter.Name, parameter.Value ?? DBNull.Value);
            if (parameter.Type is { } type)
            {
                sqlParameter.SqlDbType = type;
            }
            command.Parameters.Add(sqlParameter);
        }
        return command;
    }
}

// A named query parameter. Type is set only where inference from the .NET
// value would be ambiguous (nchar customer ids, dates — see SqlQuery above).
internal readonly record struct SqlParam(string Name, object? Value, SqlDbType? Type = null);
