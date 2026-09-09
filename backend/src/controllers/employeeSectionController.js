import {
  employeeSectionService,
  ALL_SECTIONS,
} from '../services/employeeSectionService.js';
import { AppError } from '../lib/errors.js';

function guard(section) {
  if (!ALL_SECTIONS[section]) throw new AppError('Unknown employee section', 404, 'NOT_FOUND');
}

export async function listSectionHandler(req, res, next) {
  try {
    guard(req.params.section);
    const items = await employeeSectionService.list(req.params.section, req.params.id);
    res.json(items);
  } catch (e) {
    next(e);
  }
}

export async function createSectionHandler(req, res, next) {
  try {
    guard(req.params.section);
    const item = await employeeSectionService.create(req.params.section, req.params.id, req.body);
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
}

export async function updateSectionHandler(req, res, next) {
  try {
    guard(req.params.section);
    const item = await employeeSectionService.update(
      req.params.section, req.params.id, req.params.recordId, req.body
    );
    res.json(item);
  } catch (e) {
    next(e);
  }
}

export async function deleteSectionHandler(req, res, next) {
  try {
    guard(req.params.section);
    await employeeSectionService.remove(req.params.section, req.params.id, req.params.recordId);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
