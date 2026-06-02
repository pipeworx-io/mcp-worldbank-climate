interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * World Bank Climate Change Knowledge Portal (CCKP) MCP.
 *
 * Keyless. Provides historical climatology and CMIP6 climate projections
 * (temperature, precipitation) for every country, by emissions scenario.
 *
 * The CCKP API path is a single 11-token underscore-joined "indicator code"
 * followed by a geography, e.g.
 *   /{collection}_{type}_{variable}_{product}_{aggregation}_{period}_{percentile}_{scenario}_{model}_{modelCalculation}_{statistic}/{geo}
 * This pack assembles that code from separate named args so an LLM never has to
 * hand-craft the brittle composite string. The 11-token order and the
 * "ensemble => percentile must be median" rule were lifted verbatim from the
 * portal's own Catalog.js apiUrl builder and verified live with curl.
 */


const BASE = 'https://cckpapi.worldbank.org/cckp/v1';
const UA = 'pipeworx-mcp-worldbank-climate/1.0 (+https://pipeworx.io)';

// Defaults verified live against the API (2026-06). Historical reference period
// for CMIP6 is 1995-2014; the multi-model ensemble requires percentile=median.
const DEFAULTS = {
  collection: 'cmip6-x0.25',
  type: 'climatology',
  variable: 'tas',
  product: 'climatology',
  aggregation: 'annual',
  percentile: 'median',
  model: 'ensemble',
  modelCalculation: 'all',
  statistic: 'mean',
} as const;

const HISTORICAL_PERIOD = '1995-2014';
const DEFAULT_PROJECTION_PERIOD = '2040-2059';

const tools: McpToolExport['tools'] = [
  {
    name: 'get_climate_data',
    description:
      'World Bank CCKP climate data for any country: historical observations and CMIP6 climate-model projections. ' +
      'Returns mean temperature, max/min temperature, or precipitation, by emissions scenario. ' +
      'Pass the components as separate args — this tool assembles the brittle composite "indicator code" for you. ' +
      'Values are returned keyed by ISO3 country code; the inner key is "<startYear>-07" (annual/period) or per-season months.\n\n' +
      'WORKED EXAMPLES (all verified live):\n' +
      '1. Historical annual mean temperature for the USA (defaults): {"geography":"USA"} ' +
      '=> tas climatology over 1995-2014, ~10.2°C.\n' +
      '2. Projected warming (anomaly) for the USA mid-century under a high scenario: ' +
      '{"geography":"USA","scenario":"ssp585","period":"2040-2059","product":"anomaly"} => ~2.4°C above baseline.\n' +
      '3. Historical annual precipitation for all countries: ' +
      '{"geography":"all_countries","variable":"pr","product":"climatology","period":"1995-2014","scenario":"historical"} ' +
      '=> mm/year per country.\n\n' +
      'If assembly ever fails for an exotic combination, pass the full composite string via indicator_code instead.',
    inputSchema: {
      type: 'object',
      properties: {
        geography: {
          type: 'string',
          description: 'ISO3 country code (e.g. "USA", "BRA"), or "all_countries" for every country. Default "all_countries".',
        },
        variable: {
          type: 'string',
          description:
            'Climate variable. Verified: "tas" (mean temp °C), "tasmax" (max temp), "tasmin" (min temp), "pr" (precipitation mm/year). Default "tas".',
        },
        scenario: {
          type: 'string',
          description:
            'Emissions/scenario. "historical" for observed past, or a projection SSP: "ssp119","ssp126","ssp245","ssp370","ssp585" (low→high emissions). Default "historical".',
        },
        period: {
          type: 'string',
          description:
            'Time period. For historical use "1995-2014" (the default when scenario=historical). For projections use a 20-year window e.g. "2020-2039","2040-2059","2060-2079","2080-2099". Defaults to 1995-2014 (historical) or 2040-2059 (projection).',
        },
        product: {
          type: 'string',
          description:
            'What to return: "climatology" (absolute values, verified) or "anomaly" (change vs reference period — use with a projection scenario, verified). Default "climatology".',
        },
        aggregation: {
          type: 'string',
          description: '"annual" (single value) or "seasonal" (four season values), verified. Default "annual".',
        },
        collection: {
          type: 'string',
          description:
            'Dataset collection. Default and only fully API-verified value is "cmip6-x0.25" (model-derived, covers historical + projections). The portal lists "era5-x0.25"/"cru-x0.5" observation collections but those did not return data through this JSON API in testing — prefer cmip6-x0.25.',
        },
        indicator_code: {
          type: 'string',
          description:
            'Optional raw 11-token composite code to pass through verbatim, bypassing assembly. Order: collection_type_variable_product_aggregation_period_percentile_scenario_model_modelCalculation_statistic. Example: "cmip6-x0.25_climatology_tas_climatology_annual_1995-2014_median_historical_ensemble_all_mean".',
        },
      },
    },
  },
  {
    name: 'list_options',
    description:
      'Documents the CCKP indicator-code components and the value combinations that were VERIFIED live against the API. ' +
      'Call this to learn valid variables, scenarios, periods, products, and aggregations before building a get_climate_data request. Takes no arguments.',
    inputSchema: { type: 'object', properties: {} },
  },
];

