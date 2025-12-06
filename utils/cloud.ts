import { supabase } from './supabaseClient';
import { generateSeed } from './math';

// 从 Supabase 获取所有歌曲
export const fetchSongsFromCloud = async () => {
  const { data, error } = await supabase
    .from('playlist')
    .select('*')
    .order('created_at', { ascending: false }); // 按上传时间倒序

  if (error) {
    console.error('Error fetching songs:', error);
    return [];
  }
  return data;
};

// 上传歌曲到 Supabase (Storage + Database)
export const uploadSongToCloud = async (file: File) => {
  // 1. 生成安全的文件名 (防止中文乱码，使用时间戳)
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
  const filePath = `${fileName}`;

  // 2. 上传文件到 Storage Bucket 'songs'
  const { error: uploadError } = await supabase.storage
    .from('songs')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  // 3. 获取公开访问链接 (Public URL)
  const { data: { publicUrl } } = supabase.storage
    .from('songs')
    .getPublicUrl(filePath);

  // 4. 计算视觉种子 (保留之前的数学逻辑)
  const uniqueId = generateSeed(file.name);

  // 5. 将信息写入 Database 'playlist'
  const { data, error: dbError } = await supabase
    .from('playlist')
    .insert([
      {
        name: file.name,
        url: publicUrl,
        unique_id: uniqueId,
      },
    ])
    .select()
    .single();

  if (dbError) {
    throw dbError;
  }

  return data;
};

// 删除歌曲
export const deleteSongFromCloud = async (id: string, fileUrl: string) => {
  // 1. 从数据库删除记录
  const { error } = await supabase
    .from('playlist')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
  
  // (可选) 进阶：如果你想同时删除 Storage 里的文件，需要解析 URL 拿到文件名
  // 为了代码简单，这里暂时只删数据库记录，不影响功能
};