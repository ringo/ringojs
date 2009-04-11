
export('applyResponse');

/**
 * Apply the return value of a Jack application to a servlet response.
 * This is used internally by the org.helma.jack.JackServlet class, so
 * you won't need this unless you're implementing your own servlet
 * based jack connector.
 *
 * @param response an instanceof javax.servlet.http.HttpServletResponse
 * @param result the object returned by a jack application
 */
function applyResponse(response, result) {
	var [status, headers, body] = result;
	response.status = status;
	for (var name in headers) {
		response.setHeader(name, headers[name]);
	}
	var writer = response.writer;
	if (body && typeof body.forEach == "function") {
		body.forEach(function(chunk) {
			writer.write(String(chunk));
			writer.flush();
		})
	} else {
		writer.write(String(body));
		writer.flush();
	}
}
