"""Google Analytics 4 Data API client.

Uses the google-analytics-data SDK with the Firebase service account JSON
(same file as FCM). The service account must be added as a Viewer on the
GA4 property (Admin → Property Access Management).
"""

from __future__ import annotations

import logging
import os
from typing import Any

from django.conf import settings
from django.core.cache import cache
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Filter,
    FilterExpression,
    Metric,
    OrderBy,
    RunReportRequest,
)

logger = logging.getLogger(__name__)

CACHE_PREFIX = "ga_dashboard_v2:"
CACHE_TTL_SECONDS = 60 * 15  # 15 minutes


_client: BetaAnalyticsDataClient | None = None


def _get_client() -> BetaAnalyticsDataClient:
    """Lazily build and reuse a single client per process."""
    global _client
    if _client is not None:
        return _client
    os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", settings.FCM_SERVICE_ACCOUNT_FILE)
    _client = BetaAnalyticsDataClient()
    return _client


def _property_path() -> str:
    return f"properties/{settings.GA_PROPERTY_ID}"


def _build_filter(spec: dict[str, Any] | None) -> FilterExpression | None:
    """Build a simple BEGINS_WITH / EXACT string filter from a spec dict.

    Spec shape: {"field": "pagePath", "match": "BEGINS_WITH", "value": "/analyse"}
    """
    if not spec:
        return None
    match_map = {
        "BEGINS_WITH": Filter.StringFilter.MatchType.BEGINS_WITH,
        "EXACT": Filter.StringFilter.MatchType.EXACT,
        "CONTAINS": Filter.StringFilter.MatchType.CONTAINS,
    }
    return FilterExpression(
        filter=Filter(
            field_name=spec["field"],
            string_filter=Filter.StringFilter(
                match_type=match_map.get(spec.get("match", "EXACT"), Filter.StringFilter.MatchType.EXACT),
                value=spec["value"],
            ),
        )
    )


def run_report(
    *,
    dimensions: list[str],
    metrics: list[str],
    start_date: str = "30daysAgo",
    end_date: str = "today",
    order_by_metric: str | None = None,
    order_by_dimension: str | None = None,
    desc: bool = True,
    limit: int = 100,
    dimension_filter: dict[str, Any] | None = None,
    cache_key: str | None = None,
) -> dict[str, Any]:
    """Run a single GA Data API report.

    Returns a normalized dict shape: {"rows": [{...}], "totals": {...}}.
    Caches results for CACHE_TTL_SECONDS when cache_key is provided.
    """
    if cache_key:
        cached = cache.get(CACHE_PREFIX + cache_key)
        if cached is not None:
            return cached

    order_bys: list[OrderBy] = []
    if order_by_metric:
        order_bys.append(OrderBy(metric=OrderBy.MetricOrderBy(metric_name=order_by_metric), desc=desc))
    elif order_by_dimension:
        order_bys.append(OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name=order_by_dimension), desc=desc))

    request = RunReportRequest(
        property=_property_path(),
        dimensions=[Dimension(name=d) for d in dimensions],
        metrics=[Metric(name=m) for m in metrics],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
        order_bys=order_bys,
        limit=limit,
        dimension_filter=_build_filter(dimension_filter),
        metric_aggregations=["TOTAL"],
    )

    client = _get_client()
    response = client.run_report(request)

    # Normalize into a plain-dict shape so the cache stores a small object
    # (not a protobuf) and consumers don't need to know about the SDK types.
    dim_names = [h.name for h in response.dimension_headers]
    metric_names = [h.name for h in response.metric_headers]
    rows: list[dict[str, Any]] = []
    for row in response.rows:
        d: dict[str, Any] = {}
        for i, name in enumerate(dim_names):
            d[name] = row.dimension_values[i].value
        for i, name in enumerate(metric_names):
            v = row.metric_values[i].value
            try:
                d[name] = float(v)
            except (TypeError, ValueError):
                d[name] = v
        rows.append(d)

    totals_dict: dict[str, float] = {}
    if response.totals:
        for i, name in enumerate(metric_names):
            try:
                totals_dict[name] = float(response.totals[0].metric_values[i].value)
            except (TypeError, ValueError, IndexError):
                totals_dict[name] = 0.0

    data = {"rows": rows, "totals": totals_dict}
    if cache_key:
        cache.set(CACHE_PREFIX + cache_key, data, CACHE_TTL_SECONDS)
    return data


def rows_as_dicts(report: dict[str, Any]) -> list[dict[str, Any]]:
    return report.get("rows", [])


def totals(report: dict[str, Any]) -> dict[str, float]:
    return report.get("totals", {})


def invalidate_cache() -> None:
    """Drop all GA dashboard cache entries."""
    try:
        cache.delete_pattern(CACHE_PREFIX + "*")
    except AttributeError:
        # Backend doesn't support delete_pattern; cache will expire naturally.
        pass
