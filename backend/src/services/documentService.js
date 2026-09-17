import { documentRepository } from '../repositories/documentRepository.js';
import { documentAccessRepository } from '../repositories/documentAccessRepository.js';
import { AppError } from '../lib/errors.js';
import path from 'path';
import fs from 'fs';

/**
 * Document service — business logic for the Document Tracking &
 * Management System (DTMS). Handles the upload + metadata flow, the
 * tracking workflow transitions, and tenant isolation.
 */
export const documentService = {
  /**
   * Create a document with an optional uploaded file.
   * The file is stored under uploads/documents/ and the url field stores
   * the relative path for retrieval.
   */
  async createDocument(req, body, file) {
    let fileUrl = null;
    let fileSize = null;
    let mimeType = null;

    if (file) {
      fileUrl = `uploads/documents/${file.filename}`;
      fileSize = file.size;
      mimeType = file.mimetype;
    }

    try {
      const created = await documentRepository.create(req, {
        ...body,
        status: 'DRAFT',
        creatorId: req.user.id,
        url: fileUrl,
        fileSize,
        mimeType,
      });
      return created;
    } catch (e) {
      if (file?.filename) {
        const filePath = path.resolve(process.cwd(), `uploads/documents/${file.filename}`);
        fs.unlink(filePath, () => {});
      }
      throw e;
    }
  },

  async updateDocument(req, id, body, file) {
    const payload = { ...body };
    let newFile = null;
    if (file) {
      newFile = file;
      payload.url = `uploads/documents/${file.filename}`;
      payload.fileSize = file.size;
      payload.mimeType = file.mimetype;
    }

    try {
      return await documentRepository.update(req, id, payload);
    } catch (e) {
      if (newFile?.filename) {
        const filePath = path.resolve(process.cwd(), `uploads/documents/${newFile.filename}`);
        fs.unlink(filePath, () => {});
      }
      throw e;
    }
  },

  async listDocuments(req, opts) {
    return documentRepository.findMany(req, opts);
  },

  async getDocument(req, id) {
    return documentRepository.findById(req, id);
  },

  async deleteDocument(req, id) {
    // Archive instead of hard delete so the audit trail is intact.
    return documentRepository.remove(req, id);
  },

  /**
   * Workflow transition: DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED → ARCHIVED.
   * Each transition is validated against the workflow map in the repository.
   */
  async advanceStatus(req, id, status) {
    return documentRepository.setStatus(req, id, status);
  },

  async getStats(req) {
    return documentRepository.countByStatus(req);
  },

  /**
   * Resolve a document's URL against the uploads directory for download.
   * Enforces tenant isolation and returns a safe stream response.
   * When publicOnly is set, only PUBLISHED documents are exposed.
   */
  async resolveFilePath(req, id, opts = {}) {
    const doc = await documentRepository.findById(req, id);
    if (!doc || !doc.url) {
      throw new AppError('Document or file not found', 404, 'NOT_FOUND');
    }
    if (opts.publicOnly && doc.status !== 'PUBLISHED') {
      throw new AppError('Document or file not found', 404, 'NOT_FOUND');
    }
    const relative = doc.url.replace(/^[/\\]+/, '');
    const filePath = path.resolve(process.cwd(), relative);
    const uploadsDir = path.resolve(process.cwd(), 'uploads/documents');
    if (!filePath.startsWith(uploadsDir + path.sep) && filePath !== uploadsDir) {
      throw new AppError('Invalid file path', 404, 'NOT_FOUND');
    }
    if (!fs.existsSync(filePath)) {
      throw new AppError('File missing on disk', 404, 'FILE_MISSING');
    }
    return { doc, filePath };
  },

  async logAccess(req, documentId, action) {
    try {
      await documentAccessRepository.log({
        tenantId: req.tenantId ?? null,
        documentId,
        userId: req.user?.id ?? null,
        action,
        ip: req.ip ?? null,
        userAgent: req.get?.('user-agent') ?? null,
      });
    } catch (e) {
      console.error('[documents] access log failed:', e?.message ?? e);
    }
  },

  async listAccess(req, opts) {
    const result = await documentAccessRepository.findMany(req, opts);
    const users = await documentAccessRepository.resolveUsers(result.items.map((i) => i.userId));
    return {
      ...result,
      items: result.items.map((i) => ({ ...i, actor: i.userId ? users[i.userId] ?? null : null })),
    };
  },

  async documentTimeline(req, id) {
    const doc = await documentRepository.findById(req, id);
    if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');
    const { access, workflow } = await documentAccessRepository.timeline(req, id);
    const users = await documentAccessRepository.resolveUsers([
      ...access.map((a) => a.userId),
      ...workflow.map((w) => w.userId),
    ]);
    const events = [
      ...access.map((a) => ({
        id: `a-${a.id}`,
        kind: 'ACCESS',
        action: a.action,
        actor: a.userId ? users[a.userId]?.username ?? null : 'Public',
        at: a.createdAt,
        ip: a.ip,
      })),
      ...workflow.map((w) => ({
        id: `w-${w.id}`,
        kind: 'WORKFLOW',
        action: w.action,
        actor: users[w.userId]?.username ?? null,
        at: w.timestamp,
        ip: w.ip,
      })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at));
    return { document: { id: doc.id, title: doc.title, status: doc.status }, events };
  },

  async exportAccess(req, opts) {
    const rows = await documentAccessRepository.findForExport(req, opts);
    const users = await documentAccessRepository.resolveUsers(rows.map((r) => r.userId));
    return rows.map((r) => ({
      createdAt: r.createdAt.toISOString(),
      action: r.action,
      documentId: r.documentId,
      documentTitle: r.document?.title ?? '',
      actor: r.userId ? users[r.userId]?.username ?? r.userId : 'Public',
      ip: r.ip ?? '',
    }));
  },
};
