import { TeacherHeader } from "@/components/teacher/teacher-header";
import { StudentList } from "@/components/teacher/student-list";
import { allStudentData, avatars, backgrounds } from "@/lib/data";

export default function TeacherDashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <TeacherHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <h1 className="text-2xl font-bold mb-4">All Students</h1>
        <StudentList students={allStudentData} avatars={avatars} backgrounds={backgrounds} />
      </main>
    </div>
  );
}
