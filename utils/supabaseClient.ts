import { createClient } from '@supabase/supabase-js';

// 获取环境变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("请确保 .env 文件中已配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY");
}

// 创建并导出客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);