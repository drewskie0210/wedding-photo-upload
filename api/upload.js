
const MAX_BYTES = 2.8 * 1024 * 1024;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.UPLOAD_SECRET;

  if (!url || !secret) {
    return res.status(503).json({
      error: 'Photo upload is not configured.'
    });
  }

  try {
    const chunks = [];
    let size = 0;

    for await (const chunk of req) {
      size += chunk.length;

      if (size > MAX_BYTES) {
        return res.status(413).json({
          error: 'Photo too large.'
        });
      }

      chunks.push(chunk);
    }

    const photo = Buffer.concat(chunks);

    if (photo.length < 4 ||
        photo[0] !== 0xff ||
        photo[1] !== 0xd8 ||
        photo[2] !== 0xff) {
      return res.status(415).json({
        error: 'Only JPEG photos are accepted.'
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        secret,
        mimeType: 'image/jpeg',
        data: photo.toString('base64')
      }),
      signal: AbortSignal.timeout(45000)
    });

    if (!response.ok) {
      throw new Error('Apps Script HTTP ' + response.status);
    }

    const result = await response.json();

    if (!result.success) {
      return res.status(502).json({
        error: 'Google Drive could not save the photo.'
      });
    }

    return res.status(200).json({success: true});

  } catch (error) {
    console.error('Photo upload failed:', error.message);

    return res.status(500).json({
      error: 'Could not upload photo. Please try again.'
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: false
  }
};
