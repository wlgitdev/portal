-- portal-lite S8 — delivery preferences schema (roadmap item 10, bundle B10).
-- Idempotent (IF OBJECT_ID … IS NULL): scripts/dev-setup/05_northwind.sh runs
-- this after every Northwind restore, not just the first, so re-running it
-- is always safe. See showcase-2-spec.md phase S8 "schema" for the source.

IF OBJECT_ID('dbo.PortalDeliveryPreferences') IS NULL
BEGIN
    CREATE TABLE dbo.PortalDeliveryPreferences (
        CustomerID      nchar(5)        NOT NULL PRIMARY KEY,
        ShipperID       int             NULL,
        WindowFrom      time(0)         NOT NULL,
        WindowTo        time(0)         NOT NULL,
        Unloading       nvarchar(10)    NOT NULL,
        MaxPallets      tinyint         NOT NULL,
        Chilled         bit             NOT NULL,
        MaxTempC        smallint        NULL,
        ClosedFrom      date            NULL,
        ClosedTo        date            NULL,
        InvoiceFormat   nvarchar(5)     NOT NULL,
        Instructions    nvarchar(500)   NOT NULL DEFAULT '',
        SiteMapName     nvarchar(255)   NULL,
        SiteMapType     nvarchar(50)    NULL,
        SiteMap         varbinary(max)  NULL,
        CONSTRAINT FK_PortalDeliveryPreferences_Customer
            FOREIGN KEY (CustomerID) REFERENCES dbo.Customers (CustomerID),
        CONSTRAINT FK_PortalDeliveryPreferences_Shipper
            FOREIGN KEY (ShipperID) REFERENCES dbo.Shippers (ShipperID),
        CONSTRAINT CK_PortalDeliveryPreferences_Unloading
            CHECK (Unloading IN ('dock', 'tail-lift', 'by-hand')),
        CONSTRAINT CK_PortalDeliveryPreferences_MaxPallets
            CHECK (MaxPallets BETWEEN 1 AND 26),
        CONSTRAINT CK_PortalDeliveryPreferences_MaxTempC
            CHECK (MaxTempC BETWEEN -25 AND 8),
        CONSTRAINT CK_PortalDeliveryPreferences_InvoiceFormat
            CHECK (InvoiceFormat IN ('pdf', 'paper', 'both')),
        CONSTRAINT CK_PortalDeliveryPreferences_ChilledNeedsTemp
            CHECK (Chilled = 1 OR MaxTempC IS NULL),
        CONSTRAINT CK_PortalDeliveryPreferences_TempNeedsChilled
            CHECK (Chilled = 0 OR MaxTempC IS NOT NULL),
        CONSTRAINT CK_PortalDeliveryPreferences_WindowLength
            CHECK (DATEDIFF(minute, WindowFrom, WindowTo) >= 120),
        CONSTRAINT CK_PortalDeliveryPreferences_ClosedRange
            CHECK ((ClosedFrom IS NULL AND ClosedTo IS NULL) OR ClosedTo >= ClosedFrom)
    );
END;

IF OBJECT_ID('dbo.PortalDeliveryDays') IS NULL
BEGIN
    CREATE TABLE dbo.PortalDeliveryDays (
        CustomerID  nchar(5)  NOT NULL,
        DayOfWeek   tinyint   NOT NULL,
        CONSTRAINT PK_PortalDeliveryDays PRIMARY KEY (CustomerID, DayOfWeek),
        CONSTRAINT FK_PortalDeliveryDays_Customer
            FOREIGN KEY (CustomerID) REFERENCES dbo.Customers (CustomerID),
        CONSTRAINT CK_PortalDeliveryDays_DayOfWeek CHECK (DayOfWeek BETWEEN 1 AND 6)
    );
END;

IF OBJECT_ID('dbo.PortalNotifyEmails') IS NULL
BEGIN
    CREATE TABLE dbo.PortalNotifyEmails (
        CustomerID  nchar(5)       NOT NULL,
        Email       nvarchar(254)  NOT NULL,
        CONSTRAINT PK_PortalNotifyEmails PRIMARY KEY (CustomerID, Email),
        CONSTRAINT FK_PortalNotifyEmails_Customer
            FOREIGN KEY (CustomerID) REFERENCES dbo.Customers (CustomerID)
    );
END;

IF OBJECT_ID('dbo.PortalStandingProducts') IS NULL
BEGIN
    CREATE TABLE dbo.PortalStandingProducts (
        CustomerID  nchar(5)  NOT NULL,
        ProductID   int       NOT NULL,
        CONSTRAINT PK_PortalStandingProducts PRIMARY KEY (CustomerID, ProductID),
        CONSTRAINT FK_PortalStandingProducts_Customer
            FOREIGN KEY (CustomerID) REFERENCES dbo.Customers (CustomerID),
        CONSTRAINT FK_PortalStandingProducts_Product
            FOREIGN KEY (ProductID) REFERENCES dbo.Products (ProductID)
    );
END;
