export function ok(response, data, status = 200) {
  return response.status(status).json({ success: true, data });
}

export function fail(response, status, message, errors) {
  return response.status(status).json({ success: false, message, ...(errors && { errors }) });
}
