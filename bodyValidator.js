//globals
'use strict';
var expressValidator = require('express-validator');

module.exports = {
    initialize: function (imports) {
        var responders = imports.responders;
        return function (req, res, next) {
            /**
             * Required body parameters. Returns true if there were errors and we have responded.
             * @param properties
             * @param next
             * @param [strict=true] whether to next with an error directly when it is required or just use as check
             * @returns {boolean}
             */
            req.required = function required(properties, next, strict) {
                strict = strict === undefined ? true : strict;
                if (typeof properties === 'string') {
                    properties = [properties];
                }
                properties.forEach(function (prop) {
                    req.checkBody(prop, '`' + prop + '` is required.').notEmpty();
                });

                var validationErrors = req.validationErrors();
                if (validationErrors && validationErrors[0]) {
                    if (strict) {
                        if (next) {
                            next(new Error(validationErrors[0]));
                        } else {
                            responders.respondError(res, validationErrors[0]);
                        }
                    } else if (next) { //if not in strict mode, continue with next and return true
                        next();
                    }
                    return true;
                }
                return false;
            };

            /**
             *
             * @param properties
             * @param next
             * @param [strict=true]
             * @returns {boolean}
             */
            req.requiredOne = function requiredOne(properties, next, strict) {
                strict = strict === undefined ? true : strict;
                var hasOne;
                properties.forEach(function (prop) {
                    if (req.body.hasOwnProperty(prop)) {
                        hasOne = true;
                        return false;
                    }
                });
                var validationError = !hasOne ? 'Please provide one of these properties: [' + properties.join(', ') + ']' : null;
                if (validationError) {
                    if (strict) {
                        next(new Error(validationError));
                    } else if (next) {
                        next();
                    }
                    return true;
                }
                return false;
            };

            expressValidator({
                errorFormatter: function errorFormatter(param, msg, value) {
                    return new Error(msg);
                }
            })(req, res, next);
        };
    }
}
;