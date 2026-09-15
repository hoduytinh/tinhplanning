import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowLeft, BookTemplate } from "lucide-react";
import Button from "../../shared/components/Button";
import ToastProvider, { useToast } from "../dashboard/Toast";
import TemplateCard from "./TemplateCard";
import { deleteTemplate, fetchTemplates } from "./templateApi";
import RoleGuard from "../../shared/RoleGuard";

function Inner() {
  const navigate = useNavigate();
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await fetchTemplates());
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (t) => {
    if (!window.confirm(`Xóa template "${t.name}"?`)) return;
    try {
      await deleteTemplate(t.id);
      toast("Đã xóa template.");
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const system = templates.filter((t) => t.is_system);
  const custom = templates.filter((t) => !t.is_system);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/meetings")}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} /> Cuộc họp
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <BookTemplate size={24} /> Templates cuộc họp
          </h1>
          <p className="text-sm text-slate-500">
            Mẫu cấu hình sẵn cho từng loại cuộc họp.
          </p>
        </div>
        <RoleGuard resource="meeting_templates" action="create">
          <Button onClick={() => navigate("/meeting-templates/new")}>
            <Plus size={16} /> Tạo template
          </Button>
        </RoleGuard>
      </div>

      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Hệ thống ({system.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {system.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onEdit={(tt) => navigate(`/meeting-templates/${tt.id}/edit`)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Tùy chỉnh ({custom.length})
            </h2>
            {custom.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có template tùy chỉnh.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {custom.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onEdit={(tt) => navigate(`/meeting-templates/${tt.id}/edit`)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default function TemplateListPage() {
  return (
    <ToastProvider>
      <Inner />
    </ToastProvider>
  );
}
