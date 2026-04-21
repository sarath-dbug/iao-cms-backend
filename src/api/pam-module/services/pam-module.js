'use strict';

/**
 * pam-module service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::pam-module.pam-module');
