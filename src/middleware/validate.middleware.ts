export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(
    {
      body: req.body,
      params: req.params,
      query: req.query
    },
    { abortEarly: false, stripUnknown: true }
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      details: error.details.map((detail) => detail.message)
    });
  }

  req.body = value.body;
  req.params = value.params;
  // Express 5: `req.query` is read-only; expose Joi-normalized query here instead.
  req.validatedQuery = value.query;
  return next();
};

