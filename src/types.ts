export type Role = 'patient' | 'doctor' | 'admin';
export type UserStatus = 'active' | 'pending' | 'rejected' | 'suspended' | 'approved';
export type AppointmentStatus = 'confirmed' | 'waiting' | 'in_consultation' | 'completed' | 'cancelled';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  avatar_url?: string;
  doctorId?: number;
  patientId?: number;
  doctorDetails?: DoctorProfile;
  patientDetails?: PatientProfile;
  created_at?: string;
}

export interface Specialty {
  id: number;
  name: string;
  name_bn?: string;
  slug: string;
  icon?: string;
  description?: string;
  status: 'active' | 'inactive';
  active_doctors?: number;
}

export interface DoctorProfile {
  id: number;
  user_id: number;
  specialty_id: number;
  title: string;
  bmdc_number: string;
  qualification: string;
  experience_years: number;
  bio?: string;
  consultation_fee: number;
  approval_status: UserStatus;
  status?: UserStatus;
  rejection_reason?: string;
  approved_at?: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  specialty_name?: string;
  specialty_name_bn?: string;
  specialty_icon?: string;
  chambers_summary?: string;
  chambers_list?: string[];
  cities?: string;
  available_days?: string;
  available_days_list?: string[];
  created_at?: string;
}

export interface PatientProfile {
  id: number;
  user_id: number;
  blood_group?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  emergency_contact?: string;
}

export interface Chamber {
  id: number;
  doctor_id: number;
  name: string;
  address: string;
  city: string;
  area: string;
  phone?: string;
  map_location?: string;
  consultation_fee?: number;
  follow_up_fee?: number;
  created_at?: string;
}

export interface Schedule {
  id: number;
  doctor_id: number;
  chamber_id: number;
  chamber_name?: string;
  chamber_area?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  max_serials: number;
  slot_duration_minutes: number;
  is_active: number;
  fee?: number;
}

export interface SerialSlot {
  serial_number: number;
  serial_formatted: string;
  estimated_time: string;
  status: 'available' | 'booked' | 'blocked';
}

export interface Appointment {
  id: number;
  appointment_id: string;
  patient_id?: number;
  doctor_id: number;
  chamber_id: number;
  schedule_id: number;
  schedule_date: string;
  serial_number: number;
  appointment_time: string;
  patient_name: string;
  patient_phone: string;
  patient_age: number;
  patient_gender: 'male' | 'female' | 'other';
  problem_description?: string;
  fee: number;
  consultation_fee?: number;
  payment_status: 'unpaid' | 'paid' | 'exempt';
  status: AppointmentStatus;
  created_at: string;
  // Joins
  doctor_title?: string;
  doctor_name?: string;
  doctor_avatar?: string;
  specialty_name?: string;
  chamber_name?: string;
  chamber_address?: string;
  chamber_area?: string;
  chamber_city?: string;
  chamber_phone?: string;
}

export interface TestResultItem {
  step: number;
  title: string;
  success: boolean;
  details: string;
  timestamp: string;
}
