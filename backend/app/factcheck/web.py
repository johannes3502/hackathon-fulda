"""Web search as the second source, only for claims the uploads do not settle.

Uses search APIs that return text, never HTML scraping (AGENTS.md):
`wikipedia` (MediaWiki API, no key) or `tavily` (search API with key).
Search queries derived from the transcript leave the system; the UI names
the provider before the check starts.
"""

import os
import re
from typing import Protocol

import httpx
from pydantic import BaseModel

# Wikimedia rejects clients without contact information in the User-Agent
# (https://meta.wikimedia.org/wiki/User-Agent_policy).
USER_AGENT = ("PresentationTrainer/0.1 (https://github.com/johannes3502/hackathon-fulda; "
              "Hackathon Fulda prototype) httpx")


class WebPassage(BaseModel):
    title: str
    url: str
    text: str


class WebSearcher(Protocol):
    name: str

    def search(self, query: str, limit: int) -> list[WebPassage]:
        ...


_WORD = re.compile(r"\w+", re.UNICODE)


def _terms(text: str) -> set[str]:
    # Short tokens are mostly articles and prepositions; numbers always count.
    return {t for t in (w.casefold() for w in _WORD.findall(text)) if len(t) > 3 or t.isdigit()}


def best_passages(text: str, query: str, limit: int, max_chars: int = 1200) -> list[str]:
    """Split an article into paragraph blocks; keep those sharing most query terms."""
    paragraphs = [p.strip() for p in text.split("\n") if p.strip() and not p.strip().startswith("==")]
    blocks, current = [], ""
    for paragraph in paragraphs:
        if current and len(current) + len(paragraph) + 1 > max_chars:
            blocks.append(current)
            current = ""
        current = f"{current}\n{paragraph}".strip() if current else paragraph[:max_chars]
    if current:
        blocks.append(current)
    wanted = _terms(query)
    ranked = sorted(enumerate(blocks), key=lambda item: (-len(wanted & _terms(item[1])), item[0]))
    return [block for _, block in ranked[:limit] if wanted & _terms(block)]


class WikipediaSearcher:
    name = "wikipedia"

    def __init__(self, language: str = "de", *, pages: int = 2, transport=None):
        self.api = f"https://{language}.wikipedia.org/w/api.php"
        self.pages = pages
        self.transport = transport

    def search(self, query: str, limit: int) -> list[WebPassage]:
        with httpx.Client(timeout=httpx.Timeout(15, connect=5), transport=self.transport,
                          headers={"User-Agent": os.getenv("WEB_SEARCH_USER_AGENT") or USER_AGENT}) as client:
            found = client.get(self.api, params={
                "action": "query", "list": "search", "srsearch": query, "srlimit": self.pages,
                "format": "json", "formatversion": "2"})
            found.raise_for_status()
            passages = []
            for hit in found.json().get("query", {}).get("search", []):
                # Full plain-text extracts are only returned for one title per request.
                page = client.get(self.api, params={
                    "action": "query", "prop": "extracts|info", "inprop": "url", "explaintext": "1",
                    "titles": hit["title"], "format": "json", "formatversion": "2"})
                page.raise_for_status()
                for item in page.json().get("query", {}).get("pages", []):
                    for text in best_passages(item.get("extract", ""), query, limit):
                        passages.append(WebPassage(title=item["title"], url=item.get("fullurl", ""), text=text))
        wanted = _terms(query)
        passages.sort(key=lambda p: -len(wanted & _terms(p.text)))
        return passages[:limit]


class TavilySearcher:
    name = "tavily"

    def __init__(self, api_key: str, *, transport=None):
        self.api_key = api_key
        self.transport = transport

    def search(self, query: str, limit: int) -> list[WebPassage]:
        with httpx.Client(timeout=httpx.Timeout(30, connect=5), transport=self.transport) as client:
            response = client.post("https://api.tavily.com/search", headers={"Authorization": f"Bearer {self.api_key}"},
                                   json={"query": query, "max_results": limit, "search_depth": "basic"})
            response.raise_for_status()
        return [WebPassage(title=item.get("title") or item["url"], url=item["url"], text=item["content"])
                for item in response.json().get("results", []) if item.get("content")][:limit]


def web_provider() -> str:
    return os.getenv("WEB_SEARCH_PROVIDER", "none").strip().lower() or "none"


def configured_web_searcher() -> WebSearcher | None:
    provider = web_provider()
    if provider == "none":
        return None
    if provider == "wikipedia":
        return WikipediaSearcher(os.getenv("WEB_SEARCH_LANGUAGE", "de"))
    if provider == "tavily":
        key = os.getenv("TAVILY_API_KEY", "")
        if not key:
            raise ValueError("Set TAVILY_API_KEY or choose another WEB_SEARCH_PROVIDER")
        return TavilySearcher(key)
    raise ValueError("Unsupported WEB_SEARCH_PROVIDER")
