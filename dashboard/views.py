"""Admin view for the Google Analytics dashboard."""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render
from django.views.decorators.cache import never_cache

from . import ga_client

logger = logging.getLogger(__name__)


def _safe_run(**kwargs: Any) -> dict[str, Any]:
    """Run a GA query, returning an empty report on failure so the dashboard still renders."""
    try:
        return ga_client.run_report(**kwargs)
    except Exception as exc:  # noqa: BLE001
        logger.warning("GA query failed for %s: %s", kwargs.get("cache_key"), exc)
        return {}


def _range_from_param(value: str) -> tuple[str, str]:
    presets = {
        "7d": ("7daysAgo", "today"),
        "30d": ("30daysAgo", "today"),
        "90d": ("90daysAgo", "today"),
        "365d": ("365daysAgo", "today"),
    }
    return presets.get(value, presets["30d"])


def _range_display(range_key: str) -> tuple[str, str]:
    """Return human-readable (start, end) date strings for the range key."""
    days_map = {"7d": 7, "30d": 30, "90d": 90, "365d": 365}
    days = days_map.get(range_key, 30)
    today = date.today()
    start = today - timedelta(days=days)
    return start.isoformat(), today.isoformat()


@never_cache
@staff_member_required
def ga_dashboard(request):
    range_key = request.GET.get("range", "30d")
    start_date, end_date = _range_from_param(range_key)
    cache_suffix = f":{range_key}"

    # 1. Overview KPIs
    overview = _safe_run(
        dimensions=[],
        metrics=[
            "totalUsers",
            "newUsers",
            "sessions",
            "screenPageViews",
            "averageSessionDuration",
            "engagementRate",
            "sessionsPerUser",
            "screenPageViewsPerSession",
        ],
        start_date=start_date,
        end_date=end_date,
        cache_key=f"overview{cache_suffix}",
    )
    overview_totals = ga_client.totals(overview)

    # New vs returning users
    nvr_report = _safe_run(
        dimensions=["newVsReturning"],
        metrics=["totalUsers", "sessions", "averageSessionDuration", "engagementRate"],
        start_date=start_date,
        end_date=end_date,
        cache_key=f"new_vs_returning{cache_suffix}",
    )
    nvr = {row["newVsReturning"]: row for row in ga_client.rows_as_dicts(nvr_report)}

    # 2. Daily trend (for chart)
    daily_report = _safe_run(
        dimensions=["date"],
        metrics=["totalUsers", "sessions", "screenPageViews"],
        start_date=start_date,
        end_date=end_date,
        order_by_dimension="date",
        desc=False,
        limit=400,
        cache_key=f"daily{cache_suffix}",
    )
    daily_rows = ga_client.rows_as_dicts(daily_report)
    for row in daily_rows:
        d = row.get("date", "")
        if len(d) == 8:
            row["label"] = f"{d[6:8]}/{d[4:6]}"
        else:
            row["label"] = d

    # 3. Traffic sources
    channels_report = _safe_run(
        dimensions=["sessionDefaultChannelGroup"],
        metrics=["sessions", "totalUsers", "newUsers", "engagementRate"],
        start_date=start_date,
        end_date=end_date,
        order_by_metric="sessions",
        cache_key=f"channels{cache_suffix}",
    )
    channels = ga_client.rows_as_dicts(channels_report)

    sources_report = _safe_run(
        dimensions=["sessionSource", "sessionMedium"],
        metrics=["sessions", "totalUsers"],
        start_date=start_date,
        end_date=end_date,
        order_by_metric="sessions",
        limit=15,
        cache_key=f"sources{cache_suffix}",
    )
    sources = ga_client.rows_as_dicts(sources_report)

    # 4. Geography
    countries_report = _safe_run(
        dimensions=["country"],
        metrics=["totalUsers", "sessions"],
        start_date=start_date,
        end_date=end_date,
        order_by_metric="totalUsers",
        limit=10,
        cache_key=f"countries{cache_suffix}",
    )
    countries = ga_client.rows_as_dicts(countries_report)

    cities_report = _safe_run(
        dimensions=["city"],
        metrics=["totalUsers", "sessions"],
        start_date=start_date,
        end_date=end_date,
        order_by_metric="totalUsers",
        limit=15,
        cache_key=f"cities{cache_suffix}",
    )
    cities = ga_client.rows_as_dicts(cities_report)

    # 5. Devices and screen sizes
    devices_report = _safe_run(
        dimensions=["deviceCategory"],
        metrics=["totalUsers", "sessions", "engagementRate", "averageSessionDuration"],
        start_date=start_date,
        end_date=end_date,
        order_by_metric="totalUsers",
        cache_key=f"devices{cache_suffix}",
    )
    devices = ga_client.rows_as_dicts(devices_report)

    screens_report = _safe_run(
        dimensions=["screenResolution"],
        metrics=["totalUsers", "sessions"],
        start_date=start_date,
        end_date=end_date,
        order_by_metric="totalUsers",
        limit=12,
        cache_key=f"screens{cache_suffix}",
    )
    screens = ga_client.rows_as_dicts(screens_report)

    browsers_report = _safe_run(
        dimensions=["browser"],
        metrics=["totalUsers"],
        start_date=start_date,
        end_date=end_date,
        order_by_metric="totalUsers",
        limit=8,
        cache_key=f"browsers{cache_suffix}",
    )
    browsers = ga_client.rows_as_dicts(browsers_report)

    os_report = _safe_run(
        dimensions=["operatingSystem"],
        metrics=["totalUsers"],
        start_date=start_date,
        end_date=end_date,
        order_by_metric="totalUsers",
        limit=8,
        cache_key=f"os{cache_suffix}",
    )
    operating_systems = ga_client.rows_as_dicts(os_report)

    # 6. Top pages (overall)
    top_pages_report = _safe_run(
        dimensions=["pagePath"],
        metrics=["screenPageViews", "activeUsers", "userEngagementDuration", "engagementRate"],
        start_date=start_date,
        end_date=end_date,
        order_by_metric="screenPageViews",
        limit=20,
        cache_key=f"top_pages{cache_suffix}",
    )
    top_pages = ga_client.rows_as_dicts(top_pages_report)
    for row in top_pages:
        users = row.get("activeUsers", 0)
        eng = row.get("userEngagementDuration", 0)
        row["time_per_user"] = (eng / users) if users else 0

    # 7. How people find analyses - filter to /analyse* paths
    analyses_pages_report = _safe_run(
        dimensions=["pagePath"],
        metrics=["screenPageViews", "activeUsers", "userEngagementDuration"],
        start_date=start_date,
        end_date=end_date,
        order_by_metric="screenPageViews",
        limit=20,
        dimension_filter={"field": "pagePath", "match": "BEGINS_WITH", "value": "/analyse"},
        cache_key=f"analyses_pages{cache_suffix}",
    )
    analyses_pages = ga_client.rows_as_dicts(analyses_pages_report)
    for row in analyses_pages:
        users = row.get("activeUsers", 0)
        eng = row.get("userEngagementDuration", 0)
        row["time_per_user"] = (eng / users) if users else 0

    # Landing pages for analyses (where session entered, filtered to /analyse*)
    analyses_landing_report = _safe_run(
        dimensions=["landingPagePlusQueryString", "sessionSource", "sessionMedium"],
        metrics=["sessions", "totalUsers", "newUsers", "engagementRate"],
        start_date=start_date,
        end_date=end_date,
        order_by_metric="sessions",
        limit=25,
        dimension_filter={"field": "landingPage", "match": "BEGINS_WITH", "value": "/analyse"},
        cache_key=f"analyses_landing{cache_suffix}",
    )
    analyses_landing = ga_client.rows_as_dicts(analyses_landing_report)

    # Sources sending traffic specifically to analyses (any page in session contained /analyse)
    analyses_sources_report = _safe_run(
        dimensions=["sessionDefaultChannelGroup", "sessionSource"],
        metrics=["sessions", "totalUsers"],
        start_date=start_date,
        end_date=end_date,
        order_by_metric="sessions",
        limit=15,
        dimension_filter={"field": "pagePath", "match": "BEGINS_WITH", "value": "/analyse"},
        cache_key=f"analyses_sources{cache_suffix}",
    )
    analyses_sources = ga_client.rows_as_dicts(analyses_sources_report)

    # analysis_link_click events - where on the site people click analysis links
    analysis_clicks_report = _safe_run(
        dimensions=["pagePath"],
        metrics=["eventCount", "totalUsers"],
        start_date=start_date,
        end_date=end_date,
        order_by_metric="eventCount",
        limit=15,
        dimension_filter={"field": "eventName", "match": "EXACT", "value": "analysis_link_click"},
        cache_key=f"analysis_clicks{cache_suffix}",
    )
    analysis_clicks = ga_client.rows_as_dicts(analysis_clicks_report)
    analysis_clicks_totals = ga_client.totals(analysis_clicks_report)

    # analysis_link_click events broken down by the `click_source` custom parameter.
    # We use `click_source` instead of `source` because GA4 treats `source` as a
    # reserved/auto-attribution parameter and strips explicit values.
    analysis_clicks_by_source_report = _safe_run(
        dimensions=["customEvent:click_source"],
        metrics=["eventCount", "totalUsers"],
        start_date=start_date,
        end_date=end_date,
        order_by_metric="eventCount",
        limit=10,
        dimension_filter={"field": "eventName", "match": "EXACT", "value": "analysis_link_click"},
        cache_key=f"analysis_clicks_source{cache_suffix}",
    )
    analysis_clicks_by_source_raw = ga_client.rows_as_dicts(analysis_clicks_by_source_report)
    # Rename "customEvent:click_source" dim to "source" so Django templates can access it.
    analysis_clicks_by_source = [
        {
            "source": row.get("customEvent:click_source") or "(not set)",
            "eventCount": row.get("eventCount", 0),
            "totalUsers": row.get("totalUsers", 0),
        }
        for row in analysis_clicks_by_source_raw
    ]

    # Aggregate analyses metrics: total views, sessions, users
    analyses_summary = {
        "total_views": int(sum(p.get("screenPageViews", 0) for p in analyses_pages)),
        "total_users": int(sum(p.get("activeUsers", 0) for p in analyses_pages)),
        "total_landing_sessions": int(sum(p.get("sessions", 0) for p in analyses_landing)),
        "total_link_clicks": int(analysis_clicks_totals.get("eventCount", 0)),
        "total_link_click_users": int(analysis_clicks_totals.get("totalUsers", 0)),
    }

    # 8. Chart datasets prepared for the template (JSON-serializable)
    chart_data = {
        "daily": daily_rows,
        "channels": channels,
        "devices": devices,
    }

    # Friendly metric values - pre-formatted strings for the template
    def _fmt_pct(v: float | None) -> str:
        if not v:
            return "0%"
        return f"{v * 100:.1f}".rstrip("0").rstrip(".") + "%"

    def _fmt_duration(s: float | None) -> str:
        if not s:
            return "0s"
        s = int(s)
        if s < 60:
            return f"{s}s"
        m, sec = divmod(s, 60)
        if m < 60:
            return f"{m}m {sec:02d}s"
        h, m = divmod(m, 60)
        return f"{h}h {m:02d}m"

    # Annotate rows with display-ready strings
    overview_totals["engagementRate_display"] = _fmt_pct(overview_totals.get("engagementRate"))
    for row in top_pages:
        row["time_per_user_display"] = _fmt_duration(row.get("time_per_user"))
        row["engagementRate_display"] = _fmt_pct(row.get("engagementRate"))
    for row in analyses_pages:
        row["time_per_user_display"] = _fmt_duration(row.get("time_per_user"))
    for row in analyses_landing:
        row["engagementRate_display"] = _fmt_pct(row.get("engagementRate"))

    display_start, display_end = _range_display(range_key)
    context = {
        **admin.site.each_context(request),
        "title": "GA Dashboard",
        "range_key": range_key,
        "start_date": start_date,
        "end_date": end_date,
        "display_start": display_start,
        "display_end": display_end,
        "overview": overview_totals,
        "new_vs_returning": nvr,
        "channels": channels,
        "sources": sources,
        "countries": countries,
        "cities": cities,
        "devices": devices,
        "screens": screens,
        "browsers": browsers,
        "operating_systems": operating_systems,
        "top_pages": top_pages,
        "analyses_pages": analyses_pages,
        "analyses_landing": analyses_landing,
        "analyses_sources": analyses_sources,
        "analysis_clicks": analysis_clicks,
        "analysis_clicks_by_source": analysis_clicks_by_source,
        "analyses_summary": analyses_summary,
        "chart_data_json": chart_data,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    return render(request, "admin/ga_dashboard.html", context)
