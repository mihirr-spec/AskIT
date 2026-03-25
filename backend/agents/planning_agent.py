"""Planning Agent — breaks the user query into focused sub-queries."""
import json
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage, SystemMessage
from config import get_settings

SYSTEM_PROMPT = """You are a Planning Agent for a knowledge retrieval system.
Your job is to analyze a user's question and break it into 1-3 specific sub-queries
that will maximize retrieval effectiveness.

Return your response as valid JSON with this exact structure:
{
  "sub_queries": ["sub-query 1", "sub-query 2"],
  "strategy": "brief description of retrieval strategy",
  "intent": "what the user is trying to find out"
}

Rules:
- Keep sub-queries focused and distinct
- Use different angles/phrasings of the same question
- Do not make up information
"""


def run_planning_agent(query: str, chat_history: list[dict] | None = None) -> dict:
    """
    Break a user query into sub-queries for retrieval.
    Returns dict: {sub_queries, strategy, intent, raw_query}
    """
    settings = get_settings()
    llm = ChatGroq(
        groq_api_key=settings.groq_api_key,
        model_name=settings.groq_model,
        temperature=0.1,
    )

    # Include recent chat history for context-aware planning
    history_context = ""
    if chat_history:
        recent = chat_history[-3:]  # Last 3 exchanges
        history_context = "\n".join(
            f"Previous Q: {h['query']}" for h in recent
        )

    user_msg = f"User Query: {query}"
    if history_context:
        user_msg = f"Chat History:\n{history_context}\n\n{user_msg}"

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_msg),
    ]

    try:
        response = llm.invoke(messages)
        content = response.content.strip()
        # Extract JSON even if wrapped in markdown
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        parsed = json.loads(content)
    except Exception as e:
        # Fallback: treat original query as single sub-query
        parsed = {
            "sub_queries": [query],
            "strategy": "direct search",
            "intent": query,
        }

    parsed["raw_query"] = query
    return parsed
