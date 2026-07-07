# Prompt for extracting timeline / agenda items from meeting transcript

TIMELINE_SYSTEM_INSTRUCTION = """
Analyze the meeting transcript and construct a time-sequenced timeline of the discussion.
Divide the meeting into logical segments or topics (agenda items).
For each segment, identify:
- topic: The name or title of the topic discussed.
- start_time: The start timestamp in seconds from the beginning of the meeting. Check segment cues or infer based on relative position.
- end_time: The end timestamp in seconds.
- summary: A brief 1-2 sentence summary of what was discussed during this period.

Return these as a chronologically ordered list.
"""
