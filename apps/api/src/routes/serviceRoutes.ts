import { Router, Request, Response, NextFunction } from 'express';
import { getServices, seedServicesIfEmpty } from '../services/serviceCatalogService.js';
import { HealthcareService } from '../models/HealthcareService.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search } = req.query;
    
    // Ensure services exist on first fetch
    await seedServicesIfEmpty();

    const services = await getServices({
      category: category as string,
      search: search as string,
    });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:idOrCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idOrCode } = req.params;
    let service = null;

    if (idOrCode.match(/^[0-9a-fA-F]{24}$/)) {
      service = await HealthcareService.findById(idOrCode);
    }

    if (!service) {
      service = await HealthcareService.findOne({ serviceCode: idOrCode.toLowerCase() });
    }

    if (!service) {
      throw new AppError(`Healthcare service '${idOrCode}' not found`, 404);
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
});

export const serviceRoutes = router;
