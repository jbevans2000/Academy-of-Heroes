

'use client';

import { StudentCard } from './student-card';
import type { Student, QuestHub, Chapter } from '@/lib/data';

interface StudentListProps {
  students: Student[];
  selectedStudents: string[];
  onSelectStudent: (uid: string) => void;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  teacherUid: string;
  onSendMessage: (student: Student) => void;
  hubs: QuestHub[];
  chapters: Chapter[];
}

export function StudentList({ students, selectedStudents, onSelectStudent, setStudents, teacherUid, onSendMessage, hubs, chapters }: StudentListProps) {
  if (students.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">No students have registered yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {students.map((student) => (
            <StudentCard
                key={student.uid}
                student={student}
                isSelected={selectedStudents.includes(student.uid)}
                onSelect={() => onSelectStudent(student.uid)}
                setStudents={setStudents}
                teacherUid={teacherUid}
                onSendMessage={onSendMessage}
                hubs={hubs}
                chapters={chapters}
            />
      ))}
    </div>
  );
}
