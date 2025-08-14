'use client';

import { StudentCard } from './student-card';
import type { Student, Avatar, Background } from '@/lib/data';

interface StudentListProps {
  students: Student[];
  avatars: Avatar[];
  backgrounds: Background[];
}

export function StudentList({ students, avatars, backgrounds }: StudentListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {students.map((student) => {
        const studentAvatar = avatars.find(a => a.id === student.currentAvatarId) || avatars[0];
        const studentBackground = backgrounds.find(b => b.id === student.currentBackgroundId) || backgrounds[0];
        return (
            <StudentCard
                key={student.id}
                student={student}
                avatar={studentAvatar}
                background={studentBackground}
            />
        )
      })}
    </div>
  );
}
