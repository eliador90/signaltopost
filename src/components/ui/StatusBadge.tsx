type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      {status.toLowerCase().replaceAll("_", " ")}
    </span>
  );
}
