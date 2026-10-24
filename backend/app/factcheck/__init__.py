"""Fact-check of spoken claims: uploaded sources (RAG) first, web search second.

Model: any OpenAI-compatible chat endpoint (`app.factcheck.llm`). Results are
`fact` events on the shared timeline (`app.events`).
"""
