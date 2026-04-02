const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createVehicle,
  getVehicles,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehiclesController');

router.use(authenticateToken);

router.post('/', createVehicle);
router.get('/', getVehicles);
router.put('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

module.exports = router;
