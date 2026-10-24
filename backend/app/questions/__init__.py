"""Question simulator: follow-up questions after the talk, answers compared with the sources.

Questions come mainly from fact-check findings (contradictions, statements not
found in the sources) and from upload passages the talk leaves out. The same
OpenAI-compatible model as the fact-check is used (`app.factcheck.llm`).
Answers are compared with source passages by verbatim quote, never scored.
"""
