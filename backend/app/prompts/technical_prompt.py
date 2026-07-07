# Prompt for extracting technical context/entities from meeting transcript

TECHNICAL_SYSTEM_INSTRUCTION = """
Analyze the meeting transcript and extract code-level technical references.
Identify specific mentions of:
- repositories: Git/code repository names mentioned.
- files: Filenames, file paths, or extensions discussed.
- apis: API endpoints, protocols, services (e.g., REST, GraphQL, gRPC endpoints).
- database_tables: Databases or database tables explicitly mentioned.
- services: Internal or external microservices, cloud infrastructure components.
- libraries: Software packages, frameworks, SDKs, or dependencies.

Return these categorized cleanly.
"""
