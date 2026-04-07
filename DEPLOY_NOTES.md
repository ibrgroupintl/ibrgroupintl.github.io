# Deploy Notes

## Stable Firebase Hosting Deploy (PowerShell)

If Hosting deploy hangs or fails with upload retry/circular JSON errors, use the stable command:

```powershell
npm run deploy:hosting:stable
```

This runs Hosting deploy with:

- `FIREBASE_HOSTING_UPLOAD_CONCURRENCY=1`

which reduces upload parallelism and avoids known uploader instability.

## Manual equivalent

```powershell
$env:FIREBASE_HOSTING_UPLOAD_CONCURRENCY="1"; firebase deploy --only hosting
```
