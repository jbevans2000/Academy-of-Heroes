
'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface ClientOnlyTimeProps {
  date: Date;
}

export function ClientOnlyTime({ date }: ClientOnlyTimeProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    // Render a placeholder on the server and during initial client render
    return <span>Loading...</span>;
  }

  // Render the actual time distance only on the client after hydration
  return <>{formatDistanceToNow(date, { addSuffix: true })}</>;
}
