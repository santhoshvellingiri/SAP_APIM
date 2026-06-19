/**
 * Sample SAP APIM JavaScript Policy: Add custom response headers
 *
 * Flow: PostFlow / Response
 *
 * What it does:
 *  - Reads the backend response status and appends it as a custom header
 *  - Adds a static "X-Powered-By" header
 *  - Parses the response body (if JSON) and injects a top-level field
 */

// Add a static header
context.setVariable('response.header.X-Powered-By', 'SAP-APIM');

// Echo the backend status as a header
var statusCode = context.targetResponse.status + '';          // e.g. "200"
var statusMsg  = context.targetResponse.status.message + ''; // e.g. "OK"
context.setVariable('response.header.X-Backend-Status', statusCode + ' ' + statusMsg);

// Enrich the response body if it is valid JSON
var rawBody = context.getVariable('response.content');
if (rawBody) {
  try {
    var body = JSON.parse(rawBody);
    body._source = 'apim-enriched';
    context.setVariable('response.content', JSON.stringify(body));
  } catch (e) {
    // Not JSON — leave body untouched
    print('response body is not JSON: ' + e.message);
  }
}
