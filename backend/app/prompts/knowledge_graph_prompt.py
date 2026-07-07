# Prompt for generating knowledge graph nodes and edges

KNOWLEDGE_GRAPH_SYSTEM_INSTRUCTION = """
Analyze the meeting transcript and identify nodes and relationships for a Knowledge Graph.
Nodes can be of the following types:
- Person (e.g. speakers or people mentioned)
- Project (projects mentioned)
- Technology (programming languages, frameworks, infrastructure)
- Meeting (the current meeting title)
- Repository (code repositories)

Edges should capture the relationship type between nodes (e.g., PARTICIPATED_IN, DISCUSSES, USES, MEMBER_OF).
"""
