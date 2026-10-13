import { Router, Request, Response } from 'express';
import pool, { logActivity } from '../db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import {
  createPaymentCharge,
  verifyPayment,
  isPaymentlyConfigured,
} from '../services/paymentlyService.js';
import { notifyBookingSuccess } from '../services/notificationService.js';
import { sendHospitalWebhook } from '../services/hospitalIntegrationService.js';

const router = Router();
const BOOKING_FEE_BDT = 10.00;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Safely maps arbitrary payment method string to confirmed production payments.method ENUM
 * Allowed: 'cash_at_chamber', 'online_payment', 'bkash', 'nagad', 'card'
 */
function mapPaymentMethod(rawMethod?: string | null): 'cash_at_chamber' | 'online_payment' | 'bkash' | 'nagad' | 'card' {
  if (!rawMethod) return 'online_payment';
  const m = String(rawMethod).toLowerCase();
  if (m.includes('bkash')) return 'bkash';
  if (m.includes('nagad')) return 'nagad';
  if (m.includes('card') || m.includes('visa') || m.includes('master')) return 'card';
  if (m.includes('cash')) return 'cash_at_chamber';
  return 'online_payment';
}

/**
 * Helper to generate unique transaction reference (e.g. DS-TXN-XXXXXXXX-XXXX)
 */
function generateTransactionRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DS-TXN-${ts}-${rand}`;
}

/**
 * Generate formatted unique Appointment ID: DS-YYYYMMDD-XXXXX
 */
async function generateAppointmentId(dateStr: string, serialNum: number): Promise<string> {
  const cleanDate = dateStr.replace(/-/g, '');
  const serialPad = String(serialNum).padStart(5, '0');
  let apptId = `DS-${cleanDate}-${serialPad}`;

  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM appointments WHERE appointment_id = ?',
    [apptId]
  );
  if (existing.length > 0) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    apptId = `DS-${cleanDate}-${serialPad}-${randomSuffix}`;
  }
  return apptId;
}

function formatSlotTime(startTime: string, slotDuration: number, serialNum: number): string {
  const [startH, startM] = String(startTime).split(':').map(Number);
  const totalMinutes = startH * 60 + startM + (serialNum - 1) * slotDuration;
  const slotHour24 = Math.floor(totalMinutes / 60) % 24;
  const slotMin = totalMinutes % 60;
  const ampm = slotHour24 >= 12 ? 'PM' : 'AM';
  const slotHour12 = slotHour24 % 12 || 12;
  return `${slotHour12}:${slotMin < 10 ? '0' : ''}${slotMin} ${ampm}`;
}

/**
 * Reconciles unpaid pending bookings older than 15 minutes to prevent holding serial slots indefinitely.
 * Uses confirmed production schema:
 * - joins payments.appointment_id = appointments.id (numeric INT UNSIGNED)
 * - updates payments.status to 'failed' (valid production ENUM)
 * - updates appointments.status to 'cancelled'
 * - restores serials.status to 'available'
 */
export async function reconcileExpiredPendingPayments(): Promise<void> {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const thresholdSql = fifteenMinutesAgo.toISOString().slice(0, 19).replace('T', ' ');

    const [expiredRows] = await pool.query<RowDataPacket[]>(`
      SELECT a.id as appointment_pk, a.appointment_id, a.transaction_ref,
             a.doctor_id, a.chamber_id, a.schedule_date, a.serial_number,
             p.id as payment_pk
      FROM appointments a
      LEFT JOIN payments p ON p.appointment_id = a.id
      WHERE a.status = 'pending_payment' AND a.created_at < ?
    `, [thresholdSql]);

    for (const row of expiredRows) {
      console.log(`[PaymentReconcile] Expiring stale pending booking ${row.appointment_id} (TXN: ${row.transaction_ref})`);
      if (row.payment_pk) {
        await pool.execute("UPDATE payments SET status = 'failed' WHERE id = ?", [row.payment_pk]);
      }
      await pool.execute("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [row.appointment_pk]);
      await pool.execute(`
        UPDATE serials SET status = 'available'
        WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? AND status = 'booked'
      `, [row.doctor_id, row.chamber_id, row.schedule_date, row.serial_number]);
    }
  } catch (err: any) {
    console.warn('[PaymentReconcile] Non-fatal notice during stale reconciliation:', err.message);
  }
}

/**
 * 1. Initiate Checkout via Paymently Gateway
 * POST /api/payments/initiate
 */
router.post('/initiate', async (req: Request, res: Response) => {
  // Trigger cleanup of any stale pending locks
  reconcileExpiredPendingPayments().catch(() => {});

  const user = (req as any).user;
  const {
    doctorId,
    chamberId,
    scheduleDate,
    serialNumber,
    patientName,
    patientPhone,
    patientAge,
    patientGender,
    problemDescription,
    patientEmail,
  } = req.body;

  const docIdNum = Number(doctorId);
  const chamIdNum = Number(chamberId);
  const serialNum = Number(serialNumber);

  if (!docIdNum || !chamIdNum || !scheduleDate || !serialNum || !patientName || !patientPhone) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Doctor, Chamber, Date, Serial Number, Patient Name, and Phone are required.',
    });
  }

  // 1. Validate Doctor & Approval
  const [docRows] = await pool.query<RowDataPacket[]>(`
    SELECT d.*, u.name as doctor_name
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    WHERE d.id = ? AND d.approval_status = 'approved'
  `, [docIdNum]);

  const doctor = docRows[0] as any;
  if (!doctor) {
    return res.status(404).json({ error: 'DOCTOR_NOT_FOUND', message: 'Doctor not found or not approved.' });
  }

  // 2. Validate Chamber
  const [chamRows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM chambers WHERE id = ? AND doctor_id = ?',
    [chamIdNum, docIdNum]
  );
  const chamber = chamRows[0] as any;
  if (!chamber) {
    return res.status(404).json({ error: 'INVALID_CHAMBER', message: 'Chamber not found for this doctor.' });
  }

  // 3. Validate Schedule
  const dateObj = new Date(scheduleDate + 'T00:00:00');
  if (isNaN(dateObj.getTime())) {
    return res.status(400).json({ error: 'INVALID_DATE', message: 'Invalid schedule date.' });
  }
  const dayOfWeek = DAY_NAMES[dateObj.getDay()];

  const [schedRows] = await pool.query<RowDataPacket[]>(`
    SELECT s.*, COALESCE(dc.consultation_fee, d.consultation_fee) as fee
    FROM doctor_schedules s
    JOIN doctors d ON s.doctor_id = d.id
    LEFT JOIN doctor_chambers dc ON s.chamber_id = dc.chamber_id AND s.doctor_id = dc.doctor_id
    WHERE s.doctor_id = ? AND s.chamber_id = ? AND s.day_of_week = ? AND s.is_active = 1
  `, [docIdNum, chamIdNum, dayOfWeek]);
  const schedule = schedRows[0] as any;

  if (!schedule) {
    return res.status(400).json({
      error: 'NO_SCHEDULE',
      message: `Doctor has no schedule for ${dayOfWeek} at this chamber.`,
    });
  }

  if (serialNum < 1 || serialNum > schedule.max_serials) {
    return res.status(400).json({
      error: 'INVALID_SERIAL',
      message: `Serial must be between 1 and ${schedule.max_serials}.`,
    });
  }

  const transactionRef = generateTransactionRef();
  const appointmentId = await generateAppointmentId(scheduleDate, serialNum);
  const appointmentTime = formatSlotTime(schedule.start_time, schedule.slot_duration_minutes || 10, serialNum);
  const parsedAge = patientAge ? parseInt(String(patientAge), 10) : null;

  // Concurrency-safe slot lock and pending reservation
  const conn = await pool.getConnection();
  let apptRecordId: number;

  try {
    await conn.beginTransaction();

    // Check if slot is already confirmed or held
    const [existingApptRows] = await conn.query<RowDataPacket[]>(`
      SELECT id, status, created_at FROM appointments
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? AND status != 'cancelled'
      FOR UPDATE
    `, [docIdNum, chamIdNum, scheduleDate, serialNum]);

    if (existingApptRows.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        error: 'DUPLICATE_BOOKING',
        message: 'This serial slot has already been booked. Please choose another serial.',
        message_bn: 'এই সিরিয়ালটি ইতিমধ্যে বুক হয়ে গেছে। অন্য একটি সিরিয়াল নির্বাচন করুন।',
      });
    }

    // Lock serial slot in serials table
    const [existingSerialRows] = await conn.query<RowDataPacket[]>(`
      SELECT id FROM serials
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?
      FOR UPDATE
    `, [docIdNum, chamIdNum, scheduleDate, serialNum]);

    if (existingSerialRows.length > 0) {
      await conn.execute('UPDATE serials SET status = ? WHERE id = ?', ['booked', existingSerialRows[0].id]);
    } else {
      await conn.execute(`
        INSERT INTO serials (schedule_id, doctor_id, chamber_id, schedule_date, serial_number, status)
        VALUES (?, ?, ?, ?, ?, 'booked')
      `, [schedule.id, docIdNum, chamIdNum, scheduleDate, serialNum]);
    }

    // Insert appointment in pending_payment state
    // Doctor consultation fee is preserved as schedule.fee; booking fee is separate BDT 10.00
    const [insertResult] = await conn.execute<ResultSetHeader>(`
      INSERT INTO appointments (
        appointment_id, patient_id, doctor_id, chamber_id, schedule_id,
        schedule_date, serial_number, appointment_time,
        patient_name, patient_phone, patient_age, patient_gender,
        problem_description, fee, booking_fee, payment_status, booking_source,
        transaction_ref, payment_method, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'online', ?, 'Paymently', ?, 'pending_payment')
    `, [
      appointmentId,
      user?.id || null,
      docIdNum,
      chamIdNum,
      schedule.id,
      scheduleDate,
      serialNum,
      appointmentTime,
      patientName,
      patientPhone,
      parsedAge,
      patientGender || 'other',
      problemDescription || null,
      schedule.fee,
      BOOKING_FEE_BDT,
      transactionRef,
      user?.id || null,
    ]);

    apptRecordId = insertResult.insertId;

    // Insert pending payment record using verified production schema:
    // appointment_id (INT UNSIGNED -> references appointments.id)
    // transaction_id (VARCHAR(100) UNIQUE -> stores transactionRef)
    // method (ENUM -> 'online_payment')
    // amount (DECIMAL(10,2) -> 10.00)
    // status (ENUM -> 'pending')
    // gateway_response (TEXT -> stores JSON metadata)
    await conn.execute(`
      INSERT INTO payments (
        appointment_id, transaction_id, method, amount, status, gateway_response
      ) VALUES (?, ?, 'online_payment', ?, 'pending', ?)
    `, [
      apptRecordId,
      transactionRef,
      BOOKING_FEE_BDT,
      JSON.stringify({
        appointmentId,
        transactionRef,
        patientName,
        patientPhone,
        doctorId: docIdNum,
        chamberId: chamIdNum,
        scheduleDate,
        serialNumber: serialNum,
        initiatedAt: new Date().toISOString(),
      }),
    ]);

    await conn.commit();
  } catch (txErr: any) {
    await conn.rollback();
    console.error('[PaymentInitiate] Transaction failed:', txErr);
    return res.status(500).json({ error: 'DATABASE_ERROR', message: txErr.message });
  } finally {
    conn.release();
  }

  // Determine base URLs for callbacks
  const hostUrl = (process.env.APP_URL || 'https://dakatarseial.bd').trim().replace(/\/+$/, '');
  const redirectUrl = `${hostUrl}/api/payments/paymently/callback`;
  const cancelUrl = `${hostUrl}/api/payments/paymently/cancel?tx=${encodeURIComponent(transactionRef)}`;
  const webhookUrl = `${hostUrl}/api/payments/paymently/webhook`;

  // Check if Paymently is configured
  if (!isPaymentlyConfigured()) {
    console.warn('[Paymently] PAYMENTLY_API_KEY is not configured in server environment.');
    return res.status(503).json({
      error: 'PAYMENTLY_NOT_CONFIGURED',
      message: 'Paymently payment gateway is not yet configured with an API key.',
      details: 'Please set PAYMENTLY_API_KEY in your .env or cPanel Node.js environment.',
      bookingFee: BOOKING_FEE_BDT,
      transactionRef,
      appointmentId,
    });
  }

  // Call Paymently Create Charge (checkout-v2)
  const chargeResult = await createPaymentCharge({
    fullName: patientName,
    email: patientEmail || `${patientPhone.replace(/[^0-9]/g, '')}@dakatarseial.bd`,
    amount: BOOKING_FEE_BDT,
    metadata: {
      appointmentId,
      transactionRef,
      appointmentPk: apptRecordId,
      doctorId: docIdNum,
      chamberId: chamIdNum,
      patientPhone,
    },
    redirectUrl,
    cancelUrl,
    webhookUrl,
  });

  if (!chargeResult.success || !chargeResult.paymentUrl) {
    console.error('[Paymently] Failed to create payment charge:', chargeResult);
    // Safe cancellation: release serial slot and mark appointment/payment failed
    await pool.execute("UPDATE payments SET status = 'failed', gateway_response = ? WHERE appointment_id = ?", [
      JSON.stringify(chargeResult.rawResponse || { message: chargeResult.message }),
      apptRecordId,
    ]);
    await pool.execute("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [apptRecordId]);
    await pool.execute(`
      UPDATE serials SET status = 'available'
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? AND status = 'booked'
    `, [docIdNum, chamIdNum, scheduleDate, serialNum]);

    return res.status(502).json({
      error: 'GATEWAY_ERROR',
      message: chargeResult.message || 'Payment gateway failed to initialize checkout session.',
    });
  }

  // Update payment record with gateway response details
  await pool.execute(`
    UPDATE payments
    SET gateway_response = ?
    WHERE appointment_id = ?
  `, [
    JSON.stringify({
      paymentUrl: chargeResult.paymentUrl,
      invoiceId: chargeResult.invoiceId || null,
      appointmentId,
      transactionRef,
      raw: chargeResult.rawResponse || {},
    }),
    apptRecordId,
  ]);

  await logActivity(
    user?.id || null,
    'PAYMENT_INITIATED',
    `Paymently checkout initiated for appointment ${appointmentId} (TXN: ${transactionRef}) - ৳${BOOKING_FEE_BDT}`
  );

  return res.status(200).json({
    success: true,
    message: 'Payment checkout initiated successfully',
    paymentUrl: chargeResult.paymentUrl,
    invoiceId: chargeResult.invoiceId || null,
    transactionRef,
    appointmentId,
    bookingFee: BOOKING_FEE_BDT,
    currency: 'BDT',
  });
});

/**
 * 2. Paymently Callback / Return Endpoint
 * GET & POST /api/payments/paymently/callback
 */
const handlePaymentlyCallback = async (req: Request, res: Response) => {
  const hostUrl = (process.env.APP_URL || 'https://dakatarseial.bd').trim().replace(/\/+$/, '');
  const invoiceId = (req.query.invoice_id || req.body.invoice_id || req.query.invoiceId || req.body.invoiceId) as string;

  if (!invoiceId) {
    console.error('[PaymentlyCallback] Callback invoked without invoice_id:', { query: req.query, body: req.body });
    return res.redirect(`${hostUrl}/?payment_status=failed&error=missing_invoice`);
  }

  console.log(`[PaymentlyCallback] Verifying invoice_id: ${invoiceId}`);

  // CRITICAL: Server-side verification using Paymently verify-payment API
  const verifyResult = await verifyPayment(invoiceId);

  if (!verifyResult.success || verifyResult.status !== 'COMPLETED') {
    console.warn(`[PaymentlyCallback] Verification failed or incomplete for ${invoiceId}:`, verifyResult);
    return res.redirect(`${hostUrl}/?payment_status=failed&invoice_id=${encodeURIComponent(invoiceId)}&reason=${encodeURIComponent(verifyResult.message || 'Payment not completed')}`);
  }

  // Amount verification (must cover booking fee BDT 10.00)
  if (verifyResult.amount !== undefined && verifyResult.amount < BOOKING_FEE_BDT) {
    console.error(`[PaymentlyCallback] Amount mismatch! Expected >= ${BOOKING_FEE_BDT}, got ${verifyResult.amount}`);
    return res.redirect(`${hostUrl}/?payment_status=failed&error=amount_mismatch`);
  }

  // Look up matching appointment and payment records
  let apptRow: any = null;

  // 1. Primary lookup by metadata (transactionRef, appointmentId, or appointmentPk)
  if (verifyResult.metadata) {
    const metaTx = verifyResult.metadata.transactionRef || verifyResult.metadata.transaction_ref;
    const metaAppt = verifyResult.metadata.appointmentId || verifyResult.metadata.appointment_id;
    const metaPk = verifyResult.metadata.appointmentPk || verifyResult.metadata.appointment_pk;

    if (metaTx) {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT a.*, p.id as payment_pk, p.status as payment_status_val, p.amount as payment_amount
        FROM appointments a
        LEFT JOIN payments p ON p.appointment_id = a.id
        WHERE a.transaction_ref = ?
      `, [metaTx]);
      if (rows.length > 0) apptRow = rows[0];
    }

    if (!apptRow && metaAppt) {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT a.*, p.id as payment_pk, p.status as payment_status_val, p.amount as payment_amount
        FROM appointments a
        LEFT JOIN payments p ON p.appointment_id = a.id
        WHERE a.appointment_id = ?
      `, [metaAppt]);
      if (rows.length > 0) apptRow = rows[0];
    }

    if (!apptRow && metaPk) {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT a.*, p.id as payment_pk, p.status as payment_status_val, p.amount as payment_amount
        FROM appointments a
        LEFT JOIN payments p ON p.appointment_id = a.id
        WHERE a.id = ?
      `, [Number(metaPk)]);
      if (rows.length > 0) apptRow = rows[0];
    }
  }

  // 2. Secondary lookup by gateway response containing invoiceId
  if (!apptRow) {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT a.*, p.id as payment_pk, p.status as payment_status_val, p.amount as payment_amount
      FROM payments p
      JOIN appointments a ON p.appointment_id = a.id
      WHERE p.gateway_response LIKE ?
    `, [`%${invoiceId}%`]);
    if (rows.length > 0) apptRow = rows[0];
  }

  if (!apptRow) {
    console.error(`[PaymentlyCallback] No appointment record found for verified invoice ${invoiceId}`);
    return res.redirect(`${hostUrl}/?payment_status=failed&error=record_not_found`);
  }

  // Idempotency: Prevent duplicate callback processing
  if (apptRow.payment_status === 'paid' || apptRow.payment_status_val === 'paid') {
    console.log(`[PaymentlyCallback] Payment for ${apptRow.appointment_id} already marked paid. Redirecting to confirmation.`);
    return res.redirect(`${hostUrl}/?payment_status=success&appointment_id=${encodeURIComponent(apptRow.appointment_id)}&txn=${encodeURIComponent(apptRow.transaction_ref || '')}`);
  }

  const mappedMethod = mapPaymentMethod(verifyResult.paymentMethod);
  const paymentMethodLabel = verifyResult.paymentMethod ? `Paymently (${verifyResult.paymentMethod})` : 'Paymently';

  // Update payment and appointment atomically
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (apptRow.payment_pk) {
      await conn.execute(`
        UPDATE payments
        SET status = 'paid',
            method = ?,
            gateway_response = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        mappedMethod,
        JSON.stringify({
          invoiceId,
          gatewayTxnId: verifyResult.transactionId || null,
          paymentMethod: verifyResult.paymentMethod || null,
          senderNumber: verifyResult.senderNumber || null,
          amount: verifyResult.amount || BOOKING_FEE_BDT,
          date: verifyResult.date || null,
          raw: verifyResult.rawResponse || {},
        }),
        apptRow.payment_pk,
      ]);
    } else {
      // In case payment row was missing, insert using confirmed production schema
      await conn.execute(`
        INSERT INTO payments (
          appointment_id, transaction_id, method, amount, status, gateway_response
        ) VALUES (?, ?, ?, ?, 'paid', ?)
      `, [
        apptRow.id,
        apptRow.transaction_ref || `DS-INV-${invoiceId}`,
        mappedMethod,
        BOOKING_FEE_BDT,
        JSON.stringify({
          invoiceId,
          gatewayTxnId: verifyResult.transactionId || null,
          paymentMethod: verifyResult.paymentMethod || null,
          senderNumber: verifyResult.senderNumber || null,
          raw: verifyResult.rawResponse || {},
        }),
      ]);
    }

    // Mark appointment confirmed and paid without touching the doctor's consultation fee
    await conn.execute(`
      UPDATE appointments
      SET status = 'confirmed',
          payment_status = 'paid',
          payment_method = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      paymentMethodLabel,
      apptRow.id,
    ]);

    await conn.commit();
  } catch (updateErr: any) {
    await conn.rollback();
    console.error('[PaymentlyCallback] Failed to update appointment status:', updateErr);
    return res.redirect(`${hostUrl}/?payment_status=error&error=db_update_failed`);
  } finally {
    conn.release();
  }

  // Fetch full appointment details for notifications
  try {
    const [detailRows] = await pool.query<RowDataPacket[]>(`
      SELECT a.*, d.title as doctor_title, u.name as doctor_name, c.name as chamber_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      JOIN chambers c ON a.chamber_id = c.id
      WHERE a.id = ?
    `, [apptRow.id]);

    if (detailRows.length > 0) {
      const appt = detailRows[0] as any;
      notifyBookingSuccess({
        appointmentId: appt.appointment_id,
        serialNumber: appt.serial_number,
        appointmentTime: appt.appointment_time,
        scheduleDate: appt.schedule_date,
        doctorId: appt.doctor_id,
        doctorName: appt.doctor_name,
        doctorTitle: appt.doctor_title,
        chamberId: appt.chamber_id,
        chamberName: appt.chamber_name,
        patientName: appt.patient_name,
        patientPhone: appt.patient_phone,
        fee: appt.fee,
        bookingSource: 'online',
      }).catch((notifErr) => {
        console.warn('[Notification] Background booking notice error:', notifErr.message);
      });
    }
  } catch {
    // non-fatal
  }

  await logActivity(
    null,
    'PAYMENT_COMPLETED',
    `Paymently verified: ৳${BOOKING_FEE_BDT} for appointment ${apptRow.appointment_id} (TXN: ${apptRow.transaction_ref}, Gateway TXN: ${verifyResult.transactionId})`
  );

  console.log(`[PaymentlyCallback] Successfully confirmed appointment ${apptRow.appointment_id}`);
  return res.redirect(`${hostUrl}/?payment_status=success&appointment_id=${encodeURIComponent(apptRow.appointment_id)}&txn=${encodeURIComponent(apptRow.transaction_ref || '')}`);
};

router.get('/paymently/callback', handlePaymentlyCallback);
router.post('/paymently/callback', handlePaymentlyCallback);

/**
 * 3. Paymently Cancellation Return URL
 * GET /api/payments/paymently/cancel
 */
router.get('/paymently/cancel', async (req: Request, res: Response) => {
  const hostUrl = (process.env.APP_URL || 'https://dakatarseial.bd').trim().replace(/\/+$/, '');
  const transactionRef = req.query.tx as string;

  if (transactionRef) {
    try {
      const [apptRows] = await pool.query<RowDataPacket[]>(`
        SELECT a.id, a.appointment_id, a.doctor_id, a.chamber_id, a.schedule_date, a.serial_number, a.status
        FROM appointments a
        WHERE a.transaction_ref = ?
      `, [transactionRef]);

      if (apptRows.length > 0) {
        const appt = apptRows[0] as any;
        if (appt.status === 'pending_payment') {
          // Mark appointment cancelled
          await pool.execute("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [appt.id]);
          // Mark matching payment record as failed (valid ENUM value)
          await pool.execute("UPDATE payments SET status = 'failed' WHERE appointment_id = ?", [appt.id]);

          // Free up serial slot
          await pool.execute(`
            UPDATE serials SET status = 'available'
            WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? AND status = 'booked'
          `, [appt.doctor_id, appt.chamber_id, appt.schedule_date, appt.serial_number]);

          console.log(`[PaymentlyCancel] Released serial and cancelled appointment ${appt.appointment_id}`);
        }
      }
    } catch (err: any) {
      console.error('[PaymentlyCancel] Error cancelling booking:', err);
    }
  }

  return res.redirect(`${hostUrl}/?payment_status=cancelled`);
});

/**
 * 4. Paymently IPN Webhook Endpoint
 * POST /api/payments/paymently/webhook
 */
router.post('/paymently/webhook', async (req: Request, res: Response) => {
  const invoiceId = req.body?.invoice_id || req.body?.invoiceId;

  if (!invoiceId) {
    console.warn('[PaymentlyWebhook] Missing invoice_id in webhook body:', req.body);
    return res.status(400).json({ error: 'MISSING_INVOICE_ID' });
  }

  console.log(`[PaymentlyWebhook] Processing webhook for invoice_id: ${invoiceId}`);

  // Re-verify transaction server-side
  const verifyResult = await verifyPayment(invoiceId);

  if (!verifyResult.success || verifyResult.status !== 'COMPLETED') {
    return res.status(200).json({ status: 'unverified_or_incomplete', verifyResult });
  }

  if (verifyResult.amount !== undefined && verifyResult.amount < BOOKING_FEE_BDT) {
    return res.status(400).json({ error: 'AMOUNT_MISMATCH' });
  }

  // Find matching appointment record
  let apptRow: any = null;
  if (verifyResult.metadata) {
    const metaTx = verifyResult.metadata.transactionRef || verifyResult.metadata.transaction_ref;
    const metaAppt = verifyResult.metadata.appointmentId || verifyResult.metadata.appointment_id;
    const metaPk = verifyResult.metadata.appointmentPk || verifyResult.metadata.appointment_pk;

    if (metaTx) {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT a.*, p.id as payment_pk, p.status as payment_status_val
        FROM appointments a
        LEFT JOIN payments p ON p.appointment_id = a.id
        WHERE a.transaction_ref = ?
      `, [metaTx]);
      if (rows.length > 0) apptRow = rows[0];
    }

    if (!apptRow && metaAppt) {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT a.*, p.id as payment_pk, p.status as payment_status_val
        FROM appointments a
        LEFT JOIN payments p ON p.appointment_id = a.id
        WHERE a.appointment_id = ?
      `, [metaAppt]);
      if (rows.length > 0) apptRow = rows[0];
    }

    if (!apptRow && metaPk) {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT a.*, p.id as payment_pk, p.status as payment_status_val
        FROM appointments a
        LEFT JOIN payments p ON p.appointment_id = a.id
        WHERE a.id = ?
      `, [Number(metaPk)]);
      if (rows.length > 0) apptRow = rows[0];
    }
  }

  if (!apptRow) {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT a.*, p.id as payment_pk, p.status as payment_status_val
      FROM payments p
      JOIN appointments a ON p.appointment_id = a.id
      WHERE p.gateway_response LIKE ?
    `, [`%${invoiceId}%`]);
    if (rows.length > 0) apptRow = rows[0];
  }

  if (apptRow) {
    // Idempotent: check if already paid
    if (apptRow.payment_status !== 'paid' && apptRow.payment_status_val !== 'paid') {
      const mappedMethod = mapPaymentMethod(verifyResult.paymentMethod);
      const paymentMethodLabel = verifyResult.paymentMethod ? `Paymently (${verifyResult.paymentMethod})` : 'Paymently';

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        if (apptRow.payment_pk) {
          await conn.execute(`
            UPDATE payments
            SET status = 'paid',
                method = ?,
                gateway_response = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            mappedMethod,
            JSON.stringify({
              invoiceId,
              gatewayTxnId: verifyResult.transactionId || null,
              paymentMethod: verifyResult.paymentMethod || null,
              senderNumber: verifyResult.senderNumber || null,
              amount: verifyResult.amount || BOOKING_FEE_BDT,
              raw: verifyResult.rawResponse || {},
            }),
            apptRow.payment_pk,
          ]);
        }

        await conn.execute(`
          UPDATE appointments
          SET status = 'confirmed',
              payment_status = 'paid',
              payment_method = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          paymentMethodLabel,
          apptRow.id,
        ]);

        await conn.commit();
        console.log(`[PaymentlyWebhook] Confirmed appointment ${apptRow.appointment_id}`);
      } catch (err: any) {
        await conn.rollback();
        console.error('[PaymentlyWebhook] DB error:', err);
        return res.status(500).json({ error: 'DB_ERROR' });
      } finally {
        conn.release();
      }
    }
  }

  return res.status(200).json({ success: true, message: 'Webhook processed successfully' });
});

/**
 * 5. Submit bKash Transaction ID (TrxID) for Verification
 * POST /api/payments/submit-trxid
 * Requirements:
 * - Never mark paid merely because a TrxID was entered
 * - Use verified Paymently API if supported; otherwise leave pending for admin verification
 */
router.post('/submit-trxid', async (req: Request, res: Response) => {
  const { transactionRef, appointmentId, trxId, invoiceId } = req.body;

  if (!trxId || typeof trxId !== 'string' || trxId.trim().length < 6) {
    return res.status(400).json({
      error: 'INVALID_TRXID',
      message: 'Please provide a valid bKash Transaction ID (at least 6-8 characters, e.g., 9J38SDF2).',
      message_bn: 'অনুগ্রহ করে সঠিক বিকাশ ট্রানজেকশন আইডি (TrxID) লিখুন (কমপক্ষে ৬-৮ ডিজিট/অক্ষর)।',
    });
  }

  const cleanTrxId = trxId.trim().toUpperCase();

  // Find appointment and payment
  let querySql = `
    SELECT a.*, p.id as payment_pk, p.status as payment_status_val, p.gateway_response, p.transaction_id as pmt_tx_id
    FROM appointments a
    LEFT JOIN payments p ON p.appointment_id = a.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (transactionRef) {
    querySql += ` AND (a.transaction_ref = ? OR p.transaction_id = ?)`;
    params.push(transactionRef, transactionRef);
  } else if (appointmentId) {
    querySql += ` AND a.appointment_id = ?`;
    params.push(appointmentId);
  } else {
    return res.status(400).json({
      error: 'MISSING_REFERENCE',
      message: 'transactionRef or appointmentId is required.',
    });
  }

  const [rows] = await pool.query<RowDataPacket[]>(querySql, params);
  if (rows.length === 0) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'No pending booking found for this reference.',
    });
  }

  const appt = rows[0] as any;

  // 1. If already paid, return confirmed immediately
  if (appt.payment_status === 'paid' || appt.payment_status_val === 'paid') {
    return res.json({
      success: true,
      verified: true,
      status: 'paid',
      message: 'Payment already verified and confirmed!',
      message_bn: 'পেমেন্ট ইতিমধ্যে যাচাই ও নিশ্চিত হয়েছে!',
      appointmentId: appt.appointment_id,
      transactionRef: appt.transaction_ref,
      bookingFee: BOOKING_FEE_BDT,
    });
  }

  // 2. Try official Paymently server-side verification if invoiceId exists or was stored
  let verifiedByGateway = false;
  let verifyResult: any = null;
  const targetInvoiceId = invoiceId || (() => {
    try {
      const parsed = JSON.parse(appt.gateway_response || '{}');
      return parsed.invoiceId || parsed.gateway_invoice_id || null;
    } catch {
      return null;
    }
  })();

  if (targetInvoiceId && isPaymentlyConfigured()) {
    try {
      verifyResult = await verifyPayment(targetInvoiceId);
      if (
        verifyResult.success &&
        verifyResult.status === 'COMPLETED' &&
        (verifyResult.amount === undefined || verifyResult.amount >= BOOKING_FEE_BDT)
      ) {
        verifiedByGateway = true;
      }
    } catch (e: any) {
      console.warn('[submit-trxid] Gateway verification attempt notice:', e.message);
    }
  }

  // 3. Update database based on verification result:
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (verifiedByGateway) {
      // Gateway verified! Mark paid and confirmed
      if (appt.payment_pk) {
        await conn.execute(`
          UPDATE payments
          SET status = 'paid',
              method = 'bkash',
              gateway_response = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          JSON.stringify({
            invoiceId: targetInvoiceId,
            submittedTrxId: cleanTrxId,
            gatewayTxnId: verifyResult?.transactionId || cleanTrxId,
            verifiedAt: new Date().toISOString(),
            raw: verifyResult?.rawResponse || {},
          }),
          appt.payment_pk,
        ]);
      }

      await conn.execute(`
        UPDATE appointments
        SET status = 'confirmed',
            payment_status = 'paid',
            payment_method = 'Paymently (bKash)',
            transaction_ref = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [cleanTrxId, appt.id]);

      await conn.commit();

      // Trigger notification
      notifyBookingSuccess({
        appointmentId: appt.appointment_id,
        serialNumber: appt.serial_number,
        appointmentTime: appt.appointment_time,
        scheduleDate: appt.schedule_date,
        doctorId: appt.doctor_id,
        doctorName: appt.doctor_name || 'Doctor',
        doctorTitle: appt.doctor_title || 'Dr.',
        chamberId: appt.chamber_id,
        chamberName: appt.chamber_name || 'Chamber',
        patientName: appt.patient_name,
        patientPhone: appt.patient_phone,
        fee: appt.fee,
        bookingSource: 'online',
      }).catch(() => {});

      await logActivity(
        null,
        'TRXID_VERIFIED_AUTOMATIC',
        `TrxID ${cleanTrxId} verified via Paymently for appointment ${appt.appointment_id}`
      );

      return res.json({
        success: true,
        verified: true,
        status: 'paid',
        message: 'Payment verified successfully! Your serial has been confirmed.',
        message_bn: 'পেমেন্ট সফলভাবে যাচাই হয়েছে! আপনার সিরিয়াল নিশ্চিত করা হয়েছে।',
        appointmentId: appt.appointment_id,
        transactionRef: cleanTrxId,
        serialNumber: appt.serial_number,
        scheduleDate: appt.schedule_date,
        appointmentTime: appt.appointment_time,
      });
    } else {
      // Gateway did not automatically verify (or manual Send Money was used).
      // CRITICAL REQUIREMENT 5: NEVER mark paid merely because TrxID was entered!
      // Keep pending for admin / gateway verification.
      let existingGatewayData: any = {};
      try {
        existingGatewayData = JSON.parse(appt.gateway_response || '{}');
      } catch {}

      const updatedGatewayData = {
        ...existingGatewayData,
        submittedTrxId: cleanTrxId,
        submittedAt: new Date().toISOString(),
        verificationStatus: 'pending_admin_approval',
        invoiceId: targetInvoiceId || existingGatewayData.invoiceId,
      };

      if (appt.payment_pk) {
        await conn.execute(`
          UPDATE payments
          SET method = 'bkash',
              gateway_response = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [JSON.stringify(updatedGatewayData), appt.payment_pk]);
      }

      await conn.execute(`
        UPDATE appointments
        SET transaction_ref = ?,
            payment_method = 'bKash (Pending Verification)',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [cleanTrxId, appt.id]);

      await conn.commit();

      await logActivity(
        null,
        'TRXID_SUBMITTED_PENDING',
        `TrxID ${cleanTrxId} submitted for appointment ${appt.appointment_id} (Held for Admin / Gateway Verification)`
      );

      return res.json({
        success: true,
        verified: false,
        status: 'pending',
        message: 'Your TrxID has been received and is pending verification. Our team will verify and confirm your serial shortly.',
        message_bn: 'আপনার ট্রানজেকশন আইডি (TrxID) জমা হয়েছে এবং যাচাইয়ের জন্য অপেক্ষমাণ। আমাদের টিম যাচাই করে দ্রুত সিরিয়াল নিশ্চিত করবে।',
        appointmentId: appt.appointment_id,
        submittedTrxId: cleanTrxId,
        serialNumber: appt.serial_number,
        scheduleDate: appt.schedule_date,
        appointmentTime: appt.appointment_time,
      });
    }
  } catch (err: any) {
    await conn.rollback();
    console.error('[submit-trxid] Error:', err);
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  } finally {
    conn.release();
  }
});

