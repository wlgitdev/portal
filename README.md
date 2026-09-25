# portal-lite

Northwind Customer Portal — Lite (demo build). Angular 22 SPA + .NET 10
minimal API + a local SQL Server copy of Northwind. See
`docs/plans/roadmap.md` for what's built and what's next, and
`docs/plans/portal-lite-spec.md` / `-design.md` for the full spec and
design decisions.

This guide is for **native Windows** — no WSL, no Docker, no admin-level
virtualisation features. Everything here is a normal desktop install: a
.NET SDK, Node.js, SQL Server Express, and the app itself. Budget 20-30
minutes the first time, most of it SQL Server installing.

Already on Linux (or have WSL2 available and permitted)? Skip to
[Already on Linux / have WSL2?](#already-on-linux--have-wsl2) — there's a
script that does the equivalent of this whole page in one command.

## 1. Install the toolchain

Install these in any order. Each is a normal installer — no admin rights
beyond what installing any desktop app on this machine already needs.

**.NET 10 SDK** — https://dotnet.microsoft.com/download — pick .NET 10,
download the Windows x64 installer, run it.

**Node.js 24** — Angular CLI 22 needs Node ^22.22.3, ^24.15.0, or newer.
The simplest way to get an exact version is
[nvm-windows](https://github.com/coreybutler/nvm-windows) (a version
manager, not the WSL-only `nvm` — this one's a native Windows tool):

1. Download and run the installer from that page's Releases.
2. In a **new** PowerShell window:
   ```powershell
   nvm install 24
   nvm use 24
   node --version   # should print v24.x.x
   ```

No separate Angular CLI install needed — it's already a project dependency
(step 5 below), run as `npm start` rather than a global `ng` command. That
also sidesteps a common Windows gotcha: npm's global `ng` is a `.ps1`
script, which some locked-down PowerShell execution policies refuse to
run.

**SQL Server 2022 Express** (free) —
https://www.microsoft.com/en-us/sql-server/sql-server-downloads — pick
**Express**, run the installer, choose **Basic** install type. Accept the
defaults; note the instance name it finishes with (normally
`localhost\SQLEXPRESS`) — you'll need it below. This uses your Windows
login for database access, so there's no separate database password to
set up or remember.

**sqlcmd** — the Express installer above usually installs it as part of
the command-line tools. Check with:
```powershell
sqlcmd -?
```
If that's not found, install it on its own:
```powershell
winget install sqlcmd
```
(or search "sqlcmd" at the SQL Server downloads page above if `winget`
isn't available on this machine either).

## 2. Clone the repo

```powershell
git clone https://github.com/wlgitdev/portal.git
cd portal
git checkout claude/festive-goodall-htnruv   # or main, once this is merged
```

If prompted for credentials, sign in with the GitHub account that has
access to this repo.

## 3. Restore Northwind

Replace `SQLEXPRESS` below if your install used a different instance name.

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/microsoft/sql-server-samples/master/samples/databases/northwind-pubs/instnwnd.sql" -OutFile "instnwnd.sql"
sqlcmd -S "localhost\SQLEXPRESS" -E -Q "CREATE DATABASE Northwind"
sqlcmd -S "localhost\SQLEXPRESS" -E -d Northwind -i instnwnd.sql
Remove-Item instnwnd.sql
sqlcmd -S "localhost\SQLEXPRESS" -E -d Northwind -i db\portal-lite-schema.sql
```

`-E` means "use my Windows login" — the same auth the app will use, so
there's nothing to get out of sync. (This is the same script
`scripts/dev-setup/05_northwind.sh` runs for the Linux path, with the same
`CREATE DATABASE` + `-d Northwind` needed first — the script itself says
"this script does not create a database", so without that it'll happily
write everything into whatever database you're connected to instead.)

Quick check it worked:
```powershell
sqlcmd -S "localhost\SQLEXPRESS" -E -d Northwind -Q "SELECT COUNT(*) FROM dbo.Orders"
```
Should print **830**.

## 4. Connect the API to the database

```powershell
cd src\PortalLite.Api
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Northwind" "Server=localhost\SQLEXPRESS;Database=Northwind;Trusted_Connection=True;TrustServerCertificate=True"
cd ..\..
```

This is saved outside the repo (never committed), and only needs doing
once.

## 5. Install frontend dependencies

```powershell
npm install
npx playwright install chromium
```

(The second line is only needed if you want to run the automated tests in
step 7 — skip it if you just want to click through the app.)

## 6. Run it

Two PowerShell windows, both from the repo root (`portal\`):

```powershell
# Window A — the API, on :5080
dotnet run --project src\PortalLite.Api
```

```powershell
# Window B — the SPA, on :4200 (proxies /api to :5080 automatically)
npm start
```

Open **http://localhost:4200** in your browser.

## 7. Try it

- Sign in as **Alfreds Futterkiste** (or search "ALFKI") — search orders,
  filter to a status, open one and check the line items add up to the
  total.
- Sign in as **Ernst Handel** — Alfreds' own orders have all shipped, so
  to see a *Late* order and its voyage line, use this account instead.
- Resize the window below ~720px (or open dev tools' device toolbar) to
  see the card list the Orders screen switches to on a phone.

## 8. Run the automated tests

```powershell
npx playwright test
```

This starts both servers itself if they aren't already running.

## Troubleshooting

| Problem | Try this |
|---|---|
| A "Windows Defender Firewall" (or your endpoint security tool's) prompt appears the first time you run `dotnet run` / `npm start` | Allow it for **Private networks** — these are local dev servers, nothing needs to reach the internet. |
| `sqlcmd -S "localhost\SQLEXPRESS" ...` says it can't connect | Confirm the instance name: open **Services** (`services.msc`) and look for a service called "SQL Server (SQLEXPRESS)" or similar — use whatever's in the parentheses in place of `SQLEXPRESS` above. `sqlcmd -L` lists local instances too. |
| `dotnet`, `npm` or `node` "not recognized" | Close and reopen PowerShell so the installer's PATH changes take effect. |
| Setup script check for `Northwind` returns something other than 830 | The restore didn't finish cleanly — drop and redo step 3: `sqlcmd -S "localhost\SQLEXPRESS" -E -Q "DROP DATABASE Northwind"`, then the three commands in step 3 again. |
| Ports already in use (4200 / 5080) | Something else is using them — close it, or edit `proxy.conf.json` / `src/PortalLite.Api/Properties/launchSettings.json` to change the API's port. |

## Already on Linux / have WSL2?

```bash
export MSSQL_SA_PASSWORD='Ch4nge-Me-Please!'   # 8+ chars, 3 of: upper/lower/digit/symbol
bash scripts/dev-setup/setup.sh
```
does steps 1, 3 and part of 5 above in one go (installs the .NET SDK,
Node, Angular CLI, SQL Server, restores Northwind, and gets Playwright's
browser). It's Ubuntu/Debian-only — on WSL2 that means the Ubuntu distro,
not Windows itself. From there:
```bash
cd src/PortalLite.Api
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Northwind" "Server=localhost,1433;Database=Northwind;User Id=sa;Password=Ch4nge-Me-Please!;Encrypt=True;TrustServerCertificate=True"
cd ../..
npm install
```
then steps 6-8 above are identical. macOS isn't supported by the script
(no native `mssql-server` package) — you'd need Docker or a VM, which
this guide doesn't cover.

## Project layout

```
db/portal-lite.sql          the SQL queries the API runs (also runnable standalone)
src/PortalLite.Api/         .NET minimal API
src/app/                    Angular app
src/styles/                 design tokens
e2e/                        Playwright tests
scripts/dev-setup/          Linux/WSL2 one-command setup (see above)
docs/plans/                 spec, design doc, roadmap
```
