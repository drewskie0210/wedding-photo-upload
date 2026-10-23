Andrew & Catherine — Wedding Photo Upload (Vercel)

FILES
- index.html : mobile botanical wedding upload page (no Google iframe)
- api/upload.js : Vercel Function that saves resized JPEG photos to Google Drive

IMPORTANT: the page will appear as soon as it is deployed, but photo uploads
will NOT work until the Vercel Function is configured with Google OAuth.

NEEDED VERCEL ENVIRONMENT VARIABLES (Project Settings -> Environment Variables):
 GOOGLE_CLIENT_ID
 GOOGLE_CLIENT_SECRET
 GOOGLE_REFRESH_TOKEN
 GOOGLE_FOLDER_ID = 1Pivaro7TF6NZ8IaS4B-2vV2-PC27IsVq

The OAuth refresh token must have Google Drive file-creation scope and be
issued to the Google account that has edit access to the destination folder.
Setup involves Google Cloud Console OAuth consent, Google Drive API enablement,
and an OAuth 2.0 authorization flow. If the OAuth app remains in Testing mode,
refresh tokens may expire in 7 days; use an appropriate production configuration.
Never place these credentials in public HTML or a GitHub repository.

Vercel: deploy BOTH index.html and api/upload.js into the existing photo-only
repository, then configure env vars and redeploy. Don't touch RSVP project.
This example handles photos one at a time; resizes to 1800px and uploads JPEG.
It does not support videos or retain original photo resolution. Add abuse
controls (rate limiting, CAPTCHA, quota) and test on iPhone/Android before
sharing publicly. Vercel request size limits and plan quotas apply.
