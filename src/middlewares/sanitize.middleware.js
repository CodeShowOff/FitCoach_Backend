import mongoSanitize from "express-mongo-sanitize";
import sanitizeHtml from "sanitize-html";

// Strip HTML tags/attributes while allowing plain text payloads.
const sanitizeHtmlConfig = {
  allowedTags: [],
  allowedAttributes: {},
};

const mongoSanitizeOptions = {
  replaceWith: "_",
};

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const sanitizeStructured = (value) => {
  if (typeof value === "string") {
    return sanitizeHtml(value, sanitizeHtmlConfig);
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      value[index] = sanitizeStructured(value[index]);
    }
    return value;
  }

  if (value && isPlainObject(value)) {
    if (typeof mongoSanitize.sanitize === "function") {
      mongoSanitize.sanitize(value, mongoSanitizeOptions);
    }

    for (const key of Object.keys(value)) {
      value[key] = sanitizeStructured(value[key]);
    }
  }

  return value;
};

const sanitizeContainer = (value, assign) => {
  if (value == null) {
    return;
  }

  if (typeof value === "string") {
    assign(sanitizeStructured(value));
    return;
  }

  sanitizeStructured(value);
};

export const sanitizePayload = (req, _res, next) => {
  sanitizeContainer(req.body, (sanitized) => {
    req.body = sanitized;
  });
  sanitizeContainer(req.query, () => {
    /* req.query is read-only in Express 5, so mutate in place only */
  });
  sanitizeContainer(req.params, () => {
    /* params are mutated in place */
  });

  next();
};
