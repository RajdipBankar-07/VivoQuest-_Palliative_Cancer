import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { authenticateUser, requireRole } from '../middleware/auth.js';
import { ProductOrder } from '../models/ProductOrder.js';
import { logAdminAction } from '../services/adminService.js';
import {
  getOwnedProductsFinance,
  getMarketplaceFinance,
  getSubscriptionsFinance,
  getCombinedFinanceSummary,
  FinanceDateFilter,
} from '../services/financeService.js';
import {
  generateFinancePdf,
  generateFinanceExcel,
  generateFinanceCsv,
  FinanceExportSection,
} from '../services/financeExportService.js';

export const financeRouter = express.Router();

// Helper to extract query filters
const extractFinanceFilters = (req: Request): FinanceDateFilter => {
  return {
    preset: (req.query.preset as any) || 'all',
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    search: req.query.search as string,
    status: req.query.status as string,
    supplierId: req.query.supplierId as string,
    planType: req.query.planType as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };
};

/**
 * GET /api/v1/admin/finances/summary
 * Consolidated executive summary & net profit reconciliation ledger
 */
financeRouter.get(
  '/summary',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: Request, res: Response) => {
    try {
      const filters = extractFinanceFilters(req);
      const summary = await getCombinedFinanceSummary(filters);
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'FINANCE_SUMMARY_ERROR', message: err.message || 'Failed to compute financial summary' },
      });
    }
  }
);

/**
 * GET /api/v1/admin/finances/owned-products
 * Domain A: VivoQuest-Owned Equipment sales, orders, units, taxes, discounts, refunds & contribution margin
 */
financeRouter.get(
  '/owned-products',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: Request, res: Response) => {
    try {
      const filters = extractFinanceFilters(req);
      const result = await getOwnedProductsFinance(filters);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'OWNED_PRODUCTS_FINANCE_ERROR', message: err.message || 'Failed to fetch owned products finance' },
      });
    }
  }
);

/**
 * GET /api/v1/admin/finances/marketplace
 * Domain B: Third-Party Marketplace, supplier payables, settlement tracking, commissions
 */
financeRouter.get(
  '/marketplace',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: Request, res: Response) => {
    try {
      const filters = extractFinanceFilters(req);
      const result = await getMarketplaceFinance(filters);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'MARKETPLACE_FINANCE_ERROR', message: err.message || 'Failed to fetch marketplace finance' },
      });
    }
  }
);

/**
 * GET /api/v1/admin/finances/subscriptions
 * Domain C: Caregiver Subscriptions, visit packages, MRR, daily collections, caregiver liabilities
 */
financeRouter.get(
  '/subscriptions',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: Request, res: Response) => {
    try {
      const filters = extractFinanceFilters(req);
      const result = await getSubscriptionsFinance(filters);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'SUBSCRIPTIONS_FINANCE_ERROR', message: err.message || 'Failed to fetch subscriptions finance' },
      });
    }
  }
);

/**
 * GET /api/v1/admin/finances/export/pdf
 * Generates and streams professional A4 PDF reports
 */
financeRouter.get(
  '/export/pdf',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: Request, res: Response) => {
    try {
      const section = ((req.query.section as string) || 'combined') as FinanceExportSection;
      const filters = extractFinanceFilters(req);
      const pdfBuffer = await generateFinancePdf(section, filters);

      const filename = `VivoQuest_Finance_${section.toUpperCase()}_${new Date().toISOString().split('T')[0]}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.status(200).send(pdfBuffer);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'PDF_EXPORT_ERROR', message: err.message || 'Failed to generate PDF report' },
      });
    }
  }
);

/**
 * GET /api/v1/admin/finances/export/excel
 * Generates and streams structured Excel (.xlsx) workbooks
 */
financeRouter.get(
  '/export/excel',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: Request, res: Response) => {
    try {
      const section = ((req.query.section as string) || 'combined') as FinanceExportSection;
      const filters = extractFinanceFilters(req);
      const excelBuffer = await generateFinanceExcel(section, filters);

      const filename = `VivoQuest_Finance_${section.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      res.status(200).send(excelBuffer);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'EXCEL_EXPORT_ERROR', message: err.message || 'Failed to generate Excel report' },
      });
    }
  }
);

