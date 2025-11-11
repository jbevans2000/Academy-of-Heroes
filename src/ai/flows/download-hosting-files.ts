
'use server';

/**
 * @fileOverview A flow to download all files from the latest Firebase Hosting release,
 * zip them, upload to Cloud Storage, and return a downloadable URL.
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { google } from 'googleapis';
import * as archiver from 'archiver';
import { PassThrough } from 'stream';

const PROJECT_ID = "academy-heroes-mziuf";
const BUCKET_NAME = `${PROJECT_ID}.appspot.com`;

// Self-contained Firebase Admin initialization for this specific flow
function getFlowAdminApp(): App {
    const aohAdminApp = getApps().find(app => app.name === 'flow-admin-app');
    if (aohAdminApp) {
        return aohAdminApp;
    }
    
    // In App Hosting, the SDK automatically uses the provisioned service account.
    return initializeApp({
        storageBucket: BUCKET_NAME,
    }, 'flow-admin-app');
}


interface ActionResponse {
  success: boolean;
  message?: string;
  downloadUrl?: string;
  error?: string;
}

// Helper to get an authenticated access token
async function getAccessToken() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  if (!accessToken.token) {
    throw new Error('Failed to obtain access token.');
  }
  return accessToken.token;
}

export async function downloadAndZipHostingFiles(): Promise<ActionResponse> {
  if (!PROJECT_ID) {
    return { success: false, error: 'Google Cloud Project ID is not configured.' };
  }

  try {
    const accessToken = await getAccessToken();
    const headers = { Authorization: `Bearer ${accessToken}` };

    // 1. Find the hosting site ID
    const sitesUri = `https://firebasehosting.googleapis.com/v1beta1/projects/${PROJECT_ID}/sites`;
    const sitesResponse = await fetch(sitesUri, { headers });
    if (!sitesResponse.ok) throw new Error(`Failed to list sites: ${await sitesResponse.text()}`);
    const sites = await sitesResponse.json();
    if (!sites.sites || sites.sites.length === 0) throw new Error('No Hosting sites found.');
    
    const site = sites.sites[0];
    const siteName = site.name; 
    const siteId = siteName.split('/').pop();

    // 2. Get the latest version name
    const releasesUri = `https://firebasehosting.googleapis.com/v1beta1/${siteName}/releases?pageSize=1`;
    const releasesResponse = await fetch(releasesUri, { headers });
    if (!releasesResponse.ok) throw new Error(`Failed to list releases: ${await releasesResponse.text()}`);
    const releases = await releasesResponse.json();
    const versionName = releases.releases?.[0]?.version?.name;
    if (!versionName) throw new Error('No releases found for the site.');

    // 3. List all files for that version (paginating if necessary)
    const allFiles: { path: string, hash: string }[] = [];
    let pageToken = '';
    do {
      const filesUri = `https://firebasehosting.googleapis.com/v1beta1/${versionName}/files?pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const filesResponse = await fetch(filesUri, { headers });
      if (!filesResponse.ok) throw new Error(`Failed to list files: ${await filesResponse.text()}`);
      const filesResult = await filesResponse.json();
      if (filesResult.files) {
        allFiles.push(...filesResult.files);
      }
      pageToken = filesResult.nextPageToken;
    } while (pageToken);

    // 4. Download files and create a zip in memory
    const archive = archiver('zip', { zlib: { level: 9 } });
    const streamPassThrough = new PassThrough();
    archive.pipe(streamPassThrough);

    await Promise.all(
        allFiles.map(async (file) => {
            const downloadUrl = `https://${siteId}.web.app${file.path}`;
            try {
                const response = await fetch(downloadUrl);
                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    archive.append(Buffer.from(buffer), { name: file.path.substring(1) });
                } else {
                     console.warn(`Skipping file (404 Not Found): ${downloadUrl}`);
                }
            } catch (e) {
                console.error(`Error fetching file ${downloadUrl}:`, e);
            }
        })
    );
    archive.finalize();

    // 5. Upload the zip to Cloud Storage
    const adminApp = getFlowAdminApp();
    const storage = getStorage(adminApp);
    const bucket = storage.bucket(BUCKET_NAME);
    const dateStamp = new Date().toISOString().split('T')[0];
    const fileName = `hosting-backups/hosting-files-${dateStamp}.zip`;
    const fileUpload = bucket.file(fileName);

    await new Promise((resolve, reject) => {
      streamPassThrough.pipe(fileUpload.createWriteStream({
        resumable: false,
        public: true, // Make the file publicly accessible
      }))
      .on('finish', resolve)
      .on('error', reject);
    });
    
    // The public URL is simpler
    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return {
      success: true,
      message: `Successfully created and uploaded zip file with ${allFiles.length} files.`,
      downloadUrl: downloadUrl,
    };

  } catch (error: any) {
    console.error('Error during hosting files backup:', error);
    return { success: false, error: error.message || 'An unknown error occurred.' };
  }
}
