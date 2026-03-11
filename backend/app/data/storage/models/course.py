from sqlalchemy import Column, Integer, DateTime, VARCHAR, ForeignKey, Table, Index, func, cast, String
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import relationship

from app.database import Base


def create_tsvector(*args):
    exp = args[0]
    for e in args[1:]:
        exp += ' ' + e
    return func.to_tsvector('english', exp)


course_appointment_table = Table('course_appointment', Base.metadata,
                                 Column('course_id', ForeignKey('course.id'), primary_key=True),
                                 Column('appointment_id', ForeignKey('appointment.id'), primary_key=True)
                                 )

small_group_appointment_table = Table('small_group_appointment', Base.metadata,
                                      Column('small_group_id', ForeignKey('small_group.id'), primary_key=True),
                                      Column('appointment_id', ForeignKey('appointment.id'), primary_key=True)
                                      )


class Appointment(Base):
    __tablename__ = 'appointment'

    id = Column(Integer, primary_key=True, autoincrement=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    room = Column(VARCHAR(265), nullable=False)
    instructors = Column(VARCHAR(512), nullable=False)


class SmallGroup(Base):
    __tablename__ = 'small_group'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(VARCHAR(256), nullable=False)

    course_id = Column(Integer, ForeignKey('course.id'))
    course = relationship("Course", back_populates="small_groups")

    appointments = relationship("Appointment", secondary=small_group_appointment_table)


class Course(Base):
    __tablename__ = 'course'

    id = Column(Integer, primary_key=True, autoincrement=True)
    cid = Column(VARCHAR(32), nullable=False)
    name = Column(VARCHAR(512), nullable=False)
    description = Column(VARCHAR(1024), nullable=True)
    instructors = Column(VARCHAR(512), nullable=True)
    ou = Column(VARCHAR(128), nullable=True)

    small_groups = relationship("SmallGroup", back_populates="course")

    semester_id = Column(Integer, ForeignKey('semester.id'))
    semester = relationship("Semester", back_populates="courses")

    appointments = relationship("Appointment", secondary=course_appointment_table)

    __ts_vector__ = create_tsvector(
        cast(func.coalesce(cid, ''), postgresql.TEXT),
        cast(func.coalesce(name, ''), postgresql.TEXT)
    )

    __table_args__ = (
        Index(
            'idx_person_fts',
            __ts_vector__,
            postgresql_using='gin'
        ),
    )


class Semester(Base):
    __tablename__ = 'semester'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(VARCHAR(32), nullable=False)

    created = Column(DateTime, nullable=True, server_default=func.now())

    courses = relationship("Course", back_populates="semester")