/**
 * GET /api/v1/admin/finances/export/csv
 * Generates and streams sanitized CSV reports (with formula-injection protection)
 */
financeRouter.get(
  '/export/csv',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: Request, res: Response) => {
    try {
      const section = ((req.query.section as string) || 'combined') as FinanceExportSection;
      const filters = extractFinanceFilters(req);
      const csvString = await generateFinanceCsv(section, filters);

      const filename = `VivoQuest_Finance_${section.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvString);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CSV_EXPORT_ERROR', message: err.message || 'Failed to generate CSV report' },
      });
    }
  }
);

/**
 * DELETE /api/v1/admin/finances/transactions/:id
 * Delete or archive financial order record.
 * Settled orders (paid, completed, delivered, or invoiced) are protected from permanent
 * deletion to preserve regulatory accounting audit integrity, and are archived instead.
 */
financeRouter.delete(
  '/transactions/:id',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id;
      let query: any = { _id: orderId };
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        query = { orderNumber: orderId };
      }

      const order = await ProductOrder.findOne(query);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Financial transaction order not found' },
        });
      }

      const staffUser = (req as any).user;
      const isSettled =
        order.paymentStatus === 'paid' ||
        order.orderStatus === 'delivered' ||
        order.orderStatus === 'completed' ||
        Boolean(order.invoiceNumber) ||
        ((order.pricing?.totalAmount || 0) > 0 && order.paymentStatus !== 'pending');

      // Settled payments, invoices, refunds, supplier settlements must NEVER be permanently deleted!
      if (isSettled) {
        order.isArchived = true;
        order.archivedAt = new Date();
        order.archivedBy = staffUser?.fullName || 'Administrator';
        await order.save();

        await logAdminAction({
          action: 'FINANCIAL_TRANSACTION_ARCHIVED',
          category: 'order_fulfillment',
          actorId: staffUser?._id?.toString(),
          actorName: staffUser?.fullName || 'Administrator',
          actorRole: staffUser?.role || 'admin',
          targetType: 'PRODUCT_ORDER',
          targetId: order.orderNumber,
          details: {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            totalAmount: order.pricing?.totalAmount,
            paymentStatus: order.paymentStatus,
            reason: 'Settled transaction archived and hidden from default operational view to preserve accounting audit compliance.',
          },
          severity: 'warning',
        });

        return res.status(200).json({
          success: true,
          action: 'archived',
          message: `Order #${order.orderNumber} contains settled financial transactions. Permanent deletion is prohibited by accounting audit standards; the record has been archived and hidden from default view.`,
          data: {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            status: order.orderStatus,
            isArchived: true,
          },
        });
      }

      // If unsettled test/draft order with zero settlement: safe to permanently delete
      await ProductOrder.deleteOne({ _id: order._id });

      await logAdminAction({
        action: 'TEST_TRANSACTION_PERMANENTLY_DELETED',
        category: 'order_fulfillment',
        actorId: staffUser?._id?.toString(),
        actorName: staffUser?.fullName || 'Administrator',
        actorRole: staffUser?.role || 'admin',
        targetType: 'PRODUCT_ORDER',
        targetId: order.orderNumber,
        details: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          reason: 'Unsettled order permanently removed by administrator.',
        },
        severity: 'info',
      });

      return res.status(200).json({
        success: true,
        action: 'permanently_deleted',
        message: `Unsettled order #${order.orderNumber} has been permanently deleted.`,
        data: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          status: 'deleted',
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'TRANSACTION_DELETE_ERROR', message: err.message || 'Failed to process transaction deletion' },
      });
    }
  }
);

