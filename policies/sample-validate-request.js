/**
 * Sample SAP APIM JavaScript Policy: Validate incoming request
 *
 * Flow: PreFlow / Request
 *
 * What it does:
 *  - Checks that a required "X-Correlation-Id" header is present
 *  - Validates that a "startDate" query parameter matches YYYY-MM-DD format
 *  - Sets a flow variable "validation.passed" that downstream policies can read
 */

var correlationId = context.getVariable('request.header.x-correlation-id');
var startDate     = context.getVariable('request.queryparam.startDate');

var errors = [];

if (!correlationId) {
  errors.push('Missing required header: X-Correlation-Id');
}

if (!startDate) {
  errors.push('Missing required query parameter: startDate');
} else if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
  errors.push('startDate must be in YYYY-MM-DD format, got: ' + startDate);
}

if (errors.length > 0) {
  context.setVariable('validation.passed', false);
  context.setVariable('validation.errors', errors.join('; '));
  // Raise a fault by setting a flag downstream policies (e.g. RaiseFault) can check
  context.setVariable('validation.fault', 'true');
} else {
  context.setVariable('validation.passed', true);
  context.setVariable('validation.errors', '');
  context.setVariable('validation.fault', 'false');
}
