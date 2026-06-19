# SAP APIM JavaScript — Standalone Policy Runner

Run and inspect SAP APIM JavaScript policies locally. No SAP BTP, no npm, no test framework — just Node.js.

---

## Run a policy

```bash
node runner.js policies/my-policy.js
```

The runner automatically looks for `policies/my-policy.txt` as the config file.
To use a different config:

```bash
node runner.js policies/my-policy.js policies/other-config.txt
```

---

## Config file format

Each policy has a paired `.txt` file that sets inputs and declares which variables to print.

```
# Lines starting with # are comments — use them to document scenarios

# ── Inputs ──────────────────────────────────────────────
# Set any flow variable: everything after the first = is the value
response.content = {"id": 1, "name": "Alice"}
request.header.Authorization = Bearer abc123
request.header.x-correlation-id = req-001
request.queryparam.startDate = 2024-01-15
request.method = POST
targetResponse.status = 200
targetResponse.status.message = OK

# ── Outputs ─────────────────────────────────────────────
# Only variables listed here are printed. Omit this section to print everything.
OUTPUT: validation.passed
OUTPUT: validation.errors
OUTPUT: response.header.X-Powered-By
OUTPUT: response.content
```

**Rules:**
- Any `variable.name = value` line sets that variable in the context before the policy runs
- `request.header.<name>` lines populate `context.getVariable('request.header.<name>')`
- `request.queryparam.<name>` lines populate query param variables
- `OUTPUT: variable.name` lines control what is printed — omit all OUTPUT lines to dump every variable

---

## Writing your own policy

1. Copy your JS from SAP APIM into `policies/my-policy.js`. Write it exactly as you would in the APIM policy editor — use `context`, `request`, `response` globals directly.

2. Create `policies/my-policy.txt` with the inputs and outputs you care about.

3. Run:
   ```bash
   node runner.js policies/my-policy.js
   ```

---

## Available globals in the policy sandbox

| Global | Description |
|---|---|
| `context.getVariable(name)` | Returns the value set in the config file, or from a header/queryparam |
| `context.setVariable(name, value)` | Stores a variable — readable by `getVariable` and printable via OUTPUT |
| `context.removeVariable(name)` | Removes a variable |
| `context.flow` | Set via `context.flow` in config; defaults to `PROXY_REQ_FLOW` |
| `context.targetResponse.status` | Numeric-like object; `.message` holds the status text |
| `context.targetResponse.content` | Set via `response.content` in config |
| `request` | Alias for `context.proxyRequest` |
| `response` | Alias for `context.proxyResponse` |
| `httpClient.send(req)` | Returns a stub response (extend `runner.js` if you need real calls) |
| `print(...)` | Prints to console with `[policy print]` prefix |
