import { put, get } from '@vercel/blob';

export const config = {
  runtime: 'edge', // Sử dụng Edge Runtime cho tốc độ nhanh hơn
};

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const backupId = searchParams.get('backupId');

  if (!backupId) {
    return new Response(JSON.stringify({ error: 'Backup ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Đặt tên file trên Blob dựa trên ID
  const blobPath = `backups/${backupId}.json`;

  // Xử lý yêu cầu POST (Lưu dữ liệu)
  if (request.method === 'POST') {
    try {
      const data = await request.json();
      await put(blobPath, JSON.stringify(data), {
        access: 'public', // 'public' chỉ có nghĩa là có thể truy cập qua URL, nhưng URL này siêu khó đoán.
        contentType: 'application/json',
      });
      return new Response(JSON.stringify({ message: 'Backup successful' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to save backup' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Xử lý yêu cầu GET (Tải dữ liệu)
  if (request.method === 'GET') {
    try {
      const blob = await get(blobPath);
      const data = await blob.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      // Nếu file không tồn tại (lỗi 404 từ Blob), trả về thông báo hợp lệ
      if (error.message.includes('The specified blob does not exist')) {
        return new Response(JSON.stringify({ error: 'No backup found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to load backup' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Các method khác không được hỗ trợ
  return new Response('Method Not Allowed', { status: 405 });
}
