// Company logo + contact photo management — fetch, upload to Airtable, remove

import { getSetting } from '../database/queries/entities'
import { getDatabase, saveDatabase } from '../database/init'

const COMPANIES_TABLE_ID = 'tblEauAm0ZYuMbHUa'
const LOGO_FIELD_ID = 'fldhCu5ooToK84g4G'

function getApiHeaders(): Record<string, string> {
  const apiKey = getSetting('airtable_api_key')
  if (!apiKey) throw new Error('Airtable API key not configured')
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

function getBaseId(): string {
  const baseId = getSetting('airtable_base_id')
  if (!baseId) throw new Error('Airtable base ID not configured')
  return baseId
}

/**
 * Extract domain from a website URL (e.g., "https://www.example.com/about" → "example.com")
 */
function extractDomain(website: string): string {
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`)
    return url.hostname.replace(/^www\./, '')
  } catch {
    // If URL parsing fails, try to clean it up manually
    return website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  }
}

/**
 * Fetch logo URL from Logo.dev API for a given domain.
 * Falls back to Google Favicon API if Logo.dev fails.
 * Returns a publicly accessible URL that Airtable can download.
 */
export async function fetchLogoUrl(website: string): Promise<string> {
  const domain = extractDomain(website)

  // Try Logo.dev first (public token from settings, or skip if not configured)
  const logoDevToken = getSetting('logo_dev_token')
  const logoDevUrl = logoDevToken ? `https://img.logo.dev/${domain}?token=${logoDevToken}&size=128&format=png` : null
  if (logoDevUrl) {
    try {
      const response = await fetch(logoDevUrl, { method: 'HEAD' })
      if (response.ok) return logoDevUrl
    } catch {
      // Logo.dev failed, try fallback
    }
  }

  // Fallback: Google Favicon API (always works, returns a valid image URL)
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`
}

/**
 * Upload a logo to Airtable by providing a URL that Airtable will download.
 * Updates the Logo attachment field on the company record.
 */
export async function uploadLogoToAirtable(companyId: string, imageUrl: string): Promise<void> {
  const baseId = getBaseId()
  const url = `https://api.airtable.com/v0/${baseId}/${COMPANIES_TABLE_ID}/${companyId}`
  const headers = getApiHeaders()

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      fields: {
        [LOGO_FIELD_ID]: [{ url: imageUrl }],
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to upload logo: ${response.status} - ${errorText}`)
  }

  // Update local database with the new logo URL
  // After Airtable processes it, the URL will be an Airtable-hosted URL
  // For now, store the source URL — it'll be replaced on next sync
  const db = getDatabase()
  db.run('UPDATE companies SET logo_url = ? WHERE id = ?', [imageUrl, companyId])
  saveDatabase()
}

/**
 * Upload a local file as a company logo.
 * Reads the file, converts to base64 data URL, then uploads to Airtable.
 */
export async function uploadLocalFile(companyId: string, filePath: string): Promise<void> {
  const fs = await import('fs')
  const path = await import('path')

  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mime = ext === '.png' ? 'image/png'
    : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
    : ext === '.webp' ? 'image/webp'
    : ext === '.gif' ? 'image/gif'
    : 'image/png'

  // For Airtable attachment upload, we need a publicly accessible URL.
  // Since we have a local file, we'll use the Airtable attachment upload approach:
  // Write to a temp location and use a file URL — but Airtable needs HTTP URLs.
  // Alternative: use the Airtable content upload API
  // Simplest approach: write to temp, start a temp HTTP server, upload, stop server
  // Actually, Airtable supports uploading via their API with a content URL
  // Let's use a data URL approach - but Airtable doesn't accept data URLs for attachments

  // Best approach: use Airtable's attachment upload endpoint
  const baseId = getBaseId()
  const apiKey = getSetting('airtable_api_key')
  if (!apiKey) throw new Error('Airtable API key not configured')

  // Step 1: Get an upload URL from Airtable
  const uploadUrlResponse = await fetch(
    `https://content.airtable.com/v0/${baseId}/uploadAttachment`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contentType: mime,
        filename: path.basename(filePath),
      }),
    }
  )

  if (!uploadUrlResponse.ok) {
    const errText = await uploadUrlResponse.text()
    throw new Error(`Airtable attachment upload failed: ${uploadUrlResponse.status} - ${errText}`)
  }

  const uploadData = await uploadUrlResponse.json() as { uploadUrl: string; id: string; attachmentUrl: string }

  // Step 2: Upload the file content
  await fetch(uploadData.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mime },
    body: buffer,
  })

  // Step 3: Attach to the record
  const url = `https://api.airtable.com/v0/${baseId}/${COMPANIES_TABLE_ID}/${companyId}`
  await fetch(url, {
    method: 'PATCH',
    headers: getApiHeaders(),
    body: JSON.stringify({
      fields: {
        [LOGO_FIELD_ID]: [{ id: uploadData.id }],
      },
    }),
  })

  // Update local database
  const db = getDatabase()
  const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`
  db.run('UPDATE companies SET logo_url = ? WHERE id = ?', [dataUrl, companyId])
  saveDatabase()
}

/**
 * Remove logo from a company (clears the Airtable attachment field).
 */
export async function removeLogoFromAirtable(companyId: string): Promise<void> {
  const baseId = getBaseId()
  const url = `https://api.airtable.com/v0/${baseId}/${COMPANIES_TABLE_ID}/${companyId}`
  const headers = getApiHeaders()

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      fields: {
        [LOGO_FIELD_ID]: [],
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to remove logo: ${response.status} - ${errorText}`)
  }

  // Clear local database
  const db = getDatabase()
  db.run('UPDATE companies SET logo_url = NULL WHERE id = ?', [companyId])
  saveDatabase()
}

// ─── LinkedIn Company Logo Fetch ────────────────────────────────────

/**
 * Extract a company logo from a LinkedIn company page's DOM.
 * Company logos on LinkedIn use different selectors than profile photos.
 */
const EXTRACT_COMPANY_LOGO_JS = `
(function() {
  var allImgs = document.querySelectorAll('img[src*="media.licdn.com"]');
  // Method 1: img with "company-logo" in the URL
  for (var i = 0; i < allImgs.length; i++) {
    var src = allImgs[i].src;
    if (src.includes('company-logo') && !src.includes('ghost-org') && !src.includes('default-company')) {
      return src;
    }
  }
  // Method 2: Known LinkedIn CSS selectors for company logo
  var selectors = [
    'img.org-top-card-primary-content__logo-image',
    '.org-top-card-primary-content__logo img',
    '.org-top-card__primary-content img',
    'img.EntityPhoto-square-3',
    'img.EntityPhoto-square-4',
    'img.EntityPhoto-square-5',
  ];
  for (var j = 0; j < selectors.length; j++) {
    var img = document.querySelector(selectors[j]);
    if (img && img.src && img.src.includes('media.licdn.com')
        && !img.src.includes('ghost-org') && !img.src.includes('default-company')
        && !img.src.includes('profile-displaybackgroundimage')) {
      return img.src;
    }
  }
  // Method 3: Any roughly-square media.licdn.com img that's not a profile photo or banner
  for (var k = 0; k < allImgs.length; k++) {
    var s = allImgs[k].src;
    if (s.includes('profile-displayphoto') || s.includes('profile-displaybackgroundimage')
        || s.includes('ghost-') || s.includes('default-')) continue;
    var w = allImgs[k].naturalWidth || allImgs[k].width;
    var h = allImgs[k].naturalHeight || allImgs[k].height;
    if (w >= 80 && h >= 80 && Math.abs(w - h) / Math.max(w, h) < 0.3) {
      return s;
    }
  }
  return null;
})()
`

/**
 * Fetch a company logo from their LinkedIn company page.
 * Uses the same persistent session as contact photos ('persist:linkedin').
 */
export async function fetchLinkedInCompanyLogo(linkedInUrl: string): Promise<string> {
  const { BrowserWindow, session } = await import('electron')

  if (!linkedInUrl.startsWith('https://') && !linkedInUrl.startsWith('http://')) {
    linkedInUrl = `https://${linkedInUrl}`
  }

  // Validate this is actually a LinkedIn URL
  try {
    const parsed = new URL(linkedInUrl)
    if (parsed.hostname !== 'linkedin.com' && !parsed.hostname.endsWith('.linkedin.com')) {
      throw new Error('URL must be a LinkedIn URL (linkedin.com)')
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('LinkedIn')) throw e
    throw new Error('Invalid LinkedIn URL')
  }

  const linkedInSession = session.fromPartition('persist:linkedin')

  // Attempt 1: Silent fetch with persisted cookies
  const silentResult = await tryExtractCompanyLogo(BrowserWindow, linkedInSession, linkedInUrl)
  if (silentResult) return silentResult

  // Attempt 2: Show window so user can log in
  return new Promise<string>((resolve, reject) => {
    const win = new BrowserWindow({
      width: 1100,
      height: 750,
      show: true,
      title: 'Log in to LinkedIn — then this window will close automatically',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: linkedInSession,
      },
    })

    let settled = false
    const targetPath = new URL(linkedInUrl).pathname
    let redirectedToTarget = false
    let extractAttempts = 0

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        win.destroy()
        reject(new Error('LinkedIn login timed out. Try again.'))
      }
    }, 90000)

    win.on('closed', () => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        reject(new Error('LinkedIn window was closed before the logo could be fetched.'))
      }
    })

    win.webContents.on('did-finish-load', async () => {
      await new Promise(r => setTimeout(r, 2000))
      if (settled) return
      extractAttempts++

      try {
        const currentUrl = win.webContents.getURL()
        const currentPath = new URL(currentUrl).pathname
        const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/checkpoint')
        const isTargetPage = currentPath.startsWith(targetPath)

        if (!isLoginPage && !isTargetPage && !redirectedToTarget) {
          redirectedToTarget = true
          win.loadURL(linkedInUrl)
          return
        }

        if (isTargetPage) {
          await new Promise(r => setTimeout(r, 1500))
          const logoUrl = await win.webContents.executeJavaScript(EXTRACT_COMPANY_LOGO_JS)
          if (logoUrl) {
            settled = true
            clearTimeout(timeout)
            win.destroy()
            resolve(logoUrl)
            return
          }
        }

        if (extractAttempts >= 10) {
          settled = true
          clearTimeout(timeout)
          win.destroy()
          reject(new Error('Could not find a company logo on this LinkedIn page.'))
        }
      } catch { /* ignore during login flow */ }
    })

    win.loadURL(linkedInUrl).catch((err) => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        win.destroy()
        reject(new Error(`Failed to navigate to LinkedIn: ${String(err)}`))
      }
    })
  })
}

