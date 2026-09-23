using PortalLite.Api.Data;
using PortalLite.Api.Endpoints;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<SqlConnectionFactory>();

var connections = new SqlConnectionFactory(builder.Configuration);
builder.Services.AddSingleton(await DateShift.ComputeAsync(connections, builder.Configuration));

var app = builder.Build();

app.MapCustomersEndpoints();
app.MapOrdersEndpoints();
app.MapMeEndpoints();

app.Run();
