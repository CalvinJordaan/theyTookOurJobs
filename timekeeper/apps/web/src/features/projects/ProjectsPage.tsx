import { BudgetMeter } from './BudgetMeter';
import { StatusPill } from '../../components/StatusPill/StatusPill';
import { useProjects, useAllBudgets } from '../../api/hooks';
import styles from './ProjectsPage.module.css';

export function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: budgets = [] } = useAllBudgets();

  const budgetMap = new Map(budgets.map(b => [b.projectId, b]));

  if (isLoading) return <p>Loading projects…</p>;
  if (!projects.length) return <p className={styles.empty}>No projects found.</p>;

  return (
    <div className={styles.grid}>
      {projects.map(project => {
        const budget = budgetMap.get(project.id);
        return (
          <article key={project.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.projectName}>{project.name}</div>
                <div className={styles.clientName}>{project.clientName}</div>
              </div>
              <div>
                {project.code && <span className={styles.cardCode}>{project.code}</span>}
              </div>
            </div>

            <div>
              <StatusPill
                variant={project.isBillable ? 'success' : 'neutral'}
                label={project.isBillable ? 'Billable' : 'Non-billable'}
                showDot={false}
              />
            </div>

            {budget && <BudgetMeter budget={budget} />}
          </article>
        );
      })}
    </div>
  );
}
