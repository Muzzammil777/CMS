import { API_BASE } from '../api/apiBase';

/**
 * Fetch dashboard KPI summary from backend
 * Returns real data: total_students, total_faculty, active_events, dept_requests
 */
export async function getDashboardSummary() {
  try {
    const response = await fetch(`${API_BASE}/dashboard/summary`);
    
    if (!response.ok) {
      console.error('Failed to fetch dashboard summary:', response.status);
      return null;
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data;
    }
    
    console.error('Invalid dashboard summary response format:', result);
    return null;
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return null;
  }
}
