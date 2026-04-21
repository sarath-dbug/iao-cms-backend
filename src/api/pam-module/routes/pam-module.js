'use strict';

/**
 * pam-module router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::pam-module.pam-module');
