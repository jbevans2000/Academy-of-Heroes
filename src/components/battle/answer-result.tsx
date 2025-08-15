
import { Hourglass } from 'lucide-react';

export function AnswerResult() {
  return (
    <div className="text-center py-12">
      <Hourglass className="h-16 w-16 text-yellow-400 mx-auto mb-4 animate-spin" />
      <h2 className="text-3xl font-bold">Answer Submitted!</h2>
      <p className="text-muted-foreground mt-2 text-lg">Waiting for other players...</p>
    </div>
  );
}