function buildIndicatorCode(args: Record<string, unknown>): string {
  const scenario = str(args.scenario) ?? 'historical';
  const isHistorical = scenario === 'historical';
  const period = str(args.period) ?? (isHistorical ? HISTORICAL_PERIOD : DEFAULT_PROJECTION_PERIOD);

  // 11-token order taken verbatim from the portal's Catalog.js apiUrl getter.
  const parts = [
    str(args.collection) ?? DEFAULTS.collection, // collection
    DEFAULTS.type, // type
    str(args.variable) ?? DEFAULTS.variable, // variable
    str(args.product) ?? DEFAULTS.product, // product
    str(args.aggregation) ?? DEFAULTS.aggregation, // aggregation
    period, // period
    DEFAULTS.percentile, // percentile (ensemble => median, per Catalog.js validateInputs)
    scenario, // scenario
    DEFAULTS.model, // model
    DEFAULTS.modelCalculation, // modelCalculation
    DEFAULTS.statistic, // statistic
  ];
  return parts.join('_');
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_climate_data': {
      const code = str(args.indicator_code) ?? buildIndicatorCode(args);
      const geography = str(args.geography) ?? 'all_countries';
      const result = await cckpGet(`/${code}/${geography}`);
      return { indicator_code: code, geography, ...(result as Record<string, unknown>) };
    }
    case 'list_options':
      return {
        note:
          'These are the components of the CCKP composite indicator code and the values verified live against the API (2026-06). ' +
          'The cmip6-x0.25 collection is the reliable one; observation collections (era5/cru) are exposed via the portal but did not return data through this JSON API.',
        verified_collections: ['cmip6-x0.25'],
        unverified_collections: ['era5-x0.25', 'cru-x0.5'],
        variables: {
          tas: 'mean near-surface temperature (°C) — verified',
          tasmax: 'maximum temperature (°C) — verified',
          tasmin: 'minimum temperature (°C) — verified',
          pr: 'precipitation (mm/year) — verified',
        },
        scenarios: {
          historical: 'observed/modeled past — verified, pair with period 1995-2014',
          ssp119: 'very low emissions — verified',
          ssp126: 'low emissions — verified',
          ssp245: 'intermediate emissions — verified',
          ssp370: 'high emissions — verified',
          ssp585: 'very high emissions — verified',
        },
        periods: {
          historical: ['1995-2014 (CMIP6 reference — verified)'],
          projection: ['2020-2039', '2040-2059 (verified)', '2060-2079', '2080-2099 (verified)'],
        },
        products: {
          climatology: 'absolute values — verified',
          anomaly: 'change vs reference period; use with a projection scenario — verified',
        },
        aggregations: {
          annual: 'single annual value — verified',
          seasonal: 'four seasonal values — verified',
        },
        geographies: 'ISO3 country code (e.g. "USA","BRA" — verified) or "all_countries" (verified).',
        fixed_components: {
          type: 'climatology',
          percentile: 'median (required for the ensemble model)',
          model: 'ensemble',
          modelCalculation: 'all',
          statistic: 'mean',
        },
        indicator_code_order:
          'collection_type_variable_product_aggregation_period_percentile_scenario_model_modelCalculation_statistic',
        example_codes: [
          'cmip6-x0.25_climatology_tas_climatology_annual_1995-2014_median_historical_ensemble_all_mean (historical mean temp)',
          'cmip6-x0.25_climatology_tas_anomaly_annual_2040-2059_median_ssp585_ensemble_all_mean (projected warming)',
          'cmip6-x0.25_climatology_pr_climatology_annual_1995-2014_median_historical_ensemble_all_mean (historical precip)',
        ],
      };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function cckpGet(path: string): Promise<unknown> {
  const url = `${BASE}${path}?_format=json`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`CCKP: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
