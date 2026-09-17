import path from 'path';
import fs from 'fs';
import { documentService } from '../services/documentService.js';
import { STATUS, WORKFLOW, TRANSITION_ROLES, AUDIT_FIELDS, LABEL } from '../shared/workflow.js';

function accessOpts(req) {
  return {
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 30,
    documentId: req.query.documentId,
    userId: req.query.userId,
    action: req.query.action,
    from: req.query.from,
    to: req.query.to,
  };
}

export const documentController = {
  async list(req, res, next) {
    try {
      const opts = {
        type: req.query.type,
        status: req.query.status,
        employeeId: req.query.employeeId,
        search: req.query.search,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 30,
      };
      const result = await documentService.listDocuments(req, opts);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },

  async get(req, res, next) {
    try {
      const doc = await documentService.getDocument(req, req.params.id);
      if (!doc) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
      }
      await documentService.logAccess(req, doc.id, 'VIEWED');
      res.json(doc);
    } catch (e) {
      next(e);
    }
  },

  async create(req, res, next) {
    try {
      const created = await documentService.createDocument(req, req.body, req.file);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  },

  async update(req, res, next) {
    try {
      const updated = await documentService.updateDocument(req, req.params.id, req.body, req.file);
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },

  async remove(req, res, next) {
    try {
      await documentService.deleteDocument(req, req.params.id);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },

  async setStatus(req, res, next) {
    try {
      const doc = await documentService.advanceStatus(req, req.params.id, req.params.status);
      res.json(doc);
    } catch (e) {
      next(e);
    }
  },

  async download(req, res, next) {
    try {
      const { doc, filePath } = await documentService.resolveFilePath(req, req.params.id, {
        publicOnly: !!req.publicDownloadOnly,
      });
      const stats = fs.statSync(filePath);
      await documentService.logAccess(req, doc.id, 'DOWNLOADED');
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      next(e);
    }
  },

  async stats(req, res, next) {
    try {
      const counts = await documentService.getStats(req);
      res.json(counts);
    } catch (e) {
      next(e);
    }
  },

  async trackingFeed(req, res, next) {
    try {
      const result = await documentService.listAccess(req, accessOpts(req));
      res.json(result);
    } catch (e) {
      next(e);
    }
  },

  async documentTracking(req, res, next) {
    try {
      const result = await documentService.documentTimeline(req, req.params.id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },

  async trackingExport(req, res, next) {
    try {
      const rows = await documentService.exportAccess(req, accessOpts(req));
      const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const header = ['createdAt', 'action', 'documentId', 'documentTitle', 'actor', 'ip'].join(',');
      const body = rows.map((r) =>
        [r.createdAt, r.action, r.documentId, r.documentTitle, r.actor, r.ip].map(escape).join(',')
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="document-access-tracking.csv"');
      res.send([header, ...body].join('\n'));
    } catch (e) {
      next(e);
    }
  },

  async workflow(req, res, next) {
    try {
      const map = Object.fromEntries(
        Object.keys(STATUS).map((key) => [
          key,
          {
            next: WORKFLOW[STATUS[key]] || [],
            requiredRoles: TRANSITION_ROLES[STATUS[key]] || null,
            label: LABEL[STATUS[key]],
          },
        ])
      );
      res.json(map);
    } catch (e) {
      next(e);
    }
  },
};
