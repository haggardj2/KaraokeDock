const SPLIT_DATABASE_VARIABLES = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;

const DATABASE_CONFIGURATION_ERROR =
  `Database connection is not configured. Set DATABASE_URL or ${SPLIT_DATABASE_VARIABLES.join(', ')}.`;

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const explicitDatabaseUrl = env.DATABASE_URL?.trim();
  if (explicitDatabaseUrl) {
    return explicitDatabaseUrl;
  }

  const host = env.DB_HOST?.trim();
  const name = env.DB_NAME?.trim();
  const user = env.DB_USER?.trim();
  const password = env.DB_PASSWORD;
  const port = env.DB_PORT?.trim() || '5432';

  const missing = [
    !host ? 'DB_HOST' : null,
    !name ? 'DB_NAME' : null,
    !user ? 'DB_USER' : null,
    !password ? 'DB_PASSWORD' : null,
  ].filter((value): value is string => value !== null);

  if (missing.length > 0) {
    throw new Error(`${DATABASE_CONFIGURATION_ERROR} Missing: ${missing.join(', ')}`);
  }

  const connectionUrl = new URL(`postgres://${host}:${port}`);
  connectionUrl.username = user;
  connectionUrl.password = password;
  connectionUrl.pathname = `/${name}`;
  return connectionUrl.toString();
}

export { DATABASE_CONFIGURATION_ERROR };
