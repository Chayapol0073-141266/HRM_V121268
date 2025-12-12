import { supabase } from './supabaseClient';
import { User, AttendanceRecord, LeaveRequest, SystemSettings, LogEntry, Role, NewsItem } from '../types';
import { DEFAULT_SETTINGS, MOCK_USERS, MOCK_NEWS } from '../constants';

// --- Mappers to handle Snake Case (DB) <-> Camel Case (App) ---

const mapUserFromDB = (u: any): User => ({
  id: u.id,
  username: u.username,
  password: u.password,
  fullName: u.full_name,
  role: u.role,
  departmentCode: u.department_code,
  position: u.position,
  attendanceType: u.attendance_type,
  shiftStart: u.shift_start,
  shiftEnd: u.shift_end,
});

const mapUserToDB = (u: User): any => ({
  id: u.id,
  username: u.username,
  password: u.password,
  full_name: u.fullName,
  role: u.role,
  department_code: u.departmentCode,
  position: u.position,
  attendance_type: u.attendanceType,
  shift_start: u.shiftStart,
  shift_end: u.shiftEnd,
});

const mapAttendanceFromDB = (a: any): AttendanceRecord => ({
  id: a.id,
  userId: a.user_id,
  date: a.date,
  checkInTime: a.check_in_time,
  checkOutTime: a.check_out_time,
  status: a.status,
  lat: a.lat,
  lng: a.lng,
  isOutOfRange: a.is_out_of_range,
  photoUrl: a.photo_url,
  reason: a.reason,
  locationName: a.location_name
});

const mapAttendanceToDB = (a: AttendanceRecord): any => ({
  id: a.id,
  user_id: a.userId,
  date: a.date,
  check_in_time: a.checkInTime,
  check_out_time: a.checkOutTime,
  status: a.status,
  lat: a.lat,
  lng: a.lng,
  is_out_of_range: a.isOutOfRange,
  photo_url: a.photoUrl,
  reason: a.reason,
  location_name: a.locationName
});

const mapLeaveFromDB = (l: any): LeaveRequest => ({
  id: l.id,
  userId: l.user_id,
  leaveType: l.leave_type,
  startDate: l.start_date,
  endDate: l.end_date,
  reason: l.reason,
  status: l.status,
  currentApproverRole: l.current_approver_role,
  approvalChain: l.approval_chain,
  approvals: l.approvals || [],
  attachmentUrl: l.attachment_url
});

const mapLeaveToDB = (l: LeaveRequest): any => ({
  id: l.id,
  user_id: l.userId,
  leave_type: l.leaveType,
  start_date: l.startDate,
  end_date: l.endDate,
  reason: l.reason,
  status: l.status,
  current_approver_role: l.currentApproverRole,
  approval_chain: l.approvalChain,
  approvals: l.approvals,
  attachment_url: l.attachmentUrl
});

// --- API Functions ---

export const initDB = async () => {
  try {
    // Check if users exist, if not seed with MOCK
    // Use proper error handling to avoid crash if table doesn't exist
    const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
    
    if (error) {
        console.warn("Database initialization warning: Users table might be missing or connection failed.", error.message);
        // Do not throw, allow app to continue using fallbacks
        return; 
    }

    if (count === 0) {
      console.log("Seeding Users...");
      for (const u of MOCK_USERS) {
        await supabase.from('users').insert(mapUserToDB(u));
      }
    }

    // Check Settings
    const { count: sCount } = await supabase.from('settings').select('*', { count: 'exact', head: true });
    if (sCount === 0) {
      console.log("Seeding Settings...");
      await supabase.from('settings').insert({
        id: 'default',
        center_lat: DEFAULT_SETTINGS.centerLat,
        center_lng: DEFAULT_SETTINGS.centerLng,
        radius_km: DEFAULT_SETTINGS.radiusKm,
        late_threshold_minutes: DEFAULT_SETTINGS.lateThresholdMinutes,
        shifts: DEFAULT_SETTINGS.shifts,
        ot_rates: DEFAULT_SETTINGS.otRates
      });
    }

    // Check News
    const { count: nCount } = await supabase.from('news').select('*', { count: 'exact', head: true });
    if (nCount === 0) {
      console.log("Seeding News...");
      for (const n of MOCK_NEWS) {
        await supabase.from('news').insert({
          id: n.id,
          title: n.title,
          summary: n.summary,
          content: n.content,
          date: n.date,
          author: n.author,
          image_url: n.imageUrl
        });
      }
    }
  } catch (err) {
      console.error("Critical InitDB Error:", err);
  }
};

