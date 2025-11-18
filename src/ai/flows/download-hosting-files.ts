
'use server';

/**
 * @fileOverview A flow to download all files from the latest Firebase Hosting release,
 * zip them, upload to Cloud Storage, and return a downloadable URL.
 * NOTE: This flow is currently non-functional as the 'archiver' package has been removed
 * to save disk space.
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { google } from 'googleapis';
// import * as archiver from 'archiver';
import { PassThrough } from 'stream';

const PROJECT_ID = "academy-heroes-mziuf";
const BUCKET_NAME = `academyheroesbackupfiles2025`;

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
  return { success: false, error: "This feature is temporarily disabled to conserve disk space. The 'archiver' package is not installed." };
}
