'use client';

import { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';

interface VideoRoomProps {
  sessionId: string;
}

export function VideoRoom({ sessionId }: VideoRoomProps) {
  const [loading, setLoading] = useState(true);
  const roomName = `skillbridge-${sessionId}`;
  const jitsiUrl = `https://meet.jit.si/${roomName}#config.disableThirdPartyRequests=true&config.disableDeepLinking=true&interfaceConfig.SHOW_PROMOTIONAL_CLOSE_PAGE=false`;

  return (
    <div className="surface border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between bg-surface-2 border-b px-4 py-2">
        <p className="text-sm font-semibold text-fg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Video Session — {roomName}
        </p>
        <a
          href={jitsiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:underline flex items-center gap-1"
        >
          Open in new tab <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="relative" style={{ height: '600px' }}>
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface z-10">
            <Loader2 className="w-6 h-6 animate-spin text-accent mb-2" />
            <p className="text-sm text-muted">Connecting to video room…</p>
          </div>
        )}
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; screen-wake-lock;"
          style={{ width: '100%', height: '100%', border: 'none' }}
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}
