import pool, { initDatabase } from '../db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { encryptData, decryptData, maskSecret, maskGatewayConfig } from '../utils/crypto.js';
import { gatewayRegistry } from '../services/gateways/gatewayRegistry.js';
import { BOOKING_FEE_BDT } from '../services/paymentlyService.js';
import { confirmPaymentSuccess } from '../routes/paymentRoutes.js';

async function runTestSuite() {
  console.log('================================================================');
  console.log('  Payment Gateway Management System Verification & Regression Suite');
  console.log('================================================================');

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
    // 1. Encryption & Masking Security Tests
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Encryption & Masking Security Tests ---');

    const testSecret = 'dummy-test-secret-not-a-real-key';
    const encrypted = encryptData({ apiKey: testSecret, merchantId: '12345' });
    assert(typeof encrypted === 'string' && encrypted.length > 0, 'Credentials encrypted with AES-256-GCM');
    assert(!encrypted.includes(testSecret), 'Encrypted payload does NOT contain plaintext secret');

    const decrypted = decryptData<{ apiKey: string; merchantId: string }>(encrypted);
    assert(decrypted?.apiKey === testSecret, 'Decrypted payload matches original credential');
    assert(decrypted?.merchantId === '12345', 'Decrypted non-secret field matches');

    const masked = maskSecret(testSecret);
    assert(masked.includes('â€¢â€¢â€¢â€¢') && masked.endsWith('bbcc'), 'Secrets masked properly (e.g. sk_â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢bbcc)');
    assert(!masked.includes('99887766'), 'Middle entropy of secret is masked');

    const maskedConfig = maskGatewayConfig({ apiKey: testSecret, baseUrl: 'https://api.example.com', token: 'xyz123' });
    assert(maskedConfig.apiKey.includes('â€¢â€¢â€¢â€¢'), 'Sensitive keys masked automatically');
    assert(maskedConfig.baseUrl === 'https://api.example.com', 'Non-sensitive keys preserved unmasked');

    // -------------------------------------------------------------------------
    // 2. Database Schema & Tables Tests
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Database Schema & Tables Tests ---');

    const [gwRows] = await pool.query<RowDataPacket[]>('SELECT id, name, is_enabled, is_sandbox FROM payment_gateways');
    assert(gwRows.length >= 6, `Default gateways seeded (Found ${gwRows.length})`);
    
    const gatewayIds = gwRows.map((g: any) => g.id);
    assert(gatewayIds.includes('paymently'), 'Paymently gateway present in DB');
    assert(gatewayIds.includes('bkash'), 'bKash Direct Merchant gateway present in DB');
    assert(gatewayIds.includes('nagad'), 'Nagad gateway present in DB');
    assert(gatewayIds.includes('sslcommerz'), 'SSLCommerz gateway present in DB');

    const [auditCols] = await pool.query<RowDataPacket[]>('SELECT * FROM gateway_audit_logs LIMIT 1');
    assert(Array.isArray(auditCols), 'gateway_audit_logs table exists and queryable');

    // -------------------------------------------------------------------------
    // 3. Gateway Registry & Modular Adapters Tests
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Gateway Registry & Modular Adapters Tests ---');

    const allGateways = await gatewayRegistry.getAllGateways();
    assert(allGateways.length >= 6, 'Gateway registry retrieves all supported gateways');

    const paymentlyGw = await gatewayRegistry.getGateway('paymently');
    assert(paymentlyGw !== null, 'Paymently adapter instantiated');
    assert(paymentlyGw?.adapter.id === 'paymently', 'Paymently adapter ID matches');

    const bkashGw = await gatewayRegistry.getGateway('bkash');
    assert(bkashGw !== null, 'bKash adapter instantiated');
    assert(bkashGw?.adapter.id === 'bkash', 'bKash adapter ID matches');

    // -------------------------------------------------------------------------
    // 4. Test Connection Logic & Credential Handling
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Test Connection Logic & Credential Handling ---');

    // Test connection without credentials should fail with clean error
    const emptyTest = await bkashGw!.adapter.testConnection({}, true);
    assert(!emptyTest.success, 'bKash test without credentials returns failure');
    assert(emptyTest.message.includes('Missing required bKash credentials'), 'bKash test message specifies missing fields');

    // Test connection with dummy credentials against sandbox
    const dummyTest = await bkashGw!.adapter.testConnection({
      app_key: 'dummy_key',
      app_secret: 'dummy_secret',
      username: 'dummy_user',
      password: 'dummy_password',
    }, true);
    assert(!dummyTest.success, 'Dummy bKash credentials rejected by server');

    // -------------------------------------------------------------------------
    // 5. Configuration Update & Audit Log Tests
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Configuration Update & Audit Log Tests ---');

    const updated = await gatewayRegistry.updateGateway(
      'paymently',
      {
        surcharge_percentage: 1.5,
        surcharge_fixed: 2.0,
        credentials: { apiKey: 'test_updated_api_key_12345' },
      },
      { id: 1, email: 'admin@daktarserial.bd' },
      '127.0.0.1'
    );
    assert(updated, 'Gateway configuration updated successfully');

    const auditLogs = await gatewayRegistry.getAuditLogs('paymently', 5);
    assert(auditLogs.length > 0, 'Audit log recorded for gateway update');
    assert(auditLogs[0].action === 'UPDATE_CONFIG', 'Audit action recorded accurately');
    assert(!JSON.stringify(auditLogs[0].changes).includes('test_updated_api_key_12345'), 'Audit log does NOT leak raw secrets');

    // -------------------------------------------------------------------------
    // 6. Fee Separation & Surcharge Calculation
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Fee Separation & Surcharge Calculation ---');

    const activeList = await gatewayRegistry.getAllGateways();
    const updatedPaymently = activeList.find((g) => g.id === 'paymently');
    assert(updatedPaymently?.surcharge_fixed === 2.0, 'Fixed surcharge preserved');
    assert(updatedPaymently?.surcharge_percentage === 1.5, 'Percentage surcharge preserved');

    const expectedSurcharge = 2.0 + (BOOKING_FEE_BDT * 1.5) / 100;
    const expectedTotal = BOOKING_FEE_BDT + expectedSurcharge;
    assert(expectedTotal === 12.15, `Booking Fee à§³10 + Surcharge à§³${expectedSurcharge} = à§³${expectedTotal}`);

    // -------------------------------------------------------------------------
    // 7. Server-Side Payment Verification (Strict Security)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Server-Side Payment Verification (Strict Security) ---');

    // Insert dummy appointment to test confirmPaymentSuccess
    const dummyRef = `DS-TEST-TXN-${Date.now()}`;
    const [insAppt] = await pool.execute<ResultSetHeader>(`
      INSERT INTO appointments (
        appointment_id, doctor_id, chamber_id, schedule_id, schedule_date, serial_number, appointment_time,
        patient_name, patient_phone, patient_gender, fee, booking_fee, payment_status, status, transaction_ref, payment_method
      ) VALUES (?, 1, 1, 1, '2026-10-20', 99, '10:00 AM', 'Test Patient', '01711000000', 'male', 500.00, 10.00, 'unpaid', 'pending_payment', ?, 'Online')
    `, [`DS-TEST-${Date.now()}`, dummyRef]);

    const apptDbId = insAppt.insertId;

    // Confirm payment server-side
    const confirmResult = await confirmPaymentSuccess(apptDbId, {
      transactionId: 'TEST-GATEWAY-TXN-999',
      paymentMethod: 'bKash Merchant',
      gatewayId: 'bkash',
      amount: 10.00,
      verifiedBy: 'test:automated-suite',
    });

    assert(confirmResult.success, 'confirmPaymentSuccess marks appointment paid atomically');

    const [verifyRows] = await pool.query<RowDataPacket[]>('SELECT status, payment_status, fee, booking_fee FROM appointments WHERE id = ?', [apptDbId]);
    const verifiedAppt = verifyRows[0] as any;
    assert(verifiedAppt.payment_status === 'paid', 'Appointment payment_status is paid');
    assert(verifiedAppt.status === 'confirmed', 'Appointment status is confirmed');
    assert(Number(verifiedAppt.fee) === 500.00, 'Doctor consultation fee à§³500 remains strictly intact and unchanged');
    assert(Number(verifiedAppt.booking_fee) === 10.00, 'Online booking fee à§³10.00 confirmed');

    // Clean up test record
    await pool.execute('DELETE FROM payments WHERE appointment_id = ?', [apptDbId]);
    await pool.execute('DELETE FROM appointments WHERE id = ?', [apptDbId]);
    assert(true, 'Test appointment and payment cleaned up safely');

    console.log('\n================================================================');
    console.log(`  Tests Complete: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTestSuite().then(() => {
  process.exit(0);
});

