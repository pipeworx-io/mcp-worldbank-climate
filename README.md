# mcp-worldbank-climate

World Bank Climate Change Knowledge Portal (CCKP) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1679+ live data sources.

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

Both URLs reach the same gateway and the same 1679+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/get_climate_data \
  -H 'Content-Type: application/json' \
  -d '{"geography":"USA"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/get_climate_data`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Standalone (no gateway account)

This package also runs as a local stdio MCP server — no Pipeworx account, no
gateway round-trip:

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

Or run it directly to confirm it starts:

```bash
npx -y @pipeworx/mcp-worldbank-climate
```

It speaks MCP over stdin/stdout and answers `initialize`/`tools/list`/`tools/call`
for **only** this pack's tools — none of the shared meta-tools the gateway
connection above adds. Same source, same tools, no ask_pipeworx routing.

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
