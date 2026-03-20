export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type PredictionCategory = 'politics' | 'economy' | 'sports' | 'entertainment' | 'society' | 'tech'
export type PredictionStatus = 'active' | 'closed' | 'resolved' | 'cancelled'
export type PredictionResult = 'yes' | 'no' | 'cancelled'
export type UserChoice = 'yes' | 'no'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          points: number
          total_predictions: number
          correct_predictions: number
          level: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      predictions: {
        Row: {
          id: string
          question: string
          description: string | null
          category: PredictionCategory
          status: PredictionStatus
          result: PredictionResult | null
          yes_count: number
          no_count: number
          closes_at: string
          resolved_at: string | null
          source_url: string | null
          created_by: string | null  // null = AI生成
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['predictions']['Row'], 'id' | 'yes_count' | 'no_count' | 'created_at'>
        Update: Partial<Database['public']['Tables']['predictions']['Insert']>
      }
      user_predictions: {
        Row: {
          id: string
          user_id: string
          prediction_id: string
          choice: UserChoice
          points_wagered: number
          points_earned: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_predictions']['Row'], 'id' | 'points_earned' | 'created_at'>
        Update: Partial<Database['public']['Tables']['user_predictions']['Insert']>
      }
      points_history: {
        Row: {
          id: string
          user_id: string
          amount: number  // 正=獲得, 負=消費
          reason: string
          prediction_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['points_history']['Row'], 'id' | 'created_at'>
        Update: never
      }
      badges: {
        Row: {
          id: string
          name: string
          description: string
          icon: string
          condition_type: string
          condition_value: number
        }
        Insert: Database['public']['Tables']['badges']['Row']
        Update: Partial<Database['public']['Tables']['badges']['Insert']>
      }
      user_badges: {
        Row: {
          user_id: string
          badge_id: string
          earned_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_badges']['Row'], 'earned_at'>
        Update: never
      }
      friendships: {
        Row: {
          user_id: string
          friend_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['friendships']['Row'], 'created_at'>
        Update: never
      }
    }
  }
}
