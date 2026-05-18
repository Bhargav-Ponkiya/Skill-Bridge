/**
 * PulseBoard Logger Utility (Frontend)
 * 
 * Instructions:
 * 1. Add NEXT_PUBLIC_PULSEBOARD_INGEST_URL and NEXT_PUBLIC_PULSEBOARD_API_KEY to your SkillBridge frontend .env file
 * 2. Use it to log frontend errors:
 *    PulseBoardLogger.error('Failed to fetch data', { error: err.message });
 */

export class PulseBoardLogger {
  private static readonly INGEST_URL = process.env.NEXT_PUBLIC_PULSEBOARD_INGEST_URL || 'https://pulseboard-ingestor-service.onrender.com/ingest/logs';
  private static readonly API_KEY = process.env.NEXT_PUBLIC_PULSEBOARD_API_KEY;

  /**
   * Internal method to send logs to PulseBoard asynchronously without blocking the main thread.
   */
  private static async sendLog(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, any>) {
    if (!this.API_KEY) {
      console.warn('[PulseBoardLogger] Missing NEXT_PUBLIC_PULSEBOARD_API_KEY. Log not sent to PulseBoard.');
      return;
    }

    try {
      // Fire and forget
      fetch(this.INGEST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.API_KEY,
        },
        body: JSON.stringify({
          level,
          message,
          metadata: {
            ...metadata,
            source: 'frontend',
          },
        }),
      }).catch((err) => {
        // Silently fail if PulseBoard is unreachable
        console.error('[PulseBoardLogger] Failed to send log to PulseBoard:', err.message);
      });
    } catch (err) {
      console.error('[PulseBoardLogger] Setup error:', err);
    }
  }

  /**
   * Log an error to PulseBoard
   */
  static error(message: string, metadata?: Record<string, any>) {
    console.error(`[ERROR] ${message}`, metadata || '');
    this.sendLog('error', message, metadata);
  }

  /**
   * Log a warning to PulseBoard
   */
  static warn(message: string, metadata?: Record<string, any>) {
    console.warn(`[WARN] ${message}`, metadata || '');
    this.sendLog('warn', message, metadata);
  }

  /**
   * Log general info to PulseBoard
   */
  static info(message: string, metadata?: Record<string, any>) {
    console.info(`[INFO] ${message}`, metadata || '');
    this.sendLog('info', message, metadata);
  }
}
