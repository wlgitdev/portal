namespace PortalLite.Api.Endpoints;

// Scoping: customerId comes only from this header, never from body or route,
// so one customer can never read or write another's data by guessing an id.
internal sealed class DemoCustomerFilter : IEndpointFilter
{
    public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var customerId = context.HttpContext.Request.Headers["X-Demo-Customer"].ToString();
        if (string.IsNullOrWhiteSpace(customerId))
        {
            return ValueTask.FromResult<object?>(
                Results.Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Missing X-Demo-Customer header."));
        }

        return next(context);
    }
}
