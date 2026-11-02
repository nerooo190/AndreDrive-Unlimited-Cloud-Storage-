import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  // Reproduce a static Vercel host serving the SPA instead of the account API.
  await page.route('**/api/me',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html>SPA fallback</html>'}));
  await page.route('**/api/auth/register',route=>route.fulfill({status:405,contentType:'text/html',body:'Method not allowed'}));
  await page.goto('http://127.0.0.1:3000',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Kostenlos starten'}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Dein Name').fill('Registration Test');
  await dialog.getByLabel('E-Mail-Adresse').fill('registration@example.test');
  await dialog.getByLabel('Passwort',{exact:true}).fill('test-password-123');
  await dialog.getByRole('button',{name:'Workspace erstellen'}).click();
  await expect(dialog.getByRole('alert')).toContainText('Konto-API nicht eingerichtet');
  await expect(dialog.getByRole('button',{name:'Workspace erstellen'})).toBeEnabled();
  assert.deepEqual(errors,[]);
  console.log('Mobile registration regression passed: HTML fallback and HTTP 405 show an actionable error, no unhandled JavaScript rejection.');
} finally { await browser.close(); }
