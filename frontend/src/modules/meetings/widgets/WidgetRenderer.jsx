import EditableTable from "./EditableTable";
import NotesWidget from "./NotesWidget";

// Cột mặc định cho từng loại widget dạng bảng (khi template không cấu hình).
const DEFAULT_COLUMNS = {
  coverage_widget: ["Block", "Pass%", "Testplan%", "Statement", "Toggle", "Issues"],
  bug_widget: ["Bug#", "JIRA", "Title", "Severity", "Owner", "Status"],
  blocker_table: ["#", "Item", "Owner", "ETA", "Status"],
  milestone_widget: ["Milestone", "Date", "Status"],
  workload_widget: ["Person", "Task Count", "Status"],
  decision_log: ["Decision", "Person", "Date"],
  risk_widget: ["Risk", "Impact", "Mitigation"],
};

const TABLE_TYPES = new Set(Object.keys(DEFAULT_COLUMNS));

// Hiển thị & chỉnh sửa 1 section widget. Chuẩn hoá content rồi persist qua onSave.
export default function WidgetRenderer({ section, onSave, readOnly = false }) {
  const content = section.content || {};

  if (section.section_type === "notes" || section.section_type === "custom") {
    return (
      <NotesWidget
        value={content.html || ""}
        readOnly={readOnly}
        onChange={(html) => onSave({ ...content, html })}
      />
    );
  }

  if (TABLE_TYPES.has(section.section_type)) {
    const columns =
      content.columns ||
      content.config?.columns ||
      DEFAULT_COLUMNS[section.section_type];
    const rows = content.rows || [];
    return (
      <EditableTable
        columns={columns}
        rows={rows}
        readOnly={readOnly}
        onChange={(next) => onSave({ ...content, ...next })}
      />
    );
  }

  // action_items được render riêng ở cấp trang.
  return (
    <p className="text-sm text-slate-400">
      This section type is displayed in a separate area.
    </p>
  );
}
