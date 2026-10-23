import packageInfo from "../../package.json";

export const APP_VERSION = packageInfo.version;

export default function AppVersion({ className }: { className?: string }) {
  return (
    <small
      className={className}
      aria-label={`Application version ${APP_VERSION}`}
      style={{ fontSize: 11, color: "#a1a1aa", whiteSpace: "nowrap" }}
    >
      KaraokeDock v{APP_VERSION}
    </small>
  );
}
