'use strict';
var bodyParser = require('body-parser');
var nodeDomain = require('express-domain-middleware');
var bodyValidator = require('./bodyValidator');

function handleCors(req, res, next) {
    var respond = false;

    if (req.headers.origin) {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        respond = true;
    }

    if (req.headers['access-control-request-method']) {
        res.header('Access-Control-Allow-Methods', req.headers['access-control-request-method']);
        respond = true;
    }

    if (req.headers['access-control-request-headers']) {
        res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
        respond = true;
    }

    if (respond && req.method.toUpperCase() === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
}

module.exports = function (options, imports) {
    return function (app) {
        app.use(nodeDomain);
        app.use(handleCors);
        app.use(bodyParser.urlencoded({
            extended: true
        }));
        app.use(bodyValidator.initialize(imports));
        app.use(bodyParser.json({
            limit: '50mb',
            reviver: imports.utilities.reviveDates
        }));
        app.use(bodyParser.text());
    };
};
