import { formatStatusClass, getStatusTone } from '../lib/formatters';

const StatusBadge = ({ status }) => {
  return (
    <span
      className={`status-badge status-${formatStatusClass(status)} tone-${getStatusTone(status)}`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
