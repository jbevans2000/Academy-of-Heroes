
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { CheckCircle, XCircle } from "lucide-react";
import type { Student } from "@/lib/data";

export interface Result {
  studentUid: string;
  studentName: string;
  answer: string;
  isCorrect: boolean;
  powerUsed?: string;
}

interface RoundResultsProps {
  results: Result[];
  allStudents: Student[];
}

export function RoundResults({ results, allStudents }: RoundResultsProps) {
  
  // Create a map for quick lookup of online status
  const onlineStatusMap = new Map(allStudents.map(s => [s.uid, s.onlineStatus?.status === 'online']));
  
  // Filter the results to only include online students
  const filteredResults = results.filter(r => onlineStatusMap.get(r.studentUid));

  const correctAnswers = filteredResults.filter(r => r.isCorrect).length;
  const incorrectAnswers = filteredResults.length - correctAnswers;

  if (filteredResults.length === 0) {
    return (
       <div className="text-center py-8 text-muted-foreground">
            No online students have submitted an answer for this round yet.
        </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">Character</TableHead>
          <TableHead>Answer</TableHead>
          <TableHead>Power Used</TableHead>
          <TableHead className="text-right w-[100px]">Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredResults.map((result, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{result.studentName}</TableCell>
            <TableCell>{result.answer}</TableCell>
            <TableCell className="font-semibold text-primary">{result.powerUsed || '---'}</TableCell>
            <TableCell className="text-right">
              {result.isCorrect ? (
                <CheckCircle className="h-5 w-5 text-green-500 inline-block" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 inline-block" />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3} className="font-bold text-lg text-right">Totals</TableCell>
          <TableCell className="text-right font-bold text-lg">
            <div className="flex flex-col items-end">
                <span className="text-green-500">{correctAnswers} Correct</span>
                <span className="text-red-500">{incorrectAnswers} Incorrect</span>
            </div>
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
