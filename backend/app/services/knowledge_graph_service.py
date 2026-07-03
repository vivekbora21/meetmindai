import logging
from sqlalchemy.orm import Session
from app.models.models import KnowledgeGraphNode, KnowledgeGraphEdge, Meeting, Speaker

logger = logging.getLogger(__name__)


class KnowledgeGraphService:
    def update_knowledge_graph(
        self, db: Session, meeting_id: str, technical_context: dict = None
    ) -> None:
        """
        Builds the Knowledge Graph for a meeting.
        Creates a Meeting node, Person nodes for each speaker, and Technology/Service nodes if present.
        Creates edges linking speakers and technologies to the meeting.
        Does not use any hardcoded/mock data.
        """
        try:
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
            if not meeting:
                logger.error(
                    f"KnowledgeGraphService | Meeting ID: {meeting_id} not found."
                )
                return

            org_id = meeting.organization_id
            created_nodes = []

            # 1. Create/get Meeting node
            meeting_node = (
                db.query(KnowledgeGraphNode)
                .filter(
                    KnowledgeGraphNode.organization_id == org_id,
                    KnowledgeGraphNode.entity_type == "Meeting",
                    KnowledgeGraphNode.name == meeting.title,
                )
                .first()
            )

            if not meeting_node:
                meeting_node = KnowledgeGraphNode(
                    organization_id=org_id,
                    entity_type="Meeting",
                    name=meeting.title,
                    description=meeting.executive_summary
                    or f"Session held on {meeting.meeting_date}",
                )
                db.add(meeting_node)
                db.flush()
            created_nodes.append(meeting_node)

            # 2. Create/get Person nodes for speakers
            speakers = db.query(Speaker).filter(Speaker.meeting_id == meeting_id).all()
            for speaker in speakers:
                person_node = (
                    db.query(KnowledgeGraphNode)
                    .filter(
                        KnowledgeGraphNode.organization_id == org_id,
                        KnowledgeGraphNode.entity_type == "Person",
                        KnowledgeGraphNode.name == speaker.display_name,
                    )
                    .first()
                )

                if not person_node:
                    person_node = KnowledgeGraphNode(
                        organization_id=org_id,
                        entity_type="Person",
                        name=speaker.display_name,
                        description=f"Participant in meeting: {meeting.title}",
                    )
                    db.add(person_node)
                    db.flush()

                # Link Person -> Meeting
                edge_exists = (
                    db.query(KnowledgeGraphEdge)
                    .filter(
                        KnowledgeGraphEdge.organization_id == org_id,
                        KnowledgeGraphEdge.source_node_id == person_node.id,
                        KnowledgeGraphEdge.target_node_id == meeting_node.id,
                        KnowledgeGraphEdge.relationship_type == "PARTICIPATED_IN",
                    )
                    .first()
                )

                if not edge_exists:
                    edge = KnowledgeGraphEdge(
                        organization_id=org_id,
                        source_node_id=person_node.id,
                        target_node_id=meeting_node.id,
                        relationship_type="PARTICIPATED_IN",
                    )
                    db.add(edge)

            # 3. Create nodes for technical context if provided (real extracted entities)
            if technical_context:
                # Iterate through lists of technical entities
                categories = {
                    "repositories": "Repository",
                    "files": "File",
                    "apis": "API",
                    "database_tables": "DatabaseTable",
                    "services": "Service",
                    "libraries": "Library",
                }

                for key, entity_type in categories.items():
                    entities = technical_context.get(key, [])
                    if isinstance(entities, list):
                        for entity_name in entities:
                            if not entity_name:
                                continue

                            tech_node = (
                                db.query(KnowledgeGraphNode)
                                .filter(
                                    KnowledgeGraphNode.organization_id == org_id,
                                    KnowledgeGraphNode.entity_type == entity_type,
                                    KnowledgeGraphNode.name == entity_name,
                                )
                                .first()
                            )

                            if not tech_node:
                                tech_node = KnowledgeGraphNode(
                                    organization_id=org_id,
                                    entity_type=entity_type,
                                    name=entity_name,
                                    description=f"Technical {entity_type} discussed in {meeting.title}",
                                )
                                db.add(tech_node)
                                db.flush()

                            # Link Technology -> Meeting
                            edge_exists = (
                                db.query(KnowledgeGraphEdge)
                                .filter(
                                    KnowledgeGraphEdge.organization_id == org_id,
                                    KnowledgeGraphEdge.source_node_id == tech_node.id,
                                    KnowledgeGraphEdge.target_node_id
                                    == meeting_node.id,
                                    KnowledgeGraphEdge.relationship_type
                                    == "DISCUSSED_IN",
                                )
                                .first()
                            )

                            if not edge_exists:
                                edge = KnowledgeGraphEdge(
                                    organization_id=org_id,
                                    source_node_id=tech_node.id,
                                    target_node_id=meeting_node.id,
                                    relationship_type="DISCUSSED_IN",
                                )
                                db.add(edge)

            db.flush()
            logger.info(
                f"KnowledgeGraphService | Meeting ID: {meeting_id} | Updated knowledge graph nodes & links."
            )
        except Exception as e:
            db.rollback()
            logger.error(
                f"KnowledgeGraphService | Meeting ID: {meeting_id} | Failed to update knowledge graph: {e}"
            )
            raise e
