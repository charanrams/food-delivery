import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import { UPLOAD_FOLDERS, signUpload, uploadLimits } from './uploads.service';

export const uploadsRouter = Router();
uploadsRouter.use(authenticate, requireRole('ADMIN'));

uploadsRouter.post('/sign', validate({ body: z.object({ folder: z.enum(UPLOAD_FOLDERS) }) }), (req, res) => {
  ok(res, { ...signUpload(req.body.folder), ...uploadLimits });
});