/** Silent attempt to extract a company logo from LinkedIn */
function tryExtractCompanyLogo(
  BrowserWindow: typeof import('electron').BrowserWindow,
  linkedInSession: Electron.Session,
  url: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 1280, height: 900, show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true, session: linkedInSession },
    })
    let done = false
    const finish = (result: string | null) => {
      if (done) return
      done = true
      clearTimeout(timer)
      win.destroy()
      resolve(result)
    }
    const timer = setTimeout(() => finish(null), 12000)
    win.webContents.on('did-finish-load', async () => {
      await new Promise(r => setTimeout(r, 3000))
      if (done) return
      try {
        const logoUrl = await win.webContents.executeJavaScript(EXTRACT_COMPANY_LOGO_JS)
        finish(logoUrl || null)
      } catch {
        finish(null)
      }
    })
    win.webContents.on('did-fail-load', () => finish(null))
    win.loadURL(url).catch(() => finish(null))
  })
}

// ─── Contact Photo Management ───────────────────────────────────────

const CONTACTS_TABLE_ID = 'tbl9Q8m06ivkTYyvR'
const CONTACT_PHOTO_FIELD_ID = 'fldl1WOfz7vHNSOUd'

/**
 * Extract a profile photo URL from a LinkedIn page's DOM.
 * Skips og:image (that's always the banner) and filters out background images.
 */
