# mcp-worldbank-climate

World Bank Climate Change Knowledge Portal (CCKP) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1857+ live data sources. This is an independent, unofficial integration — not affiliated with, endorsed by, or published by the upstream provider.

## Tools

| Tool | Description |
|------|-------------|
| `get_climate_data` | World Bank CCKP climate data for any country: historical observations and CMIP6 climate-model projections. Returns mean temperature, max/min temperature, or precipitation, by emissions scenario. Pass the components as separate args — this tool assembles the brittle composite "indicator code" for you. Values are returned keyed by ISO3 country code; the inner key is "<startYear>-07" (annual/period) or per-season months.nnWORKED EXAMPLES (all verified live):n1. Historical annual mean temperature for the USA (defaults): {"geography":"USA"} => tas climatology over 1995-2014, ~10.2°C.n2. Projected warming (anomaly) for the USA mid-century under a high scenario: {"geography":"USA","scenario":"ssp585","period":"2040-2059","product":"anomaly"} => ~2.4°C above baseline.n3. Historical annual precipitation for all countries: {"geography":"all_countries","variable":"pr","product":"climatology","period":"1995-2014","scenario":"historical"} => mm/year per country.nnIf assembly ever fails for an exotic combination, pass the full composite string via indicator_code instead. |
| `list_options` | Return a static reference object documenting all verified CCKP indicator-code components: valid variables (tas/tasmax/tasmin/pr), scenarios (historical + SSP119–585), periods, products (climatology/anomaly), aggregations (annual/seasonal), and the 11-token composite code order. Takes no arguments; call before get_climate_data to choose valid parameter combinations.Call this to learn valid variables, scenarios, periods, products, and aggregations before building a get_climate_data request. Takes no arguments. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "worldbank-climate": {
      "url": "https://gateway.pipeworx.io/worldbank-climate/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/worldbank-climate/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1857+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/get_climate_data \
  -H 'Content-Type: application/json' \
  -d '{"geography":"USA"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/get_climate_data`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Run it from npm

`@pipeworx/mcp-worldbank-climate` is a local stdio bridge to the Pipeworx gateway: your MCP client
starts it with `npx`, and it forwards every call to the same
`https://gateway.pipeworx.io/worldbank-climate/mcp` endpoint shown above. It needs network access;
there is no offline mode.

```json
{
  "mcpServers": {
    "worldbank-climate": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-worldbank-climate"]
    }
  }
}
```

Without a key it calls anonymously, capped at 50 calls a day. A free account
raises that to 200 a day: get a key at https://pipeworx.io/signup and add
`"env": { "PIPEWORX_API_KEY": "<your key>" }` to the server entry.
The key is sent as a Bearer token, the same way a hosted connection sends it,
so calls are metered and billed exactly as they are there.

It lists **only** this pack's tools by default. Set `PIPEWORX_META_TOOLS=1` to
also list `ask_pipeworx` and the other gateway-wide tools.

Behind an HTTPS proxy: Node's built-in `fetch` does not read `HTTPS_PROXY` by
default. Newer Node releases honour it when `NODE_USE_ENV_PROXY=1` is set; check
your Node version's documentation.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Worldbank Climate data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
