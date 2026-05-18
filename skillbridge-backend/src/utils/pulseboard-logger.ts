/**
 * PulseBoard Logger Utility
 * 
 * Instructions:
 * 1. Copy this file into your SkillBridge backend (e.g., src/utils/pulseboard-logger.ts)
 * 2. Add PULSEBOARD_INGEST_URL and PULSEBOARD_API_KEY to your SkillBridge .env file
 * 3. Use it in your global exception filter or error handlers:
 *    PulseBoardLogger.error('Database connection failed', { stack: err.stack, userId: req.user.id });
 */

export class PulseBoardLogger {
  private static readonly INGEST_URL = process.env.PULSEBOARD_INGEST_URL || 'https://your-pulseboard-api.onrender.com/ingest/logs';
  private static readonly API_KEY = process.env.PULSEBOARD_API_KEY;

  /**
   * Internal method to send logs to PulseBoard asynchronously without blocking the main thread.
   */
  private static async sendLog(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, any>) {
    if (!this.API_KEY) {
      console.warn('[PulseBoardLogger] Missing PULSEBOARD_API_KEY. Log not sent to PulseBoard.');
      return;
    }

    try {
      // Fire and forget - do not await in the main execution flow if possible
      fetch(this.INGEST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.API_KEY,
        },
        body: JSON.stringify({
          level,
          message,
          metadata: metadata || {},
        }),
      }).catch((err) => {
        // Silently fail if PulseBoard is unreachable so it doesn't crash SkillBridge
        console.error('[PulseBoardLogger] Failed to send log to PulseBoard:', err.message);
      });
    } catch (err) {
      // Catch synchronous errors (like invalid URL format)
      console.error('[PulseBoardLogger] Setup error:', err);
    }
  }

  /**
   * Log an error to PulseBoard (Ideal for catch blocks and global exception filters)
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
   * Log general info to PulseBoard (Use sparingly to avoid cluttering your DB)
   */
  static info(message: string, metadata?: Record<string, any>) {
    console.info(`[INFO] ${message}`, metadata || '');
    this.sendLog('info', message, metadata);
  }
}
