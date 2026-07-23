import re


def is_high_level_question(question: str) -> bool:
    # Normalize question: remove non-alphanumeric chars (except spaces) and lowercase it
    q = re.sub(r"[^\w\s]", "", question.lower().strip())

    high_level_phrases = [
        "what is this meeting about",
        "what was this meeting about",
        "main point",
        "main objective",
        "purpose of the meeting",
        "purpose of this meeting",
        "overall discussion",
        "give me an overview",
        "summarize this meeting",
        "summarize the meeting",
        "what happened in this meeting",
        "what happened in the meeting",
        "key discussion topics",
        "what was the focus",
        "meeting summary",
        "general summary",
        "overall summary",
        "executive summary",
        "high level summary",
    ]

    # Check for direct phrase matches
    for phrase in high_level_phrases:
        if phrase in q:
            return True

    # Also check if it's asking for summary / overview / purpose in a short query
    words = q.split()
    if len(words) <= 5:
        short_keywords = {
            "summary",
            "overview",
            "purpose",
            "objective",
            "theme",
            "agenda",
            "focus",
        }
        if any(w in short_keywords for w in words):
            return True

    return False
