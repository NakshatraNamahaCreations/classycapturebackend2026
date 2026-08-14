// Rewrites unhelpful failure responses on their way out.
//
// Most controllers reply with a generic "Failed to create X" and put the real
// reason in `error` (or a raw Mongoose string in `message`). The UI shows
// `message`, so the user saw a failure with no idea which field was wrong.
//
// This wraps res.json once, globally, so every existing controller gets a
// useful message without each one having to be rewritten.
const { describeRawMessage } = require("../utils/saveErrors");

module.exports = function explainSaveErrors(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    try {
      if (body && typeof body === "object" && body.success === false) {
        // the real reason may be in either field depending on the controller
        const candidates = [body.error, body.message].filter(
          (v) => typeof v === "string" && v
        );

        for (const raw of candidates) {
          const described = describeRawMessage(raw);
          if (described) {
            body.message = described.message;
            if (described.fields.length) body.fields = described.fields;

            // a bad payload is the client's fault, not a server crash
            if (res.statusCode === 500) res.status(400);
            break;
          }
        }
      }
    } catch {
      // never let error formatting break the response itself
    }

    return originalJson(body);
  };

  next();
};
