export type UserRole = 'customer' | 'provider' | 'admin'

export type TaskStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'

export type ServiceCategory =
  | 'cleaning'
  | 'moving'
  | 'repairs'
  | 'errands'
  | 'gardening'
  | 'painting'
  | 'plumbing'
  | 'electrical'
  | 'nanny'
  | 'elderly_care'
  | 'cat_sitting'
  | 'other'

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

export interface Task {
  id: string
  customer_id: string
  provider_id?: string
  title: string
  description: string
  category: ServiceCategory
  status: TaskStatus
  budget: number
  location: string
  scheduled_date?: string
  scheduled_time?: string
  latitude?: number
  longitude?: number
  photos?: string[]
  created_at: string
  customer?: Profile
  provider?: Profile
}

export interface Review {
  id: string
  task_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment?: string
  created_at: string
  reviewer?: Profile
}

export interface Bid {
  id: string
  task_id: string
  provider_id: string
  amount: number
  message?: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  provider?: Profile
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

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'payout_pending' | 'payout_sent'

export interface Payment {
  id: string
  task_id: string
  customer_id: string
  provider_id: string
  amount: number
  provider_amount: number
  payhere_order_id?: string
  payhere_payment_id?: string
  status: PaymentStatus
  created_at: string
  updated_at: string
  task?: Task
  provider?: Profile
  customer?: Profile
}
