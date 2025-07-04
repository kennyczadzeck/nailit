'use strict'
const { mockDeep } = require('jest-mock-extended')
module.exports = {
  PrismaClient: jest.fn(() => mockDeep()),
} 