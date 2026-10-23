// Vercel serverless endpoint. Requires OAuth env vars documented in README.
// Receives resized JPEG bytes. Do not expose any OAuth secrets in index.html.
const MAX_BYTES = 2.8 * 1024 * 1024;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_FOLDER_ID } = process.env;
  if (![GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_FOLDER_ID].every(Boolean)) {
    return res.status(503).json({error: 'Photo storage not configured yet.'});
  }
  try {
    let buffers = [], size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BYTES) return res.status(413).json({error: 'Photo too large after resizing.'});
      buffers.push(chunk);
    }
    const photo = Buffer.concat(buffers);
    // Verify JPEG signature (not just Content-Type header).
    if (photo.length < 4 || photo[0] !== 0xFF || photo[1] !== 0xD8 || photo[2] !== 0xFF) {
      return res.status(415).json({error: 'Only JPEG photos are accepted.'});
    }
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'},
      body: new URLSearchParams({client_id:GOOGLE_CLIENT_ID,client_secret:GOOGLE_CLIENT_SECRET,
        refresh_token:GOOGLE_REFRESH_TOKEN,grant_type:'refresh_token'})
    });
    if (!tokenRes.ok) throw new Error('Google authorization failed');
    const { access_token } = await tokenRes.json();
    const metadata = JSON.stringify({
      name: `Wedding_${Date.now()}_${Math.random().toString(36).slice(2,10)}.jpg`,
      mimeType:'image/jpeg', parents:[GOOGLE_FOLDER_ID]
    });
    const boundary = 'wedding_' + Math.random().toString(36).slice(2);
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`),
      photo,
      Buffer.from(`\r\n--${boundary}--`)
    ]);
    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',{
      method:'POST',
      headers:{Authorization:`Bearer ${access_token}`, 'Content-Type':`multipart/related; boundary=${boundary}`},
      body:payload
    });
    if (!uploadRes.ok) {
      console.error('Drive upload failed',uploadRes.status, (await uploadRes.text()).slice(0,300));
      return res.status(502).json({error:'Could not save photo to Google Drive.'});
    }
    return res.status(200).json({success:true});
  } catch (error) {
    console.error('Photo upload error',error.message);
    return res.status(500).json({error:'Could not upload photo. Please try again.'});
  }
};
