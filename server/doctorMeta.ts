import { RowDataPacket } from 'mysql2/promise';
import pool from './db.js';
import { generateDoctorSlug } from './routes/publicRoutes.js';

export interface DoctorMetaData {
  title: string;
  description: string;
  image: string;
  url: string;
  doctorName: string;
  qualification: string;
  specialty: string;
  bmdcNumber: string;
}

export const DEFAULT_DOCTOR_IMAGE = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&auto=format&fit=crop&q=80';

/**
 * Fetch doctor by numeric ID or slug string (e.g. "dr-dr-test-rahman-3292-3", "dr-tanvir-ahmad-1", "3")
 */
export async function getDoctorForMeta(rawParam: string): Promise<any | null> {
  const cleanParam = decodeURIComponent(String(rawParam || '').trim())
    .split('?')[0]
    .split('#')[0];
  if (!cleanParam) return null;

  try {
    let docRows: RowDataPacket[] = [];

    // Case 1: Parameter is purely numeric doctor ID (e.g. /doctor/3)
    const numericId = Number(cleanParam);
    if (!isNaN(numericId) && numericId > 0) {
      [docRows] = await pool.query<RowDataPacket[]>(`
        SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
               s.name as specialty_name, s.name_bn as specialty_name_bn
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN specialties s ON d.specialty_id = s.id
        WHERE d.id = ? AND u.status != 'deleted'
        ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
        LIMIT 1
      `, [numericId]);
    }

    // Case 2: Slug ends with -<number> (e.g. dr-dr-test-rahman-3292-3 -> 3, dr-tanvir-ahmad-1 -> 1)
    if (docRows.length === 0) {
      const match = cleanParam.match(/-(\d+)$/);
      if (match) {
        const extractedId = Number(match[1]);
        if (!isNaN(extractedId) && extractedId > 0) {
          [docRows] = await pool.query<RowDataPacket[]>(`
            SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
                   s.name as specialty_name, s.name_bn as specialty_name_bn
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            WHERE d.id = ? AND u.status != 'deleted'
            ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
            LIMIT 1
          `, [extractedId]);
        }
      }
    }

    // Case 3: Try other numeric candidates in slug (e.g. BMDC number "3292" or ID)
    if (docRows.length === 0) {
      const allNumbers = cleanParam.match(/\d+/g);
      if (allNumbers && allNumbers.length > 0) {
        for (const numStr of allNumbers) {
          const num = Number(numStr);
          [docRows] = await pool.query<RowDataPacket[]>(`
            SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
                   s.name as specialty_name, s.name_bn as specialty_name_bn
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            WHERE (d.bmdc_number = ? OR d.bmdc_number LIKE ? OR d.id = ?) AND u.status != 'deleted'
            ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
            LIMIT 1
          `, [numStr, `%${numStr}%`, num]);

          if (docRows.length > 0) break;
        }
      }
    }

    // Case 4: Match doctor by name from slug (e.g. "test rahman" from "dr-dr-test-rahman-3292-3")
    if (docRows.length === 0) {
      const nameGuess = cleanParam
        .replace(/^(?:prof-|asst-prof-|assoc-prof-|dr-)+/i, '')
        .replace(/-\d+/g, '')
        .replace(/-/g, ' ')
        .trim();

      if (nameGuess.length >= 2) {
        [docRows] = await pool.query<RowDataPacket[]>(`
          SELECT d.*, u.name, u.email, u.phone, u.avatar_url,
                 s.name as specialty_name, s.name_bn as specialty_name_bn
          FROM doctors d
          JOIN users u ON d.user_id = u.id
          LEFT JOIN specialties s ON d.specialty_id = s.id
          WHERE LOWER(u.name) LIKE LOWER(?) AND u.status != 'deleted'
          ORDER BY (d.approval_status = 'approved') DESC, (u.status = 'active') DESC
          LIMIT 1
        `, [`%${nameGuess}%`]);
      }
    }

    const doctor = docRows[0] as any;
    if (!doctor) return null;

    doctor.slug = generateDoctorSlug(doctor.title, doctor.name, doctor.id);

    // Fetch specialties
    try {
      const [specRows] = await pool.query<RowDataPacket[]>(`
        SELECT s.name, s.name_bn
        FROM doctor_specialties ds
        JOIN specialties s ON ds.specialty_id = s.id
        WHERE ds.doctor_id = ?
        ORDER BY ds.is_primary DESC, s.name ASC
      `, [doctor.id]);

      if (specRows && specRows.length > 0) {
        doctor.specialties_summary = specRows.map((s: any) => s.name).join(' + ');
      } else {
        doctor.specialties_summary = doctor.specialty_name || 'Medical Specialist';
      }
    } catch {
      doctor.specialties_summary = doctor.specialty_name || 'Medical Specialist';
    }

    // Fetch chambers summary
    try {
      const [chamberRows] = await pool.query<RowDataPacket[]>(`
        SELECT name, area, city
        FROM chambers
        WHERE doctor_id = ?
        ORDER BY id ASC
        LIMIT 3
      `, [doctor.id]);

      if (chamberRows && chamberRows.length > 0) {
        doctor.chambers_summary = chamberRows.map((c: any) => `${c.name} (${c.area}, ${c.city})`).join(' | ');
      } else {
        doctor.chambers_summary = '';
      }
    } catch {
      doctor.chambers_summary = '';
    }

    return doctor;
  } catch (err) {
    console.error('[SEO Meta] Error fetching doctor:', err);
    return null;
  }
}

