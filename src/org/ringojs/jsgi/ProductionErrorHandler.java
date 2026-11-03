package org.ringojs.jsgi;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.eclipse.jetty.http.HttpStatus;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.handler.ErrorHandler;

import java.io.IOException;

/**
 * Error handler for the embedded Jetty server in production mode. Failures
 * outside of {@link JsgiServlet}, e.g. in websocket or eventsource callbacks,
 * end up here. Jetty's default handler renders the exception in all of its
 * response formats, even with stack traces turned off. This handler only
 * exposes the status code and its standard reason phrase.
 */
public class ProductionErrorHandler extends ErrorHandler {

    public ProductionErrorHandler() {
        setShowServlet(false);
    }

    @Override
    protected void generateAcceptableResponse(Request baseRequest,
                                              HttpServletRequest request,
                                              HttpServletResponse response,
                                              int code, String message)
            throws IOException {
        request.removeAttribute(RequestDispatcher.ERROR_EXCEPTION);
        super.generateAcceptableResponse(baseRequest, request, response, code,
                HttpStatus.getMessage(code));
    }
}
