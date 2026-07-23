from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlalchemy.orm import Session
from app.database.connection import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get(
        self, db: Session, id: Any, organization_id: Optional[str] = None
    ) -> Optional[ModelType]:
        query = db.query(self.model).filter(self.model.id == id)
        if organization_id and hasattr(self.model, "organization_id"):
            query = query.filter(self.model.organization_id == organization_id)
        return query.first()

    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        organization_id: Optional[str] = None
    ) -> List[ModelType]:
        query = db.query(self.model)
        if organization_id and hasattr(self.model, "organization_id"):
            query = query.filter(self.model.organization_id == organization_id)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in: dict) -> ModelType:
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: ModelType, obj_in: dict) -> ModelType:
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(
        self, db: Session, *, id: Any, organization_id: Optional[str] = None
    ) -> ModelType:
        obj = self.get(db=db, id=id, organization_id=organization_id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj
