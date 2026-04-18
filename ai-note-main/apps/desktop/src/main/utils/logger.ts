// Prevent EPIPE crashes when stdout/stderr pipe is closed
function safePrint(fn: (...args: any[]) => void, ...args: any[]) {
  try {
    fn(...args)
  } catch {
    // Ignore write errors (EPIPE) when pipe is closed
  }
}

export const logger = {
  info: (...args: any[]) => safePrint(console.log, '[INote]', ...args),
  error: (...args: any[]) => safePrint(console.error, '[INote ERROR]', ...args),
  warn: (...args: any[]) => safePrint(console.warn, '[INote WARN]', ...args),
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') safePrint(console.log, '[INote DEBUG]', ...args)
  }
}