const EXTRACT_PHOTO_JS = `
(function() {
  // Method 1: img with "profile-displayphoto-shrink" in URL (the actual headshot)
  var allImgs = document.querySelectorAll('img[src*="media.licdn.com"]');
  for (var i = 0; i < allImgs.length; i++) {
    var src = allImgs[i].src;
    if (src.includes('profile-displayphoto-shrink') && !src.includes('ghost-person')) {
      return src;
    }
  }
  // Method 2: Known LinkedIn CSS selectors for profile photo
  var selectors = [
    'img.pv-top-card-profile-picture__image--show',
    'img.pv-top-card-profile-picture__image',
    'img.profile-photo-edit__preview',
    '.pv-top-card__photo img',
    '.profile-photo img',
  ];
  for (var j = 0; j < selectors.length; j++) {
    var img = document.querySelector(selectors[j]);
    if (img && img.src && img.src.includes('media.licdn.com')
        && !img.src.includes('ghost-person')
        && !img.src.includes('profile-displaybackgroundimage')) {
      return img.src;
    }
  }
  // Method 3: Any roughly-square media.licdn.com img (profile photos are square, banners are wide)
  for (var k = 0; k < allImgs.length; k++) {
    var el = allImgs[k];
    var s = el.src;
    if (s.includes('ghost-person') || s.includes('profile-displaybackgroundimage')) continue;
    var w = el.naturalWidth || el.width;
    var h = el.naturalHeight || el.height;
    if (w >= 100 && h >= 100 && Math.abs(w - h) / Math.max(w, h) < 0.3) {
      return s;
    }
  }
  return null;
})()
`

