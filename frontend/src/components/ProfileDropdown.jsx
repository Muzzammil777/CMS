import { useNavigate } from 'react-router-dom';
import './ProfileDropdown.css';

export default function ProfileDropdown({
  isOpen = false,
  onClose,
  user = {},
  userId = 'N/A',
  role = 'student',
  onPrimaryAction,
  onSecondaryAction,
}) {
  const navigate = useNavigate();

  const handlePrimaryClick = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    }
    onClose();
  };

  const handleSecondaryClick = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
    }
    onClose();
  };

  const handleViewProfile = () => {
    if (onClose) {
      onClose();
    }
    if (role === 'student' && userId && userId !== 'N/A') {
      navigate(`/students/${encodeURIComponent(userId)}`);
    } else if ((role === 'faculty' || role === 'admin') && userId && userId !== 'N/A') {
      navigate(`/faculty/${encodeURIComponent(userId)}`);
    } else {
      navigate(`/settings`);
    }
  };

  return (
    <>
      {isOpen && (
        <div className="profile-dropdown-overlay" onClick={onClose} />
      )}
      <div className={`profile-dropdown ${isOpen ? 'open' : ''}`}>
        {/* Profile Header Section */}
        <div className="profile-dropdown-header">
          <div className="profile-header-content">
            <div className="profile-avatar-large overflow-hidden">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="avatar-initials-large">
                  {user.name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="profile-info">
              <h3 className="profile-name">{user.name || 'User'}</h3>
              <p className="profile-role">{user.label || 'Role'}</p>
            </div>
          </div>
        </div>

        {/* Profile Details Section */}
        <div className="profile-dropdown-content">
          <div className="profile-details-section">
            <div className="detail-row">
              <span className="detail-label">ID:</span>
              <span className="detail-value">{userId}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Team:</span>
              <span className="detail-value">{user.team || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Focus:</span>
              <span className="detail-value">{user.focus || 'N/A'}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="profile-actions">
            {role !== 'admin' && (
              <>
                <button
                  className="profile-action-btn primary"
                  onClick={handlePrimaryClick}
                >
                  {user.primaryAction || 'View Fees'}
                </button>
                <button
                  className="profile-action-btn secondary"
                  onClick={handleSecondaryClick}
                >
                  {user.secondaryAction || 'Manage Department'}
                </button>
              </>
            )}
            <button
              className="profile-action-btn tertiary"
              onClick={handleViewProfile}
            >
              View Full Profile
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
