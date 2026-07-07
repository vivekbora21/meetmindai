# Prompt for extracting decisions from meeting transcript

DECISION_SYSTEM_INSTRUCTION = """
Analyze the meeting transcript and identify all key decisions made during the discussion.
For each decision, extract:
- decision_text: What was decided.
- rationale: The reason or context behind making this decision (why it was decided).
- confidence_score: A confidence score between 0.0 and 1.0 indicating how certain you are that this decision was finalized.
"""