/**
 * Fetch a contact's LinkedIn profile photo using an Electron BrowserWindow.
 * Uses a persistent session partition ('persist:linkedin') so the user only
 * needs to log in to LinkedIn once — cookies persist across app restarts.
 *
 * Flow:
 * 1. Try silently (hidden window) with persisted cookies
 * 2. If no photo found (not logged in), show the window so user can log in
 * 3. After login + profile loads, extract the photo and close the window
 */
export async function fetchLinkedInPhoto(linkedInUrl: string): Promise<string> {
  const { BrowserWindow, session } = await import('electron')

  if (!linkedInUrl.startsWith('https://') && !linkedInUrl.startsWith('http://')) {
    linkedInUrl = `https://${linkedInUrl}`
  }

  // Validate this is actually a LinkedIn URL
  try {
    const parsed = new URL(linkedInUrl)
    if (parsed.hostname !== 'linkedin.com' && !parsed.hostname.endsWith('.linkedin.com')) {
      throw new Error('URL must be a LinkedIn URL (linkedin.com)')
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('LinkedIn')) throw e
    throw new Error('Invalid LinkedIn URL')
  }

  const linkedInSession = session.fromPartition('persist:linkedin')

  // --- Attempt 1: Silent fetch with persisted cookies ---
  const silentResult = await tryExtractPhoto(BrowserWindow, linkedInSession, linkedInUrl, false)
  if (silentResult) return silentResult

  // --- Attempt 2: Show window so user can log in ---
  return new Promise<string>((resolve, reject) => {
    const win = new BrowserWindow({
      width: 1100,
      height: 750,
      show: true,
      title: 'Log in to LinkedIn — then this window will close automatically',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: linkedInSession,
      },
    })

    let settled = false

    // Timeout after 90 seconds (user needs time to log in)
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        win.destroy()
        reject(new Error('LinkedIn login timed out. Try again.'))
      }
    }, 90000)

    // When user closes the window manually, reject
    win.on('closed', () => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        reject(new Error('LinkedIn window was closed before the photo could be fetched.'))
      }
    })

    // Extract the target profile's path segment (e.g. "/in/camille-jeuniaux-4330b7129")
    const targetPath = new URL(linkedInUrl).pathname

    // After login, LinkedIn redirects to /feed/ or the user's own profile.
    // We detect that and navigate back to the target profile URL.
    let redirectedToTarget = false
    let extractAttempts = 0

    win.webContents.on('did-finish-load', async () => {
      await new Promise(r => setTimeout(r, 2000))
      if (settled) return

      extractAttempts++
      try {
        const currentUrl = win.webContents.getURL()
        const currentPath = new URL(currentUrl).pathname

        // If we're on a post-login page (feed, own profile, etc.) but NOT the target profile,
        // navigate to the target profile now that we're authenticated
        const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/checkpoint')
        const isTargetProfile = currentPath.startsWith(targetPath)

        if (!isLoginPage && !isTargetProfile && !redirectedToTarget) {
          // User just logged in — redirect to the target profile
          redirectedToTarget = true
          win.loadURL(linkedInUrl)
          return
        }

        // Only try extraction when on the target profile page
        if (isTargetProfile) {
          // Wait a bit longer for the profile photo to render
          await new Promise(r => setTimeout(r, 1500))
          const photoUrl = await win.webContents.executeJavaScript(EXTRACT_PHOTO_JS)
          if (photoUrl) {
            settled = true
            clearTimeout(timeout)
            win.destroy()
            resolve(photoUrl)
            return
          }
        }

        if (extractAttempts >= 10) {
          settled = true
          clearTimeout(timeout)
          win.destroy()
          reject(new Error('Could not find a profile photo on this LinkedIn page.'))
        }
      } catch {
        // Ignore extraction errors during login flow
      }
    })

    win.loadURL(linkedInUrl).catch((err) => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        win.destroy()
        reject(new Error(`Failed to navigate to LinkedIn: ${String(err)}`))
      }
    })
  })
}

