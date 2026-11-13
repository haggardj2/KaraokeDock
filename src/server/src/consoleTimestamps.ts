// Every line the server writes to the console starts with the date and time, e.g.
// "[2026-10-28T22:41:23.763Z] Serving web app from /app/web-dist". Imported first by index.ts,
// so it also covers the logger, startup messages and anything dependencies print.
const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;

for (const method of methods) {
  const write = console[method].bind(console);
  console[method] = (...args: unknown[]) => {
    const stamp = `[${new Date().toISOString()}]`;
    // Keep printf-style first arguments ("%s ...") working by joining the stamp into them.
    if (typeof args[0] === 'string') write(`${stamp} ${args[0]}`, ...args.slice(1));
    else write(stamp, ...args);
  };
}

export {};
