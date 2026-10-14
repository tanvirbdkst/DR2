import { Router, Request, Response } from 'express';
import { requireAuth, requireRole, AuthUser } from '../auth.js';
import { gatewayRegistry } from '../services/gateways/gatewayRegistry.js';
import { PaymentGatewayId } from '../services/gateways/types.js';

const router = Router();

// Middleware: all routes require Admin role
router.use(requireAuth, requireRole(['admin']));

/**
 * GET /api/admin/payment-gateways
 * Lists all registered payment gateways with masked credentials, active status, and test health.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const gateways = await gatewayRegistry.getAllGateways();
    return res.json({ success: true, gateways });
  } catch (err: any) {
    console.error('[AdminPaymentGateway] Error listing gateways:', err);
    return res.status(500).json({ error: 'Failed to retrieve payment gateways' });
  }
});

/**
 * GET /api/admin/payment-gateways/audit-logs/all
 * Lists recent gateway configuration audit logs.
 */
router.get('/audit-logs/all', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const logs = await gatewayRegistry.getAuditLogs(undefined, limit);
    return res.json({ success: true, logs });
  } catch (err: any) {
    console.error('[AdminPaymentGateway] Error listing all audit logs:', err);
    return res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
});

/**
 * GET /api/admin/payment-gateways/:id
 * Retrieve single gateway details with masked config.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const all = await gatewayRegistry.getAllGateways();
    const gateway = all.find((g) => g.id === id);

    if (!gateway) {
      return res.status(404).json({ error: `Payment gateway '${id}' not found` });
    }

    return res.json({ success: true, gateway });
  } catch (err: any) {
    console.error(`[AdminPaymentGateway] Error fetching gateway ${req.params.id}:`, err);
    return res.status(500).json({ error: 'Failed to retrieve gateway details' });
  }
});

/**
 * PUT /api/admin/payment-gateways/:id
 * Updates gateway configuration, encrypted credentials, surcharge, and active methods.
 * Never logs raw secrets into audit trail.
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: PaymentGatewayId };
    const {
      name,
      description,
      is_enabled,
      is_sandbox,
      surcharge_percentage,
      surcharge_fixed,
      supported_methods,
      credentials,
    } = req.body;

    const user = (req as any).user as AuthUser;
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';

    const updated = await gatewayRegistry.updateGateway(
      id,
      {
        name,
        description,
        is_enabled,
        is_sandbox,
        surcharge_percentage,
        surcharge_fixed,
        supported_methods,
        credentials,
      },
      { id: user.id, email: user.email },
      clientIp
    );

    if (!updated) {
      return res.status(404).json({ error: `Gateway '${id}' not found` });
    }

    const all = await gatewayRegistry.getAllGateways();
    const current = all.find((g) => g.id === id);

    return res.json({
      success: true,
      message: `Payment gateway '${id}' updated successfully.`,
      gateway: current,
    });
  } catch (err: any) {
    console.error(`[AdminPaymentGateway] Error updating gateway ${req.params.id}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to update payment gateway' });
  }
});

/**
 * POST /api/admin/payment-gateways/:id/toggle
 * Toggles a gateway between active/inactive.
 * Emits a warning if gateway is enabled without a successful test connection.
 */
router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: PaymentGatewayId };
    const { is_enabled } = req.body;
    const user = (req as any).user as AuthUser;
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';

    const result = await gatewayRegistry.toggleGateway(
      id,
      Boolean(is_enabled),
      { id: user.id, email: user.email },
      clientIp
    );

    if (!result.success) {
      return res.status(400).json({ error: result.warning || 'Failed to toggle gateway' });
    }

    return res.json({
      success: true,
      message: `Gateway status updated to ${is_enabled ? 'Enabled' : 'Disabled'}.`,
      warning: result.warning,
    });
  } catch (err: any) {
    console.error(`[AdminPaymentGateway] Error toggling gateway ${req.params.id}:`, err);
    return res.status(500).json({ error: 'Failed to update gateway status' });
  }
});

/**
 * POST /api/admin/payment-gateways/:id/test-connection
 * Tests API connection live against the provider's server.
 */
router.post('/:id/test-connection', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: PaymentGatewayId };
    const { credentials, is_sandbox } = req.body;
    const user = (req as any).user as AuthUser;
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';

    const result = await gatewayRegistry.testConnection(
      id,
      credentials,
      is_sandbox !== undefined ? Boolean(is_sandbox) : undefined,
      { id: user.id, email: user.email },
      clientIp
    );

    return res.json({
      success: result.success,
      message: result.message,
      details: result.details,
    });
  } catch (err: any) {
    console.error(`[AdminPaymentGateway] Error testing gateway ${req.params.id}:`, err);
    return res.status(500).json({
      success: false,
      message: `Test connection exception: ${err.message}`,
    });
  }
});

/**
 * GET /api/admin/payment-gateways/:id/audit-logs
 * Retrieves audit history specifically for this gateway.
 */
router.get('/:id/audit-logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = Number(req.query.limit) || 30;
    const logs = await gatewayRegistry.getAuditLogs(id, limit);
    return res.json({ success: true, logs });
  } catch (err: any) {
    console.error(`[AdminPaymentGateway] Error fetching audit logs for ${req.params.id}:`, err);
    return res.status(500).json({ error: 'Failed to fetch gateway audit logs' });
  }
});

export default router;
