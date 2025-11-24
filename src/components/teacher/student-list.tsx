
'use client';

import { StudentCard } from './student-card';
import type { Student, QuestHub, Chapter, Company } from '@/lib/data';

interface StudentListProps {
  students: Student[];
  selectedStudents: string[];
  onSelectStudent: (uid: string) => void;
  teacherUid: string;
  onSendMessage: (student: Student) => void;
  hubs: QuestHub[];
  chapters: Chapter[];
  companies: Company[];
  onlineUids: string[];
}

export function StudentList({ students, selectedStudents, onSelectStudent, teacherUid, onSendMessage, hubs, chapters, companies, onlineUids }: StudentListProps) {
  if (students.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">No students have registered yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {students.map((student) => (
            <StudentCard
                key={student.uid}
                student={student}
                isSelected={selectedStudents.includes(student.uid)}
                onSelect={() => onSelectStudent(student.uid)}
                teacherUid={teacherUid}
                onSendMessage={onSendMessage}
                hubs={hubs}
                chapters={chapters}
                companies={companies}
                isOnline={onlineUids.includes(student.uid)}
            />
      ))}
    </div>
  );
}
