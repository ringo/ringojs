const onmessage = (event) => {
    const {method, payload} = event.data;
    switch (method) {
        case "postMessage":
            event.source.postMessage(payload);
            break;
        case "postError":
            event.source.postError(payload);
            break;
        case "timeoutError":
            setTimeout(() => {
                throw new Error("Error thrown in worker timeout");
            }, 10);
            break;
        case "throwError":
            throw new Error("Error thrown in worker");
    }
}
