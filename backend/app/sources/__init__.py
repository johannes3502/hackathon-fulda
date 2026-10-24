"""Uploaded sources (PDF, PPTX, DOCX, TXT, MD) for retrieval-augmented features.

Fact-check, question agent and other features use `app.sources.retrieval`:
`search()` for the top chunks of a collection, `format_context()` for prompts
and `quote_in_text()` to verify that a quoted passage really is in a chunk.
"""
