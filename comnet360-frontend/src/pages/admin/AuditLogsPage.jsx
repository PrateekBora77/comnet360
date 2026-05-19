import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { auditApi } from '../../api/auth';
import { PageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

export default function AuditLogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => auditApi.getAll().then((r) => r.data),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Audit Logs</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{logs?.length ?? 0} log entries</p>
      </div>

      <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {!logs || logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <ClipboardList className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No audit logs</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {['Timestamp', 'User ID', 'Action', 'Entity Type', 'Entity ID', 'IP Address'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {logs.map((log) => (
                <tr key={log.auditId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-5 py-3 text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    <p className="text-slate-400 dark:text-slate-500">#{log.userId}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Badge color={
                      log.action.includes('DELETE') || log.action.includes('DEACTIVAT') ? 'red' :
                      log.action.includes('CREATE') || log.action.includes('REGISTER') || log.action.includes('ACTIVAT') ? 'green' :
                      log.action.includes('UPDATE') || log.action.includes('ROLE') ? 'blue' : 'slate'
                    }>{log.action}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300 text-xs">{log.entityType ?? '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{log.entityId ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-400 dark:text-slate-500 text-xs">{log.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
