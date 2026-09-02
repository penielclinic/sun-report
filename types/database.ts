export type Role = "sun_leader" | "mission_leader" | "pastor";

export const SPECIAL_CATEGORIES = ["질병", "재정문제", "인간관계", "진로및직장문제", "기타"] as const;
export type SpecialCategory = (typeof SPECIAL_CATEGORIES)[number];

export const SPECIAL_STATUSES = ["기도중", "진행중", "해결됨"] as const;
export type SpecialStatus = (typeof SPECIAL_STATUSES)[number];

export interface SpecialReportItem {
  id: string;
  mission_report_id: string;
  mission_id: number;
  report_date: string;
  mission_leader: string | null;
  category: SpecialCategory;
  content: string;
  status: SpecialStatus;
  pastor_memo: string | null;
  created_at: string;
  updated_at: string;
}
export type ReportStatus = "draft" | "submitted";

export type ProfileStatus = "pending" | "active" | "rejected";

export interface Profile {
  id: string;
  name: string;
  role: Role;
  sun_number: number | null;
  mission_id: number | null;
  status: ProfileStatus;
  phone: string | null;
}

export interface SunReport {
  id: string;
  sun_number: number;
  sun_leader: string;
  mission_id: number;
  report_date: string;
  worship_at: string | null;
  worship_place: string | null;
  worship_leader: string | null;
  attend_total: number;
  bible_chapters: number;
  offering: number;
  special_note: string | null;
  status: ReportStatus;
  submitted_at: string | null;
  created_by: string;
  created_at: string;
}

export interface SunReportMember {
  id: string;
  report_id: string;
  member_name: string;
  attend_samil: boolean;
  attend_friday: boolean;
  attend_sun_day: boolean;
  attend_sun_eve: boolean;
  attend_sun: boolean;
  evangelism: boolean;
  bulletin_recv: boolean;
  bible_read: number;
  member_note: string | null;
}

export interface MissionReport {
  id: string;
  mission_id: number;
  report_date: string;
  mission_leader: string | null;
  total_sun: number;
  total_attend: number;
  total_bible: number;
  total_offering: number;
  special_note: string | null;
  status: ReportStatus;
  submitted_at: string | null;
  created_by: string;
  created_at: string;
}

export interface SunReportComment {
  id: string;
  report_id: string;
  author_id: string;
  author_name: string;
  author_role: Role;
  content: string;
  created_at: string;
}

export interface MissionReportComment {
  id: string;
  report_id: string;
  author_id: string;
  author_name: string;
  author_role: Extract<Role, "mission_leader" | "pastor">;
  content: string;
  created_at: string;
}

export interface SunReportWithMembers extends SunReport {
  sun_report_members: SunReportMember[];
}

export interface SunDirectory {
  sun_number: number;
  sun_leader: string;
  mission_id: number;
}

// Supabase generic DB type (simplified)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id">;
        Update: Partial<Omit<Profile, "id">>;
      };
      sun_reports: {
        Row: SunReport;
        Insert: Omit<SunReport, "id" | "created_at">;
        Update: Partial<Omit<SunReport, "id" | "created_at">>;
      };
      sun_report_members: {
        Row: SunReportMember;
        Insert: Omit<SunReportMember, "id">;
        Update: Partial<Omit<SunReportMember, "id">>;
      };
      mission_reports: {
        Row: MissionReport;
        Insert: Omit<MissionReport, "id" | "created_at">;
        Update: Partial<Omit<MissionReport, "id" | "created_at">>;
      };
      sun_directory: {
        Row: SunDirectory;
        Insert: SunDirectory;
        Update: Partial<SunDirectory>;
      };
    };
  };
}
