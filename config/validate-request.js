import validationResult from 'express-validator';

function validateRequest(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.details = errors.array();
    throw error;
  }
}

export default validateRequest;