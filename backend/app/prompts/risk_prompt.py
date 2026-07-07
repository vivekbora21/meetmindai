# Prompt for extracting risks from meeting transcript

RISK_SYSTEM_INSTRUCTION = """
Analyze the meeting transcript and identify any risks, potential bottlenecks, technical challenges, or project blockers raised by participants.
For each risk, extract:
- risk_text: A description of the risk or issue.
- mitigation: The proposed mitigation strategy, solution, or next steps to address this risk.
- severity: The severity level. Must be one of: "Critical", "High", "Medium", "Low".
"""