export const resetDatabase = async () => {
    try {
        await supabase.from('logs').delete().neq('id', '0');
        await supabase.from('attendance').delete().neq('id', '0');
        await supabase.from('leaves').delete().neq('id', '0');
        await supabase.from('news').delete().neq('id', '0');
        await supabase.from('users').delete().neq('id', '0');
        await supabase.from('settings').delete().neq('id', '0');
        
        await initDB();
        
        return true;
    } catch (error) {
        console.error("Reset Error:", error);
        return false;
    }
};

export const getSettings = async (): Promise<SystemSettings> => {
  try {
    const { data, error } = await supabase.from('settings').select('*').single();
    if (error || !data) return DEFAULT_SETTINGS;
    
    return {
        centerLat: data.center_lat,
        centerLng: data.center_lng,
        radiusKm: data.radius_km,
        lateThresholdMinutes: data.late_threshold_minutes,
        shifts: data.shifts || DEFAULT_SETTINGS.shifts,
        otRates: data.ot_rates || DEFAULT_SETTINGS.otRates
    };
  } catch {
      return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: SystemSettings) => {
  const payload = {
    center_lat: settings.centerLat,
    center_lng: settings.centerLng,
    radius_km: settings.radiusKm,
    late_threshold_minutes: settings.lateThresholdMinutes,
    shifts: settings.shifts,
    ot_rates: settings.otRates
  };
  await supabase.from('settings').upsert({ id: 'default', ...payload });
};

export const getUsers = async (): Promise<User[]> => {
  const { data } = await supabase.from('users').select('*');
  if (!data || data.length === 0) return MOCK_USERS; // Fallback for list as well
  return (data || []).map(mapUserFromDB);
};

export const getUser = async (username: string): Promise<User | undefined> => {
  try {
      const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
      
      if (!error && data) {
          return mapUserFromDB(data);
      }
      
      // If error (e.g. 406 Not Acceptable, Table not found) or no data
      console.log(`User ${username} not found in DB or DB error. Using local mock fallback.`);
  } catch (e) {
      console.warn("Exception fetching user:", e);
  }

  // Fallback to MOCK_USERS
  const localUser = MOCK_USERS.find(u => u.username === username);
  return localUser;
};

export const saveUser = async (user: User) => {
  await supabase.from('users').upsert(mapUserToDB(user));
};

export const deleteUser = async (userId: string) => {
  await supabase.from('users').delete().eq('id', userId);
};

export const getAttendance = async (): Promise<AttendanceRecord[]> => {
  try {
      const { data } = await supabase.from('attendance').select('*').order('date', { ascending: false });
      return (data || []).map(mapAttendanceFromDB);
  } catch {
      return [];
  }
};

export const addAttendance = async (record: AttendanceRecord) => {
  await supabase.from('attendance').upsert(mapAttendanceToDB(record));
};

export const deleteAttendance = async (id: string) => {
  await supabase.from('attendance').delete().eq('id', id);
};

export const getLeaves = async (): Promise<LeaveRequest[]> => {
  try {
      const { data } = await supabase.from('leaves').select('*').order('start_date', { ascending: false });
      return (data || []).map(mapLeaveFromDB);
  } catch {
      return [];
  }
};

export const saveLeave = async (leave: LeaveRequest) => {
  await supabase.from('leaves').upsert(mapLeaveToDB(leave));
};

export const deleteLeave = async (leaveId: string) => {
  await supabase.from('leaves').delete().eq('id', leaveId);
};

export const addLog = async (userId: string, action: string, details: string) => {
  try {
    const newLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user_id: userId,
        action,
        details
    };
    await supabase.from('logs').insert(newLog);
  } catch (e) {
      console.warn("Failed to add log", e);
  }
};

export const getLogs = async (): Promise<LogEntry[]> => {
  const { data } = await supabase.from('logs').select('*').order('timestamp', { ascending: false });
  return (data || []).map((l: any) => ({
    id: l.id,
    timestamp: l.timestamp,
    userId: l.user_id,
    action: l.action,
    details: l.details
  }));
};

export const getNews = async (): Promise<NewsItem[]> => {
    try {
        const { data } = await supabase.from('news').select('*').order('date', { ascending: false });
        if (!data || data.length === 0) return MOCK_NEWS;
        return (data || []).map((n: any) => ({
            id: n.id,
            title: n.title,
            summary: n.summary,
            content: n.content,
            date: n.date,
            author: n.author,
            imageUrl: n.image_url
        }));
    } catch {
        return MOCK_NEWS;
    }
};

// Utils
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