/**
 * Escape special HTML characters for text attributes
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escape URLs without breaking query parameters like &
 */
export function escapeUrl(url: string): string {
  if (!url) return '';
  return String(url).replace(/"/g, '%22').replace(/'/g, '%27').replace(/[\r\n\t]/g, '');
}

/**
 * Resolve absolute base URL from Express request with reliable HTTPS detection
 */
export function getBaseUrl(req: any): string {
  const envUrl = process.env.APP_URL || process.env.VITE_APP_URL;
  if (envUrl) {
    let appUrl = envUrl.trim().replace(/\/+$/, '');
    if (!appUrl.includes('localhost') && !appUrl.includes('127.0.0.1') && appUrl.startsWith('http://')) {
      appUrl = appUrl.replace(/^http:\/\//i, 'https://');
    }
    return appUrl;
  }

  const host = (req.get('x-forwarded-host') || req.get('host') || 'localhost:3000').trim();
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.startsWith('192.168.') || host.startsWith('10.');

  let proto = 'https';
  if (isLocal) {
    proto = req.get('x-forwarded-proto') || (req.connection && req.connection.encrypted ? 'https' : 'http') || (req.secure ? 'https' : 'http');
  } else {
    // For all public internet domains (like dakatarseial.bd, cloud run, etc.), always use https
    proto = 'https';
  }

  return `${proto}://${host}`.replace(/\/+$/, '');
}

/**
 * Normalize and resolve absolute image URL for Facebook and WhatsApp crawlers
 */
export function resolveAbsoluteImageUrl(avatarUrl: string | undefined | null, baseUrl: string): string {
  const clean = avatarUrl ? String(avatarUrl).trim() : '';
  if (!clean) {
    return DEFAULT_DOCTOR_IMAGE;
  }

  if (clean.startsWith('https://')) {
    return clean;
  }

  if (clean.startsWith('http://')) {
    // Upgrade http to https if baseUrl is https
    if (baseUrl.startsWith('https://')) {
      return clean.replace(/^http:\/\//i, 'https://');
    }
    return clean;
  }

  if (clean.startsWith('/')) {
    return `${baseUrl}${clean}`;
  }

  return `${baseUrl}/${clean}`;
}

/**
 * Generate complete DoctorMetaData for an existing doctor record
 */
export function buildDoctorMetaData(doctor: any, baseUrl: string, requestedSlug?: string): DoctorMetaData {
  const rawName = (doctor.name || '').trim();
  const rawTitle = (doctor.title || 'Dr.').trim();

  // Clean doctor name to prevent "Dr. Dr. ..."
  let doctorName = rawName;
  if (!rawName.toLowerCase().startsWith(rawTitle.toLowerCase())) {
    doctorName = `${rawTitle} ${rawName}`;
  }

  const specialty = doctor.specialties_summary || doctor.specialty_name || 'Medical Specialist';
  const qualification = doctor.qualification || '';
  const bmdc = doctor.bmdc_number ? `BMDC: ${doctor.bmdc_number}` : 'Verified Specialist';

  // Construct meta title (e.g. "Dr. Test Rahman - Pediatrics / Child Specialist | Daktar Serial")
  const title = `${doctorName} - ${specialty} | Daktar Serial`;

  // Construct meta description
  let description = `Book doctor chamber serial for ${doctorName}`;
  if (qualification) description += ` (${qualification})`;
  description += `. ${bmdc}.`;
  if (doctor.chambers_summary) {
    description += ` Chambers: ${doctor.chambers_summary}.`;
  }
  description += ` Fee: ৳${doctor.consultation_fee || 500}. Official online serial booking on Daktar Serial.`;

  // Normalize image URL: MUST be absolute and HTTPS for Facebook & WhatsApp scrapers
  const image = resolveAbsoluteImageUrl(doctor.avatar_url, baseUrl);

  // Preferred URL (preserves requested slug if valid, otherwise doctor.slug)
  const slug = requestedSlug || doctor.slug || doctor.id;
  const url = `${baseUrl}/doctor/${slug}`;

  return {
    title,
    description,
    image,
    url,
    doctorName,
    qualification,
    specialty,
    bmdcNumber: doctor.bmdc_number || '',
  };
}

/**
 * Fallback metadata generator if doctor is not yet in DB (e.g. unseeded environment or custom test slug)
 */
export function buildFallbackDoctorMetaData(slugOrId: string, baseUrl: string): DoctorMetaData {
  const cleanParam = decodeURIComponent(String(slugOrId || '').trim())
    .split('?')[0]
    .split('#')[0];

  // Derive readable name from slug
  let rawName = cleanParam
    .replace(/^(?:prof-|asst-prof-|assoc-prof-|dr-)+/i, '')
    .replace(/-\d+$/g, '')
    .replace(/-/g, ' ')
    .trim();

  if (!rawName) {
    rawName = 'Specialist Doctor';
  } else {
    // Capitalize words
    rawName = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  const doctorName = `Dr. ${rawName}`;
  const specialty = 'Medical Specialist';
  const title = `${doctorName} - ${specialty} | Daktar Serial`;
  const description = `Book chamber serial and appointment for ${doctorName} on Daktar Serial. Easy online serial booking with instant confirmation.`;
  const image = DEFAULT_DOCTOR_IMAGE;
  const url = `${baseUrl}/doctor/${cleanParam}`;

  return {
    title,
    description,
    image,
    url,
    doctorName,
    qualification: 'MBBS Specialist',
    specialty,
    bmdcNumber: '',
  };
}

/**
 * Inject Open Graph, Twitter, and Schema.org structured metadata into HTML
 */
export function injectDoctorMetaIntoHtml(templateHtml: string, meta: DoctorMetaData): string {
  const safeTitle = escapeHtml(meta.title);
  const safeDesc = escapeHtml(meta.description);
  const safeImage = escapeUrl(meta.image);
  const safeUrl = escapeUrl(meta.url);
  const safeDoctorName = escapeHtml(meta.doctorName);
  const safeSpecialty = escapeHtml(meta.specialty);

  // Generate complete Open Graph, Twitter Card, and Schema.org meta tags
  const metaTagsHtml = `
    <!-- Daktar Serial Doctor Profile Open Graph & Social Sharing Metadata -->
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <link rel="canonical" href="${safeUrl}" />

    <!-- Open Graph / Facebook / WhatsApp / Messenger -->
    <meta property="og:site_name" content="Daktar Serial" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:image:secure_url" content="${safeImage}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="800" />
    <meta property="og:image:height" content="800" />
    <meta property="og:image:alt" content="${safeDoctorName}" />
    <meta property="og:url" content="${safeUrl}" />

    <!-- Twitter / X Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@DaktarSerial" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImage}" />
    <meta name="twitter:image:alt" content="${safeDoctorName}" />

    <!-- Schema.org Physician JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Physician",
      "name": "${safeDoctorName}",
      "description": "${safeDesc}",
      "image": "${safeImage}",
      "url": "${safeUrl}",
      "medicalSpecialty": "${safeSpecialty}"${meta.bmdcNumber ? `,\n      "identifier": "${escapeHtml(meta.bmdcNumber)}"` : ''}
    }
    </script>
  `.trim();

  let modifiedHtml = templateHtml;

  // 1. Remove existing default <title> tag
  modifiedHtml = modifiedHtml.replace(/<title>[\s\S]*?<\/title>/gi, '');

  // 2. Remove any existing meta description, OpenGraph, or Twitter tags
  modifiedHtml = modifiedHtml.replace(/<meta\s+[^>]*?(?:name|property)=["'](?:description|og:[^"']+|twitter:[^"']+)["'][^>]*?>/gi, '');

  // 3. Remove existing canonical link if present
  modifiedHtml = modifiedHtml.replace(/<link\s+[^>]*?rel=["']canonical["'][^>]*?>/gi, '');

  // 4. Insert new tags right before </head>
  if (modifiedHtml.includes('</head>')) {
    modifiedHtml = modifiedHtml.replace('</head>', `  ${metaTagsHtml}\n  </head>`);
  } else {
    modifiedHtml = `${metaTagsHtml}\n${modifiedHtml}`;
  }

  return modifiedHtml;
}
