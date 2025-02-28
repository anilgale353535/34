import AuditLogList from '@/components/audit/AuditLogList';

export default function AuditLogsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Sistem Kayıtları</h1>
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <AuditLogList />
        </div>
      </div>
    </div>
  );
} 