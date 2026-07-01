# Employee module

Read-only development endpoints are available at:

- `GET /employees`

All endpoints use the **temporary development-only** context that resolves the
baseline seeded `Demo Paypoq Factory` tenant and `Main Factory`. This is not
authentication or authorization and must be replaced before production access
is enabled.

`/employees` returns active employee master-data records only. It does not
calculate activity, salary, payroll, bonus, penalty, advance, or balances.

Workers do not directly use the web application; no employee workflow is
implemented yet.