/**
 * 6. Check Transaction Status
 * GET /api/payments/status/:transactionRef
 */
router.get('/status/:transactionRef', async (req: Request, res: Response) => {
  const { transactionRef } = req.params;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        a.id as appointment_pk,
        a.appointment_id,
        a.status as appointment_status,
        a.payment_status as appointment_payment_status,
        a.booking_fee,
        a.fee as consultation_fee,
        a.transaction_ref,
        a.payment_method as appointment_payment_method,
        a.patient_name,
        a.serial_number,
        a.schedule_date,
        a.appointment_time,
        p.id as payment_pk,
        p.amount as payment_amount,
        p.status as payment_status,
        p.method as payment_method,
        p.transaction_id,
        p.gateway_response
      FROM appointments a
      LEFT JOIN payments p ON p.appointment_id = a.id
      WHERE a.transaction_ref = ? OR p.transaction_id = ?
      LIMIT 1
    `, [transactionRef, transactionRef]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'TRANSACTION_NOT_FOUND' });
    }

    const item = rows[0] as any;
    const finalStatus = item.payment_status || (item.appointment_payment_status === 'paid' ? 'paid' : 'pending');

    let submittedTrxId: string | null = null;
    try {
      const parsed = JSON.parse(item.gateway_response || '{}');
      submittedTrxId = parsed.submittedTrxId || null;
    } catch {}

    return res.json({
      success: true,
      transactionRef: item.transaction_ref || item.transaction_id,
      appointmentId: item.appointment_id,
      status: finalStatus,
      amount: item.payment_amount != null ? Number(item.payment_amount) : Number(item.booking_fee || BOOKING_FEE_BDT),
      currency: 'BDT',
      paymentMethod: item.appointment_payment_method || item.payment_method || 'online_payment',
      appointmentStatus: item.appointment_status,
      serialNumber: item.serial_number,
      scheduleDate: item.schedule_date,
      appointmentTime: item.appointment_time,
      consultationFee: item.consultation_fee,
      submittedTrxId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 6. Public Gateway Configuration Info (Safe, no secrets)
 * GET /api/payments/config
 */
router.get('/config', (req: Request, res: Response) => {
  res.json({
    gateway: 'Paymently',
    bookingFee: BOOKING_FEE_BDT,
    currency: 'BDT',
    isConfigured: isPaymentlyConfigured(),
    supportedMethods: ['bKash', 'Nagad', 'Rocket', 'Upay'],
  });
});

// Periodic background sweep to auto-expire stale pending payments older than 15 minutes (runs every 5 minutes)
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    reconcileExpiredPendingPayments().catch(() => {});
  }, 5 * 60 * 1000);
}

export default router;
