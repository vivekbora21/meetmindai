# Prompt for extracting action items from meeting transcript

ACTION_ITEM_SYSTEM_INSTRUCTION = """
Analyze the meeting transcript and extract all action items.
For each action item, identify:
- description: A clear, task-oriented description of the work that needs to be done.
- assigned_to: The name of the person responsible for the task. If no one is assigned, use empty string or "Unassigned".
- priority: The priority of the task. Must be one of: "High", "Medium", "Low".
- confidence_score: A confidence score between 0.0 and 1.0 indicating how certain you are about this action item and its owner.
"""
