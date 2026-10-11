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
 * Helper to generate unique transaction reference
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
 */
async function reconcileExpiredPendingPayments(): Promise<void> {
  try {
    // Find pending payments older than 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const [expiredRows] = await pool.query<RowDataPacket[]>(`
      SELECT p.id as payment_id, p.appointment_id, p.transaction_ref, a.doctor_id, a.chamber_id, a.schedule_date, a.serial_number
      FROM payments p
      JOIN appointments a ON p.appointment_id = a.appointment_id
      WHERE p.status = 'pending' AND a.status = 'pending_payment' AND p.created_at < ?
    `, [fifteenMinutesAgo.toISOString().slice(0, 19).replace('T', ' ')]);

    for (const row of expiredRows) {
      console.log(`[PaymentReconcile] Expiring stale pending booking ${row.appointment_id} (TXN: ${row.transaction_ref})`);
      // 1. Mark payment expired
      await pool.execute("UPDATE payments SET status = 'expired' WHERE id = ?", [row.payment_id]);
      // 2. Mark appointment cancelled
      await pool.execute("UPDATE appointments SET status = 'cancelled' WHERE appointment_id = ?", [row.appointment_id]);
      // 3. Free up serial slot in serials table back to available
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
    await conn.execute(`
      INSERT INTO appointments (
        appointment_id, patient_id, doctor_id, chamber_id, schedule_id,
        schedule_date, serial_number, appointment_time,
        patient_name, patient_phone, patient_age, patient_gender,
        problem_description, fee, booking_fee, payment_status, booking_source,
        transaction_ref, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'online', ?, ?, 'pending_payment')
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

    // Insert pending payment record
    await conn.execute(`
      INSERT INTO payments (
        appointment_id, transaction_ref, payment_gateway, amount, currency, status, metadata
      ) VALUES (?, ?, 'paymently', ?, 'BDT', 'pending', ?)
    `, [
      appointmentId,
      transactionRef,
      BOOKING_FEE_BDT,
      JSON.stringify({
        patientName,
        patientPhone,
        doctorId: docIdNum,
        chamberId: chamIdNum,
        scheduleDate,
        serialNumber: serialNum,
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
    // Safe cancellation: release serial slot and mark appointment failed
    await pool.execute("UPDATE payments SET status = 'failed', raw_response = ? WHERE transaction_ref = ?", [
      JSON.stringify(chargeResult.rawResponse || chargeResult.message),
      transactionRef,
    ]);
    await pool.execute("UPDATE appointments SET status = 'cancelled' WHERE transaction_ref = ?", [transactionRef]);
    await pool.execute(`
      UPDATE serials SET status = 'available'
      WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? AND status = 'booked'
    `, [docIdNum, chamIdNum, scheduleDate, serialNum]);

    return res.status(502).json({
      error: 'GATEWAY_ERROR',
      message: chargeResult.message || 'Payment gateway failed to initialize checkout session.',
    });
  }

  // Update payment record with payment_url and gateway invoice_id
  await pool.execute(`
    UPDATE payments
    SET payment_url = ?, gateway_invoice_id = ?, raw_response = ?
    WHERE transaction_ref = ?
  `, [
    chargeResult.paymentUrl,
    chargeResult.invoiceId || null,
    JSON.stringify(chargeResult.rawResponse || {}),
    transactionRef,
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

  // Amount verification (must cover booking fee BDT 10)
  if (verifyResult.amount !== undefined && verifyResult.amount < BOOKING_FEE_BDT) {
    console.error(`[PaymentlyCallback] Amount mismatch! Expected >= ${BOOKING_FEE_BDT}, got ${verifyResult.amount}`);
    return res.redirect(`${hostUrl}/?payment_status=failed&error=amount_mismatch`);
  }

  // Look up matching payment record
  // 1. By gateway_invoice_id
  let [paymentRows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM payments WHERE gateway_invoice_id = ?',
    [invoiceId]
  );

  // 2. Fallback lookup by metadata transactionRef or appointmentId
  if (paymentRows.length === 0 && verifyResult.metadata) {
    const metaTx = verifyResult.metadata.transactionRef || verifyResult.metadata.transaction_ref;
    const metaAppt = verifyResult.metadata.appointmentId || verifyResult.metadata.appointment_id;
    if (metaTx) {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM payments WHERE transaction_ref = ?', [metaTx]);
      paymentRows = rows;
    } else if (metaAppt) {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM payments WHERE appointment_id = ?', [metaAppt]);
      paymentRows = rows;
    }
  }

  if (paymentRows.length === 0) {
    console.error(`[PaymentlyCallback] No payment record found for verified invoice ${invoiceId}`);
    return res.redirect(`${hostUrl}/?payment_status=failed&error=record_not_found`);
  }

  const payment = paymentRows[0] as any;

  // Idempotency: Prevent duplicate callback processing
  if (payment.status === 'completed') {
    console.log(`[PaymentlyCallback] Payment ${payment.transaction_ref} already completed. Redirecting to confirmation.`);
    return res.redirect(`${hostUrl}/?payment_status=success&appointment_id=${encodeURIComponent(payment.appointment_id)}&txn=${encodeURIComponent(payment.transaction_ref)}`);
  }

  // Update payment and appointment atomically
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(`
      UPDATE payments
      SET status = 'completed',
          gateway_invoice_id = ?,
          gateway_transaction_id = ?,
          payment_method = ?,
          sender_number = ?,
          raw_response = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      invoiceId,
      verifyResult.transactionId || null,
      verifyResult.paymentMethod || 'mfs',
      verifyResult.senderNumber || null,
      JSON.stringify(verifyResult.rawResponse || {}),
      payment.id,
    ]);

    await conn.execute(`
      UPDATE appointments
      SET status = 'confirmed',
          payment_status = 'paid',
          payment_method = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE appointment_id = ?
    `, [
      verifyResult.paymentMethod || 'mfs',
      payment.appointment_id,
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
    const [apptRows] = await pool.query<RowDataPacket[]>(`
      SELECT a.*, d.title as doctor_title, u.name as doctor_name, c.name as chamber_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      JOIN chambers c ON a.chamber_id = c.id
      WHERE a.appointment_id = ?
    `, [payment.appointment_id]);

    if (apptRows.length > 0) {
      const appt = apptRows[0] as any;
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
    `Paymently verified: ৳${BOOKING_FEE_BDT} for appointment ${payment.appointment_id} (TXN: ${payment.transaction_ref}, Gateway TXN: ${verifyResult.transactionId})`
  );

  console.log(`[PaymentlyCallback] Successfully confirmed appointment ${payment.appointment_id}`);
  return res.redirect(`${hostUrl}/?payment_status=success&appointment_id=${encodeURIComponent(payment.appointment_id)}&txn=${encodeURIComponent(payment.transaction_ref)}`);
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
      const [paymentRows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM payments WHERE transaction_ref = ?',
        [transactionRef]
      );

      if (paymentRows.length > 0) {
        const payment = paymentRows[0] as any;
        if (payment.status === 'pending') {
          // Mark payment cancelled
          await pool.execute("UPDATE payments SET status = 'cancelled' WHERE id = ?", [payment.id]);
          // Mark appointment cancelled
          await pool.execute("UPDATE appointments SET status = 'cancelled' WHERE appointment_id = ?", [payment.appointment_id]);

          // Fetch appointment details to free up serial
          const [apptRows] = await pool.query<RowDataPacket[]>(
            'SELECT doctor_id, chamber_id, schedule_date, serial_number FROM appointments WHERE appointment_id = ?',
            [payment.appointment_id]
          );

          if (apptRows.length > 0) {
            const appt = apptRows[0] as any;
            await pool.execute(`
              UPDATE serials SET status = 'available'
              WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ? AND status = 'booked'
            `, [appt.doctor_id, appt.chamber_id, appt.schedule_date, appt.serial_number]);
          }

          console.log(`[PaymentlyCancel] Released serial and cancelled appointment ${payment.appointment_id}`);
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

  // Find payment record
  let [paymentRows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM payments WHERE gateway_invoice_id = ?',
    [invoiceId]
  );

  if (paymentRows.length === 0 && verifyResult.metadata) {
    const metaTx = verifyResult.metadata.transactionRef || verifyResult.metadata.transaction_ref;
    if (metaTx) {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM payments WHERE transaction_ref = ?', [metaTx]);
      paymentRows = rows;
    }
  }

  if (paymentRows.length > 0) {
    const payment = paymentRows[0] as any;
    if (payment.status !== 'completed') {
      await pool.execute(`
        UPDATE payments
        SET status = 'completed',
            gateway_invoice_id = ?,
            gateway_transaction_id = ?,
            payment_method = ?,
            sender_number = ?,
            raw_response = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        invoiceId,
        verifyResult.transactionId || null,
        verifyResult.paymentMethod || 'mfs',
        verifyResult.senderNumber || null,
        JSON.stringify(verifyResult.rawResponse || {}),
        payment.id,
      ]);

      await pool.execute(`
        UPDATE appointments
        SET status = 'confirmed',
            payment_status = 'paid',
            payment_method = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE appointment_id = ?
      `, [
        verifyResult.paymentMethod || 'mfs',
        payment.appointment_id,
      ]);

      console.log(`[PaymentlyWebhook] Confirmed appointment ${payment.appointment_id}`);
    }
  }

  return res.status(200).json({ success: true, message: 'Webhook processed successfully' });
});

/**
 * 5. Check Transaction Status
 * GET /api/payments/status/:transactionRef
 */
router.get('/status/:transactionRef', async (req: Request, res: Response) => {
  const { transactionRef } = req.params;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT p.*, a.status as appointment_status, a.patient_name, a.serial_number, a.schedule_date, a.appointment_time
      FROM payments p
      JOIN appointments a ON p.appointment_id = a.appointment_id
      WHERE p.transaction_ref = ?
    `, [transactionRef]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'TRANSACTION_NOT_FOUND' });
    }

    const item = rows[0] as any;
    return res.json({
      success: true,
      transactionRef: item.transaction_ref,
      appointmentId: item.appointment_id,
      status: item.status,
      amount: item.amount,
      currency: item.currency,
      paymentMethod: item.payment_method,
      appointmentStatus: item.appointment_status,
      serialNumber: item.serial_number,
      scheduleDate: item.schedule_date,
      appointmentTime: item.appointment_time,
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
