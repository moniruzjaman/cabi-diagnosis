import { useAuth } from "../auth/AuthProvider.jsx";

export default function SyncChip() {
  const { pending } = useAuth();
  if (!pending) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "#fff7ed",
        color: "#9a3412",
        border: "1px solid #fed7aa",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      ফোনে সংরক্ষিত
    </div>
  );
}
