/**
 * Analytics Data Service
 * Fetches analytics data from the FastAPI backend (/api/analytics).
 * NO direct MongoDB connections — all data flows through the Python backend.
 */

import { API_BASE } from '../api/apiBase';

/**
 * Fetch consolidated analytics data for the Analytics page.
 * Uses the FastAPI /api/analytics/dashboard endpoint with optional filters.
 */
export async function fetchAnalyticsData(startDate, endDate, department = null, semester = null) {
  try {
    const params = new URLSearchParams();
    if (department) params.set('department', department);
    if (semester) {
      // Extract semester number from strings like "Semester 4 (Current)"
      const semNum = typeof semester === 'string'
        ? parseInt(semester.replace(/[^0-9]/g, '')) || null
        : semester;
      if (semNum) params.set('semester', semNum);
    }

    const queryString = params.toString();
    const url = `${API_BASE}/analytics/dashboard${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Analytics API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      return result.data;
    }

    return result;
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return null;
  }
}

/**
 * Fetch analytics for a specific year and semester.
 */
export async function fetchSemesterAnalytics(year, semester) {
  try {
    const response = await fetch(`${API_BASE}/analytics/${year}/${semester}`);
    if (!response.ok) {
      throw new Error(`Semester analytics API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching semester analytics:', error);
    return null;
  }
}

/**
 * Fetch attendance data from the analytics dashboard.
 */
export async function fetchAttendanceData(startDate, endDate, department = null, semester = null) {
  const data = await fetchAnalyticsData(startDate, endDate, department, semester);
  return data?.attendanceData || [];
}

/**
 * Fetch performance data from the analytics dashboard.
 */
export async function fetchPerformanceData(startDate, endDate, department = null, semester = null) {
  const data = await fetchAnalyticsData(startDate, endDate, department, semester);
  return data?.performanceData || [];
}

/**
 * Fetch department data from the analytics dashboard.
 */
export async function fetchDepartmentData(semester = null) {
  const data = await fetchAnalyticsData(null, null, null, semester);
  return data?.departmentData || [];
}

/**
 * Fetch grade distribution from the analytics dashboard.
 */
export async function fetchGradeDistribution(department = null, semester = null) {
  const data = await fetchAnalyticsData(null, null, department, semester);
  return data?.gradeDistribution || [];
}
