'use strict';
var responders, Terror, logger;

function errorHandler(err, req, res, next) { //request handler with 4 params is an error handler
    var terror = new Terror(err);
    responders.respondError(res, terror);
    if (err.domain) {
        //you should think about gracefully stopping & respawning your server
        //since an unhandled error might put your application into an unknown state
    }
}

function notFound(req, res, next) {
    responders.respondError(res, new Terror('Endpoint not found', Terror.codes.notFound));
}

module.exports = function (options, imports) {
    responders = imports.responders;
    Terror = imports.Terror;
    logger = imports.logger;
    return function (app) {
        app.use(errorHandler);
        app.use(notFound);
    };
};