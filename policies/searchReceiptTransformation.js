var raw = context.getVariable("response.content");
raw = (raw === null || raw === undefined) ? "" : String(raw);
var trimmed = raw.trim();

var parsed = {};
if (trimmed.length > 0) {
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    parsed = {};
  }
}

var jsonResponse;

if (parsed && typeof parsed.Message === "string") {
  // Legacy "no data found" shape -> normalize to common structure
  jsonResponse = {
    Customers: [],
    Log: {
      Items: [
        {
          Note: parsed.Message.trim(),
          SeverityCode: "E"
        }
      ]
    }
  };
} else if (parsed && Array.isArray(parsed.Customers)) {
  // Data found -> keep Customers as-is, ensure Log.Items is an empty array
  jsonResponse = parsed;
  jsonResponse.Log = { Items: [] };
} else {
  // Unrecognized shape -> pass through as-is
  jsonResponse = parsed;
}

context.setVariable("response.content", JSON.stringify(jsonResponse));