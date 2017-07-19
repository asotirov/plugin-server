'use strict';
const _ = require('lodash');
const setupBeforeRequest = require('./setupBeforeRequest');
const setupAfterRequest = require('./setupAfterRequest');
const assert = require('assert');

//TODO: Make this BEAUTIFUL <3 :*

module.exports = function (options, imports, register) {
    const expressApp = imports.expressApp;

    register(null, {
        /**
         * Initialize an express server that will listen on the standard port.
         * @param options
         * @param options.logger enabled/disable logging options for .headers and .body
         * @param routeImports imports defining the routes that the server will register
         * @param done
         */
        server: function (options, routeImports, done) {
            const server = require('http').Server(expressApp);
            const ipAddress = options.host;
            const port = options.port;
            assert(ipAddress, 'server ipAddress option');
            assert(port, 'server port option');

            setupBeforeRequest(options, imports)(expressApp);
            setupExpressApp(options, imports, routeImports)(expressApp);
            setupAfterRequest(options, imports)(expressApp);
            function cb(err) {
                if (err) {
                    console.error('Server starting error!', err);
                    return done(err);
                }
                console.log('Server starting on ' + ipAddress + ':' + port + '.');
                done(null, server);
            }

            if (ipAddress === 'localhost' || ipAddress === '127.0.0.1') { //for local development call with 2 parameters because 'localhost' as ipAddress doesn't work.
                server.listen(port, cb);
            } else {
                server.listen(port, ipAddress, cb);
            }
        }
    });

    function setupExpressApp(options, imports, routeImports) {
        let loggerOptions;

        function reloadLoggerOptions(opts) {
            //reload logger options either from argument or process env variables
            loggerOptions = _.defaults(opts || {
                    body: process.env.LOGGER_BODY,
                    headers: process.env.LOGGER_HEADERS,
                    user: process.env.LOGGER_USER,
                    result: process.env.LOGGER_RESULT,
                    disabled: process.env.LOGGER_DISABLED
                }, options.logger);
        }

        reloadLoggerOptions();
        return function (app) {
            app.get('/status', function (req, res) {
                delete res.loggerArgs;//do not log /status requests
                imports.responders.respondResult(res, {
                    version: global.app.version,
                    uiVersion: global.app.uiVersion
                });
            });
            // default route have to be status 200
            // for HA Proxy
            app.get('/', function (req, res) {
                res.status(200).send('OK');
            });

            // For HAProxy to check if the nodejs server
            // is up and running a.k.a health checks
            app.get('/health', function (req, res) {
                res.send('1');
            });

            setupRoutes('Api/before', routeImports, app, imports.apiVersions);

            const passport = require('passport');
            setupRoutes('Passport', routeImports, passport);
            app.use(passport.initialize());

            app.use(function logRequest(req, res, next) {
                if (req.url.length > 1 && loggerOptions && !loggerOptions.disabled) { //skip log for status check
                    const loggerArgs = [req.method + ': ' + req.url];
                    if (loggerOptions.headers) {
                        loggerArgs.push(req.headers);
                    }
                    if (loggerOptions.body && req.body) {
                        const bodyLogCopy = _.extend({}, req.body);
                        if (bodyLogCopy.password) {
                            bodyLogCopy.password = '******';
                        }
                        loggerArgs.push(bodyLogCopy);
                    }
                    res.loggerArgs = loggerArgs;
                    res.loggerOptions = loggerOptions;
                }

                next();
            });
            app.post('/loggeroptions', imports.responders.ensureAuthenticated('admin'), function (req, res) {
                reloadLoggerOptions(req.body);
                res.status(200).send('reloaded on ' + process.pid + ' ' + JSON.stringify(loggerOptions, null, 4));
            });
            setupRoutes('Api', routeImports, app, imports.apiVersions);
            setupRoutes('Api/after', routeImports, app, imports.apiVersions);
        };
    }

    function setupRoutes(suffix, routeImports, arg, apiVersions) {
        let count = 0;
        _.each(routeImports, function (routeConstructor, importName) {
            if (_.endsWith(importName, suffix)) {
                routeConstructor.call(null, arg, imports.responders, apiVersions); //TODO: refactor this to be as part of imports during build time
                console.log('+ ' + importName + ' route +');
                count++;
            }
        });
        console.log('= ' + (count ? count : 'No') + ' ' + suffix + ' routes =');
    }
};
