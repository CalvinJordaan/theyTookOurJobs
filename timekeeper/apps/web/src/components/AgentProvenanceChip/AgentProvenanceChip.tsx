import styles from './AgentProvenanceChip.module.css';

interface Props {
  agentName?: string;
}

export function AgentProvenanceChip({ agentName = 'Agent' }: Props) {
  return (
    <span className={styles.chip} title={`Logged by ${agentName} via MCP`}>
      <svg className={styles.icon} viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <path d="M6 1a1 1 0 00-1 1v.5H3.5a1 1 0 00-1 1V8a1 1 0 001 1H5v.5a1 1 0 002 0V9h1.5a1 1 0 001-1V3.5a1 1 0 00-1-1H7V2a1 1 0 00-1-1zm-1.5 4a.75.75 0 111.5 0 .75.75 0 01-1.5 0zm2.25 0a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" />
      </svg>
      {agentName}
    </span>
  );
}
