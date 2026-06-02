import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { auditApi, usersApi } from '../../api/auth';
import { PageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

export default function AuditLogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => auditApi.getAll().then((r) => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then((r) => r.data),
  });

  const userNameMap = useMemo(() => {
    const m = {};
    users?.forEach((u) => { m[u.userId] = u.name; });
    return m;
  }, [users]);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Audit Logs</h2>
        <p className="text-sm text-slate-500">{logs?.length ?? 0} log entries</p>
      </div>

      <div className="bg-white rounded-xl border border-sky-100 shadow-sm overflow-hidden">
        {!logs || logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <ClipboardList className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No audit logs</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 border-b border-sky-100">
              <tr>
                {['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {logs.map((log) => (
                <tr key={log.auditId} className="hover:bg-sky-50 transition-colors">
                  <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    <p className="text-slate-700 font-medium">{userNameMap[log.userId] ?? 'Unknown User'}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Badge color={
                      log.action.includes('DELETE') || log.action.includes('DEACTIVAT') ? 'red' :
                      log.action.includes('CREATE') || log.action.includes('REGISTER') || log.action.includes('ACTIVAT') ? 'green' :
                      log.action.includes('UPDATE') || log.action.includes('ROLE') ? 'blue' : 'slate'
                    }>{log.action}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{log.entityType ?? 'N/A'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{log.entityId ?? 'N/A'}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{log.ipAddress ?? 'N/A'}</td>
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
