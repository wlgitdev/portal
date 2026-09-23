-- portal-lite P1 — queries the API runs against the local Northwind copy.
-- Each block is a standalone statement the API sends via Dapper with named
-- parameters bound by the caller. To run a block by hand in SSMS / Azure
-- Data Studio, prepend a DECLARE for its parameters, e.g.:
--   DECLARE @customerId nchar(5) = 'ALFKI', @shift int = 340, @today date = '2026-09-23';
--
-- @shift is whole months, computed once at API startup (Portal:DateShiftMonths)
-- so the latest OrderDate lands in the current month; it shifts OrderDate,
-- RequiredDate and ShippedDate uniformly so their relative order is unchanged.
-- @today is the API's notion of "now", passed in rather than read via GETDATE()
-- so status derivation is deterministic and testable.

-- ============================================================
-- CustomersSearch — GET /api/customers?search=
-- Params: @search nvarchar(40)
-- ============================================================
SELECT TOP (20)
    CustomerID  AS id,
    CompanyName AS companyName,
    City        AS city,
    Country     AS country
FROM dbo.Customers
WHERE @search = N'' OR CompanyName LIKE N'%' + @search + N'%' OR CustomerID LIKE @search + N'%'
ORDER BY CompanyName;

-- ============================================================
-- OrdersList — GET /api/orders
-- Params: @customerId nchar(5), @shift int, @today date
-- Status: ShippedDate set -> Shipped; else shifted RequiredDate >= @today -> Awaiting dispatch; else Late.
-- total is the line-item sum only (no freight) so it matches OrderDetail.total (see below).
-- Each line is rounded to 2dp before summing (not after) so this total always equals the sum of
-- the same rounded amounts the drawer displays per line — Discount is `real`, imprecise enough
-- that rounding the aggregate independently can land a penny off from summing rounded lines.
-- ============================================================
SELECT
    o.OrderID AS id,
    DATEADD(month, @shift, o.OrderDate)     AS orderedOn,
    DATEADD(month, @shift, o.ShippedDate)   AS shippedOn,
    DATEADD(month, @shift, o.RequiredDate)  AS dueOn,
    CASE
        WHEN o.ShippedDate IS NOT NULL THEN N'Shipped'
        WHEN DATEADD(month, @shift, o.RequiredDate) >= @today THEN N'Awaiting dispatch'
        ELSE N'Late'
    END AS status,
    lines.itemCount,
    lines.total,
    o.ShipName AS shipTo
FROM dbo.Orders o
CROSS APPLY (
    SELECT COUNT(*) AS itemCount, SUM(CAST(od.UnitPrice * od.Quantity * (1 - od.Discount) AS decimal(19,2))) AS total
    FROM dbo.[Order Details] od
    WHERE od.OrderID = o.OrderID
) lines
WHERE o.CustomerID = @customerId
ORDER BY o.OrderDate DESC;

-- ============================================================
-- OrderDetail (header) — GET /api/orders/{id}
-- Params: @orderId int, @customerId nchar(5), @shift int, @today date
-- Zero rows means the order doesn't exist or isn't this customer's -> API returns 404.
-- total is deliberately the same line-sum as OrdersList.total (not +freight), so the
-- drawer's total always matches both the row it was opened from and its own line items;
-- freight is returned separately and shown as its own figure, not folded into total.
-- ============================================================
SELECT
    o.OrderID AS id,
    DATEADD(month, @shift, o.OrderDate)     AS orderedOn,
    DATEADD(month, @shift, o.ShippedDate)   AS shippedOn,
    DATEADD(month, @shift, o.RequiredDate)  AS dueOn,
    CASE
        WHEN o.ShippedDate IS NOT NULL THEN N'Shipped'
        WHEN DATEADD(month, @shift, o.RequiredDate) >= @today THEN N'Awaiting dispatch'
        ELSE N'Late'
    END AS status,
    o.ShipName AS shipToName,
    o.ShipAddress AS shipToAddress,
    o.ShipCity AS shipToCity,
    o.ShipRegion AS shipToRegion,
    o.ShipPostalCode AS shipToPostalCode,
    o.ShipCountry AS shipToCountry,
    o.Freight AS freight,
    lines.total AS total
FROM dbo.Orders o
CROSS APPLY (
    SELECT SUM(CAST(od.UnitPrice * od.Quantity * (1 - od.Discount) AS decimal(19,2))) AS total
    FROM dbo.[Order Details] od
    WHERE od.OrderID = o.OrderID
) lines
WHERE o.OrderID = @orderId AND o.CustomerID = @customerId;

-- ============================================================
-- OrderDetail (lines) — second result set for GET /api/orders/{id}
-- Params: @orderId int
-- ============================================================
SELECT
    od.ProductID              AS productId,
    p.ProductName              AS productName,
    od.UnitPrice                AS unitPrice,
    od.Quantity                 AS quantity,
    od.Discount                 AS discount,
    CAST(od.UnitPrice * od.Quantity * (1 - od.Discount) AS decimal(19,2)) AS lineTotal
FROM dbo.[Order Details] od
JOIN dbo.Products p ON p.ProductID = od.ProductID
WHERE od.OrderID = @orderId
ORDER BY p.ProductName;