/**
 * Try to extract a profile photo from a LinkedIn URL using a hidden BrowserWindow.
 * Returns the photo URL if found, or null if the page requires login.
 */
function tryExtractPhoto(
  BrowserWindow: typeof import('electron').BrowserWindow,
  linkedInSession: Electron.Session,
  url: string,
  show: boolean
): Promise<string | null> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 1280,
      height: 900,
      show,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: linkedInSession,
      },
    })

    let done = false
    const finish = (result: string | null) => {
      if (done) return
      done = true
      clearTimeout(timer)
      win.destroy()
      resolve(result)
    }

    const timer = setTimeout(() => finish(null), 12000)

    win.webContents.on('did-finish-load', async () => {
      await new Promise(r => setTimeout(r, 2500))
      if (done) return
      try {
        const photoUrl = await win.webContents.executeJavaScript(EXTRACT_PHOTO_JS)
        finish(photoUrl || null)
      } catch {
        finish(null)
      }
    })

    win.webContents.on('did-fail-load', () => finish(null))
    win.loadURL(url).catch(() => finish(null))
  })
}

/**
 * Upload a contact photo to Airtable by providing a URL.
 */
export async function uploadContactPhotoToAirtable(contactId: string, imageUrl: string): Promise<void> {
  const baseId = getBaseId()
  const url = `https://api.airtable.com/v0/${baseId}/${CONTACTS_TABLE_ID}/${contactId}`
  const headers = getApiHeaders()

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      fields: {
        [CONTACT_PHOTO_FIELD_ID]: [{ url: imageUrl }],
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to upload contact photo: ${response.status} - ${errorText}`)
  }

  // Update local database — will be replaced by proper Airtable URL on next sync
  const db = getDatabase()
  db.run('UPDATE contacts SET contact_photo_url = ? WHERE id = ?', [imageUrl, contactId])
  saveDatabase()
}

/**
 * Upload a local file as a contact photo.
 */
export async function uploadLocalContactPhoto(contactId: string, filePath: string): Promise<void> {
  const fs = await import('fs')
  const path = await import('path')

  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mime = ext === '.png' ? 'image/png'
    : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
    : ext === '.webp' ? 'image/webp'
    : ext === '.gif' ? 'image/gif'
    : 'image/png'

  const baseId = getBaseId()
  const apiKey = getSetting('airtable_api_key')
  if (!apiKey) throw new Error('Airtable API key not configured')

  // Try Airtable content upload API first
  const uploadUrlResponse = await fetch(
    `https://content.airtable.com/v0/${baseId}/uploadAttachment`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contentType: mime,
        filename: path.basename(filePath),
      }),
    }
  )

  if (!uploadUrlResponse.ok) {
    const errText = await uploadUrlResponse.text()
    throw new Error(`Airtable attachment upload failed: ${uploadUrlResponse.status} - ${errText}`)
  }

  const uploadData = await uploadUrlResponse.json() as { uploadUrl: string; id: string; attachmentUrl: string }

  await fetch(uploadData.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mime },
    body: buffer,
  })

  const url = `https://api.airtable.com/v0/${baseId}/${CONTACTS_TABLE_ID}/${contactId}`
  await fetch(url, {
    method: 'PATCH',
    headers: getApiHeaders(),
    body: JSON.stringify({
      fields: {
        [CONTACT_PHOTO_FIELD_ID]: [{ id: uploadData.id }],
      },
    }),
  })

  // Update local database
  const db = getDatabase()
  const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`
  db.run('UPDATE contacts SET contact_photo_url = ? WHERE id = ?', [dataUrl, contactId])
  saveDatabase()
}

/**
 * Remove photo from a contact (clears the Airtable attachment field).
 */
export async function removeContactPhotoFromAirtable(contactId: string): Promise<void> {
  const baseId = getBaseId()
  const url = `https://api.airtable.com/v0/${baseId}/${CONTACTS_TABLE_ID}/${contactId}`
  const headers = getApiHeaders()

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      fields: {
        [CONTACT_PHOTO_FIELD_ID]: [],
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to remove contact photo: ${response.status} - ${errorText}`)
  }

  const db = getDatabase()
  db.run('UPDATE contacts SET contact_photo_url = NULL WHERE id = ?', [contactId])
  saveDatabase()
}
