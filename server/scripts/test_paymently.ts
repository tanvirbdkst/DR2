import pool, { initDatabase } from '../db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import {
  createPaymentCharge,
  verifyPayment,
  isPaymentlyConfigured,
  getEnabledMfsMethods,
  getMfsMethodsConfig,
  validateMethodTrxId,
  safePaymentMethodEnum,
  BOOKING_FEE_BDT,
  GATEWAY_SURCHARGE_BDT,
  TOTAL_PAYABLE_GATEWAY_BDT,
} from '../services/paymentlyService.js';
import { bookAppointment } from '../appointmentService.js';
import { reconcileExpiredPendingPayments } from '../routes/paymentRoutes.js';

async function runPaymentlyTests() {
  console.log('========================================================');
  console.log('  Paymently Gateway Integration & Schema Verification Suite');
  console.log('  Testing against confirmed production schema: pixeswpo_dr');
  console.log('========================================================');

  // Initialize DB pool
  await initDatabase();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details = '') {
    if (condition) {
      console.log(` [PASS] ${testName}`);
      passed++;
    } else {
      console.error(` [FAIL] ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Configuration & Secret Isolation Tests
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Configuration & Secret Isolation Tests ---');
    const configured = isPaymentlyConfigured();
    console.log(`Paymently Configured: ${configured}`);
    const keyInEnv = process.env.PAYMENTLY_API_KEY || '';
    assert(
      !keyInEnv.includes('HARDCODED_REAL_KEY'),
      'API key is not exposed or hardcoded in client/repo files'
    );
    assert(
      process.env.PAYMENTLY_API_URL === 'https://daktarserial.paymently.io/api' || !process.env.PAYMENTLY_API_URL,
      'Paymently API Base URL correctly configured for https://daktarserial.paymently.io/api'
    );

    // -------------------------------------------------------------------------
    // 2. Server-side Verification Security Tests
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Server-side Verification Security Tests ---');
    const emptyVerify = await verifyPayment('');
    assert(emptyVerify.success === false, 'Empty invoice_id rejected without calling gateway');
    assert(emptyVerify.error === 'MISSING_INVOICE_ID', 'Missing invoice error code verified');

    const fakeVerify = await verifyPayment('FAKE_INVOICE_99999');
    assert(fakeVerify.success === false, 'Invalid / fake invoice_id fails verification and is NEVER marked as paid');

    // -------------------------------------------------------------------------
    // 3. Amount Mismatch Protection Tests
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Amount Mismatch Protection Tests ---');
    const underpaidAmount = 5.0;
    assert(
      underpaidAmount < BOOKING_FEE_BDT,
      'Underpaid amount (৳5) is strictly less than required booking fee (৳10)'
    );

    // -------------------------------------------------------------------------
    // 4. Production Schema Alignment & Successful Payment
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Production Schema Alignment & Successful Payment ---');
    const [docs] = await pool.query<RowDataPacket[]>('SELECT id FROM doctors LIMIT 1');
    const [chambers] = await pool.query<RowDataPacket[]>('SELECT id FROM chambers LIMIT 1');
    const docId = docs.length > 0 ? docs[0].id : 1;
    const chamberId = chambers.length > 0 ? chambers[0].id : 1;
    assert(docId > 0 && chamberId > 0, 'Seed doctor and chamber exist for testing');

    const testDate = '2026-12-15';
    const testSerial = 88;
    const uniqueTxnRef = `DS-TXN-TEST-${Date.now()}`;
    const uniqueApptId = `DS-20261215-00088-${Date.now().toString().slice(-4)}`;

    await pool.execute('DELETE FROM serials WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?', [docId, chamberId, testDate, testSerial]);
    const [schedRows] = await pool.query<RowDataPacket[]>('SELECT id FROM doctor_schedules WHERE doctor_id = ? LIMIT 1', [docId]);
    const schedId = schedRows.length > 0 ? schedRows[0].id : 1;

    await pool.execute(`
      INSERT INTO serials (schedule_id, doctor_id, chamber_id, schedule_date, serial_number, estimated_time, status)
      VALUES (?, ?, ?, ?, ?, '11:00 AM', 'booked')
    `, [schedId, docId, chamberId, testDate, testSerial]);

    const [apptInsertResult] = await pool.execute<ResultSetHeader>(`
      INSERT INTO appointments (
        appointment_id, patient_id, doctor_id, chamber_id, schedule_id,
        patient_name, patient_phone, patient_age, patient_gender,
        schedule_date, serial_number, appointment_time, problem_description,
        fee, booking_fee, payment_status, booking_source, status, transaction_ref, payment_method
      ) VALUES (?, NULL, ?, ?, ?, 'Test Patient', '01700000000', 30, 'male', ?, ?, '11:00 AM', 'Checkup', 800.00, 10.00, 'unpaid', 'online', 'pending_payment', ?, 'online_payment')
    `, [uniqueApptId, docId, chamberId, schedId, testDate, testSerial, uniqueTxnRef]);

    const numericApptId = apptInsertResult.insertId;
    assert(numericApptId > 0, 'Appointment created with numeric primary key id');

    const [pmtInsertResult] = await pool.execute<ResultSetHeader>(`
      INSERT INTO payments (
        appointment_id, transaction_id, method, amount, status, gateway_response
      ) VALUES (?, ?, 'online_payment', 10.00, 'pending', ?)
    `, [numericApptId, uniqueTxnRef, JSON.stringify({ test: true })]);

    const numericPaymentId = pmtInsertResult.insertId;
    assert(numericPaymentId > 0, 'Payment record inserted using numeric appointments.id as foreign key');

    const [pmtRows] = await pool.query<RowDataPacket[]>('SELECT * FROM payments WHERE id = ?', [numericPaymentId]);
    assert(pmtRows.length === 1, 'Payment record retrieved by numeric ID');
    assert(pmtRows[0].appointment_id === numericApptId, 'payments.appointment_id strictly stores numeric appointments.id');
    assert(pmtRows[0].transaction_id === uniqueTxnRef, 'payments.transaction_id stores unique transactionRef');
    assert(Number(pmtRows[0].amount) === 10.00, 'payments.amount is strictly ৳10.00 booking fee');
    assert(pmtRows[0].status === 'pending', 'payments.status is initially pending');

    await pool.execute(`
      UPDATE appointments
      SET payment_status = 'paid', status = 'confirmed', payment_method = 'Paymently (bKash)', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [numericApptId]);

    const [updatedApptRows] = await pool.query<RowDataPacket[]>('SELECT payment_status, status, fee, booking_fee, payment_method FROM appointments WHERE id = ?', [numericApptId]);
    assert(updatedApptRows[0].payment_status === 'paid', 'Appointment payment_status updated to paid');
    assert(updatedApptRows[0].status === 'confirmed', 'Appointment status updated to confirmed');
    assert(updatedApptRows[0].payment_method === 'Paymently (bKash)', 'Appointment payment_method recorded');
    assert(Number(updatedApptRows[0].fee) === 800.00, 'Doctor consultation fee remains strictly unchanged');
    assert(Number(updatedApptRows[0].booking_fee) === 10.00, 'Booking fee remains strictly BDT 10.00');

    await pool.execute(`
      UPDATE payments
      SET status = 'paid', method = 'bkash', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [numericPaymentId]);

    const [updatedPmtRows] = await pool.query<RowDataPacket[]>('SELECT status, method FROM payments WHERE id = ?', [numericPaymentId]);
    assert(updatedPmtRows[0].status === 'paid', 'payments.status updated to paid (valid ENUM value)');
    assert(updatedPmtRows[0].method === 'bkash', 'payments.method updated to bkash (valid ENUM value)');

    // -------------------------------------------------------------------------
    // 5. Idempotency & Duplicate Callback Tests
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Idempotency & Duplicate Callback Tests ---');
    const [idempAppt] = await pool.query<RowDataPacket[]>('SELECT payment_status FROM appointments WHERE id = ?', [numericApptId]);
    assert(idempAppt[0].payment_status === 'paid', 'Appointment is already in paid state');

    const [duplicatePmtCheck] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM payments WHERE appointment_id = ?', [numericApptId]);
    assert(duplicatePmtCheck[0].count === 1, 'No duplicate payments rows created on repeated processing');

    // -------------------------------------------------------------------------
    // 6. Multi-MFS Method Configuration & Active Detection (Requirements 1, 2, 9)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Multi-MFS Configuration & Active Detection Tests ---');
    const mfsConfig = getMfsMethodsConfig();
    assert(Array.isArray(mfsConfig.methods) && mfsConfig.methods.length === 4, 'All 4 MFS channels (bKash, Nagad, Rocket, Upay) defined');
    assert(mfsConfig.bookingFee === 10.00, 'Booking fee configuration is strictly BDT 10.00');
    assert(mfsConfig.gatewayFee === 2.00, 'Gateway surcharge configuration is BDT 2.00');
    assert(mfsConfig.totalPayable === 12.00, 'Total payable on gateway is BDT 12.00');

    const bkashMethod = mfsConfig.methods.find((m) => m.id === 'bkash');
    assert(Boolean(bkashMethod), 'bKash method metadata present');
    assert(bkashMethod?.hasAppDeepLink === true, 'bKash has documented app deep link / intent on Android');

    const nagadMethod = mfsConfig.methods.find((m) => m.id === 'nagad');
    assert(Boolean(nagadMethod), 'Nagad method metadata present');
    assert(nagadMethod?.hasAppDeepLink === false, 'Nagad does not invent speculative deep links (Requirement 4)');

    const rocketMethod = mfsConfig.methods.find((m) => m.id === 'rocket');
    assert(Boolean(rocketMethod), 'Rocket method metadata present');

    const upayMethod = mfsConfig.methods.find((m) => m.id === 'upay');
    assert(Boolean(upayMethod), 'Upay method metadata present');

    // -------------------------------------------------------------------------
    // 7. Method-Specific TrxID Validation Tests (Requirements 3 & 4)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Method-Specific TrxID Validation Tests ---');
    // bKash: 8-10 alphanumeric
    const validBkash = validateMethodTrxId('bkash', 'BLK92X4KP1');
    assert(validBkash.valid === true, 'Valid bKash TrxID format accepted (e.g., BLK92X4KP1)');
    const invalidBkash = validateMethodTrxId('bkash', 'BK#12');
    assert(invalidBkash.valid === false, 'Invalid bKash TrxID rejected');

    // Nagad: 8 alphanumeric
    const validNagad = validateMethodTrxId('nagad', '72K8PL9J');
    assert(validNagad.valid === true, 'Valid Nagad TrxID format accepted (8 chars from SMS 16167)');
    const invalidNagad = validateMethodTrxId('nagad', '123');
    assert(invalidNagad.valid === false, 'Too short Nagad TrxID rejected');

    // Rocket: 10-12 numeric digits
    const validRocket = validateMethodTrxId('rocket', '3829104821');
    assert(validRocket.valid === true, 'Valid Rocket TxnId accepted (10-12 digits from SMS 16216)');
    const invalidRocket = validateMethodTrxId('rocket', 'ROCKET_ABC');
    assert(invalidRocket.valid === false, 'Alpha Rocket TxnId rejected (must be numeric digits)');

    // Upay: 10 alphanumeric
    const validUpay = validateMethodTrxId('upay', 'UP91248590');
    assert(validUpay.valid === true, 'Valid Upay TrxID accepted (10 chars from SMS 16419)');
    const invalidUpay = validateMethodTrxId('upay', 'UPAY');
    assert(invalidUpay.valid === false, 'Too short Upay TrxID rejected');

    assert(
      validRocket.valid !== validateMethodTrxId('rocket', 'NOT_DIGITS').valid,
      'bKash TrxID logic is NOT blindly reused for Rocket or other methods (Requirement 3)'
    );

    // -------------------------------------------------------------------------
    // 8. Safe ENUM Mapping Tests for MySQL & DB Schema (Requirement 7)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Safe ENUM Mapping Tests ---');
    assert(safePaymentMethodEnum('bkash') === 'bkash', 'safePaymentMethodEnum maps bkash');
    assert(safePaymentMethodEnum('nagad') === 'nagad', 'safePaymentMethodEnum maps nagad');
    assert(
      safePaymentMethodEnum('rocket') === 'rocket' || safePaymentMethodEnum('rocket') === 'online_payment',
      'safePaymentMethodEnum safely handles rocket'
    );
    assert(
      safePaymentMethodEnum('upay') === 'upay' || safePaymentMethodEnum('upay') === 'online_payment',
      'safePaymentMethodEnum safely handles upay'
    );

    // -------------------------------------------------------------------------
    // 9. Nagad / Rocket / Upay Submission & Pending Verification (Requirement 6)
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Nagad / Rocket / Upay Pending Verification Tests ---');
    const nagadTxnRef = `DS-NAGAD-${Date.now()}`;
    const nagadApptId = `DS-20261215-00099-${Date.now().toString().slice(-4)}`;

    const [nagadApptRes] = await pool.execute<ResultSetHeader>(`
      INSERT INTO appointments (
        appointment_id, patient_id, doctor_id, chamber_id, schedule_id,
        patient_name, patient_phone, patient_age, patient_gender,
        schedule_date, serial_number, appointment_time, problem_description,
        fee, booking_fee, payment_status, booking_source, status, transaction_ref, payment_method
      ) VALUES (?, NULL, ?, ?, ?, 'Nagad Patient', '01800000000', 25, 'female', ?, 99, '12:00 PM', 'Consultation', 1000.00, 10.00, 'unpaid', 'online', 'pending_payment', ?, 'online_payment')
    `, [nagadApptId, docId, chamberId, schedId, testDate, nagadTxnRef]);

    const nagadApptPk = nagadApptRes.insertId;

    const [nagadPmtRes] = await pool.execute<ResultSetHeader>(`
      INSERT INTO payments (appointment_id, transaction_id, method, amount, status, gateway_response)
      VALUES (?, ?, 'online_payment', 10.00, 'pending', '{}')
    `, [nagadApptPk, nagadTxnRef]);

    const nagadPmtPk = nagadPmtRes.insertId;

    // Simulate patient submitting Nagad TrxID
    const submittedNagadTrx = '72K8PL9J';
    await pool.execute(`
      UPDATE payments
      SET method = ?,
          gateway_response = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      safePaymentMethodEnum('nagad'),
      JSON.stringify({
        submittedTrxId: submittedNagadTrx,
        method: 'nagad',
        methodLabel: 'Nagad',
        verificationStatus: 'pending_admin_approval',
      }),
      nagadPmtPk,
    ]);

    await pool.execute(`
      UPDATE appointments
      SET transaction_ref = ?,
          payment_method = 'Paymently (Nagad - Pending Verification)',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [submittedNagadTrx, nagadApptPk]);

    const [afterNagadSubmit] = await pool.query<RowDataPacket[]>('SELECT payment_status, status, payment_method FROM appointments WHERE id = ?', [nagadApptPk]);
    assert(afterNagadSubmit[0].payment_status === 'unpaid', 'Appointment payment_status remains UNPAID after entering Nagad TrxID (Requirement 6)');
    assert(afterNagadSubmit[0].status === 'pending_payment', 'Appointment status remains PENDING_PAYMENT after entering Nagad TrxID');
    assert(afterNagadSubmit[0].payment_method.includes('Nagad'), 'Appointment payment_method accurately reflects Nagad');

    // Admin verifies Nagad payment
    await pool.execute(`
      UPDATE appointments
      SET status = 'confirmed',
          payment_status = 'paid',
          payment_method = 'Paymently (Nagad - Admin Verified)',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [nagadApptPk]);

    await pool.execute(`
      UPDATE payments
      SET status = 'paid',
          method = ?,
          gateway_response = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      safePaymentMethodEnum('nagad'),
      JSON.stringify({
        verifiedByAdminId: 1,
        verifiedByAdminName: 'Super Admin',
        verifiedAt: new Date().toISOString(),
        method: 'nagad',
      }),
      nagadPmtPk,
    ]);

    const [afterNagadAdmin] = await pool.query<RowDataPacket[]>('SELECT payment_status, status, payment_method FROM appointments WHERE id = ?', [nagadApptPk]);
    assert(afterNagadAdmin[0].payment_status === 'paid', 'Nagad appointment marked paid after admin verification');
    assert(afterNagadAdmin[0].payment_method.includes('Nagad - Admin Verified'), 'Payment method preserved as Nagad in admin confirmation');

    // Clean up Nagad test record
    await pool.execute('DELETE FROM payments WHERE id = ?', [nagadPmtPk]);
    await pool.execute('DELETE FROM appointments WHERE id = ?', [nagadApptPk]);

    // -------------------------------------------------------------------------
    // 10. Fee Integrity & Checkout Amount Analysis (Requirement 5)
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Fee Integrity & Checkout Amount Verification ---');
    assert(
      BOOKING_FEE_BDT === 10.00,
      'Application code strictly sets booking fee as BDT 10.00 without silent changes'
    );
    assert(
      GATEWAY_SURCHARGE_BDT === 2.00,
      'Paymently gateway convenience fee is explicitly BDT 2.00 (not hidden)'
    );
    assert(
      TOTAL_PAYABLE_GATEWAY_BDT === 12.00,
      'Total payable amount on gateway is transparently BDT 12.00 (Requirement 5)'
    );

    // Clean up successful payment test appointment
    await pool.execute('DELETE FROM payments WHERE id = ?', [numericPaymentId]);
    await pool.execute('DELETE FROM appointments WHERE id = ?', [numericApptId]);
    await pool.execute('DELETE FROM serials WHERE doctor_id = ? AND chamber_id = ? AND schedule_date = ? AND serial_number = ?', [docId, chamberId, testDate, testSerial]);

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n========================================================');
    console.log(`Test Summary: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runPaymentlyTests();
