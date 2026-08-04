# mcp-worldbank-climate

World Bank Climate Change Knowledge Portal (CCKP) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Worldbank Climate data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
