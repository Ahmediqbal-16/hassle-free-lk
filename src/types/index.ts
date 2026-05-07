export type UserRole = 'customer' | 'provider' | 'admin'
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
export type PaymentMethod = 'cash' | 'online'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  avatar_url?: string
  city?: string
  is_verified: boolean
  is_rejected?: boolean
  nic_number?: string
  nic_front_path?: string
  nic_back_path?: string
  nic_submitted?: boolean
  created_at: string
}

export interface ServiceCategory {
  id: string
  name: string
  icon: string
  description?: string
  is_active: boolean
  sort_order: number
}

export interface ServicePackage {
  id: string
  category_id: string
  name: string
  description?: string
  price: number
  duration_minutes: number
  is_active: boolean
  sort_order: number
  category?: ServiceCategory
}

export interface Booking {
  id: string
  package_id: string
  customer_id: string
  provider_id?: string
  status: BookingStatus
  payment_method: PaymentMethod
  payment_status: string
  scheduled_date: string
  scheduled_time: string
  address: string
  area?: string
  latitude?: number
  longitude?: number
  notes?: string
  created_at: string
  updated_at: string
  package?: ServicePackage & { category?: ServiceCategory }
  customer?: Profile
  provider?: Profile
}

export interface Review {
  id: string
  booking_id?: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment?: string
  created_at: string
  reviewer?: Profile
}

export interface BankAccount {
  id: string
  provider_id: string
  bank_name: string
  account_name: string
  account_number: string
  branch?: string
  passbook_photo_path?: string
  created_at: string
  updated_at: string
}

export type NotificationType = 'info' | 'success' | 'warning' | 'task' | 'bid' | 'payment'

export interface Notification {
  id: string
  user_id: string
  title: string
  body?: string
  type: NotificationType
  read: boolean
  task_id?: string
  created_at: string
}
